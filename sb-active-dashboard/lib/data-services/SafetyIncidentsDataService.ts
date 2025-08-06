/**
 * Safety Incidents Data Service
 * Centralized service for fetching and processing ArcGIS Safety Incidents data
 * Handles three-table structure: Incidents, Parties, and IncidentHeatmapWeights
 */

import Extent from "@arcgis/core/geometry/Extent";
import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import {
    EnrichedSafetyIncident,
    IncidentHeatmapWeight,
    IncidentParty,
    SafetyAnalysisResult,
    SafetyDataQueryResult,
    SafetyFilters,
    SafetyIncident,
    SafetySummaryData
} from "../safety-app/types";

export class SafetyIncidentsDataService {
  private static readonly BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer";
  private static readonly INCIDENTS_URL = `${this.BASE_URL}/0`;
  private static readonly PARTIES_URL = `${this.BASE_URL}/1`;
  private static readonly WEIGHTS_URL = `${this.BASE_URL}/2`;

  private static incidentsLayer: FeatureLayer | null = null;
  private static partiesLayer: FeatureLayer | null = null;
  private static weightsLayer: FeatureLayer | null = null;

  // Cache for weights data (since it's large and relatively static)
  private static weightsCache: IncidentHeatmapWeight[] | null = null;
  private static weightsCacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  /**
   * Initialize the feature layers
   */
  static initializeLayers(): {
    incidentsLayer: FeatureLayer;
    partiesLayer: FeatureLayer;
    weightsLayer: FeatureLayer;
  } {
    if (!this.incidentsLayer || this.incidentsLayer.destroyed) {
      this.incidentsLayer = new FeatureLayer({
        url: this.INCIDENTS_URL,
        title: "Safety Incidents",
        outFields: ["*"]
      });
    }

    if (!this.partiesLayer || this.partiesLayer.destroyed) {
      this.partiesLayer = new FeatureLayer({
        url: this.PARTIES_URL,
        title: "Incident Parties",
        outFields: ["*"]
      });
    }

    if (!this.weightsLayer || this.weightsLayer.destroyed) {
      this.weightsLayer = new FeatureLayer({
        url: this.WEIGHTS_URL,
        title: "Incident Heatmap Weights",
        outFields: ["*"]
      });
    }

    return {
      incidentsLayer: this.incidentsLayer,
      partiesLayer: this.partiesLayer,
      weightsLayer: this.weightsLayer
    };
  }

  /**
   * Query safety incidents data with spatial and attribute filters
   */
  static async querySafetyData(
    extent?: Extent | Polygon,
    filters?: Partial<SafetyFilters>
  ): Promise<SafetyDataQueryResult> {
    try {
      const { incidentsLayer, partiesLayer, weightsLayer } = this.initializeLayers();

      // Build where clause for incidents
      const whereClause = this.buildWhereClause(filters);
      
      // Query incidents
      const incidentsQuery = incidentsLayer.createQuery();
      incidentsQuery.where = whereClause;
      incidentsQuery.outFields = ["*"];
      incidentsQuery.returnGeometry = true;
      
      if (extent) {
        incidentsQuery.geometry = extent;
        incidentsQuery.spatialRelationship = "intersects";
      }

      const incidentsResult = await incidentsLayer.queryFeatures(incidentsQuery);
      const incidents = incidentsResult.features.map(feature => this.mapIncidentFeature(feature));
      
      if (incidents.length === 0) {
        return {
          incidents: [],
          parties: [],
          weights: [],
          isLoading: false,
          error: null
        };
      }

      // Get incident IDs for related data queries
      const incidentIds = incidents.map(inc => inc.id);

      // Query parties for these incidents
      const parties = await this.queryPartiesForIncidents(partiesLayer, incidentIds);

      // Query or get cached weights for these incidents
      const weights = await this.getWeightsForIncidents(weightsLayer, incidentIds);

      return {
        incidents,
        parties,
        weights,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying safety data:', error);
      return {
        incidents: [],
        parties: [],
        weights: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get enriched safety incidents with joined parties and weights data
   */
  static async getEnrichedSafetyData(
    extent?: Extent | Polygon,
    filters?: Partial<SafetyFilters>
  ): Promise<SafetyAnalysisResult> {
    try {
      const rawData = await this.querySafetyData(extent, filters);
      
      if (rawData.error) {
        return {
          data: [],
          summary: this.getEmptySummary(),
          isLoading: false,
          error: rawData.error
        };
      }

      // Join the data
      const enrichedIncidents = this.joinIncidentData(
        rawData.incidents,
        rawData.parties,
        rawData.weights
      );

      // Calculate summary statistics
      const summary = this.calculateSummaryStatistics(enrichedIncidents);

      return {
        data: enrichedIncidents,
        summary,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error getting enriched safety data:', error);
      return {
        data: [],
        summary: this.getEmptySummary(),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Build WHERE clause for incident queries based on filters
   */
  private static buildWhereClause(filters?: Partial<SafetyFilters>): string {
    const conditions: string[] = ["1=1"]; // Base condition

    if (filters?.dateRange) {
      const startDate = filters.dateRange.start.getTime();
      const endDate = filters.dateRange.end.getTime();
      conditions.push(`timestamp >= ${startDate} AND timestamp <= ${endDate}`);
    }

    if (filters?.dataSource && filters.dataSource.length > 0) {
      const sources = filters.dataSource.map(src => `'${src}'`).join(',');
      conditions.push(`data_source IN (${sources})`);
    }

    if (filters?.conflictType && filters.conflictType.length > 0) {
      const types = filters.conflictType.map(type => `'${type}'`).join(',');
      conditions.push(`conflict_type IN (${types})`);
    }

    if (filters?.roadUser) {
      const roadUserConditions: string[] = [];
      
      if (filters.roadUser.includes('pedestrian')) {
        roadUserConditions.push('pedestrian_involved = 1');
      }
      if (filters.roadUser.includes('bicyclist')) {
        roadUserConditions.push('bicyclist_involved = 1');
      }
      
      if (roadUserConditions.length > 0) {
        conditions.push(`(${roadUserConditions.join(' OR ')})`);
      }
    }

    return conditions.join(' AND ');
  }

  /**
   * Query parties data for specific incident IDs
   */
  private static async queryPartiesForIncidents(
    partiesLayer: FeatureLayer,
    incidentIds: number[]
  ): Promise<IncidentParty[]> {
    if (incidentIds.length === 0) return [];

    const parties: IncidentParty[] = [];
    
    // Handle large incident ID lists by chunking
    const chunkSize = 100;
    for (let i = 0; i < incidentIds.length; i += chunkSize) {
      const chunk = incidentIds.slice(i, i + chunkSize);
      const idsList = chunk.join(',');
      
      const partiesQuery = partiesLayer.createQuery();
      partiesQuery.where = `incident_id IN (${idsList})`;
      partiesQuery.outFields = ["*"];
      partiesQuery.returnGeometry = false;

      const partiesResult = await partiesLayer.queryFeatures(partiesQuery);
      
      partiesResult.features.forEach(feature => {
        parties.push(this.mapPartyFeature(feature));
      });
    }

    return parties;
  }

  /**
   * Get weights data for specific incident IDs (with caching)
   */
  private static async getWeightsForIncidents(
    weightsLayer: FeatureLayer,
    incidentIds: number[]
  ): Promise<IncidentHeatmapWeight[]> {
    // Check if we need to refresh the cache
    const now = Date.now();
    if (!this.weightsCache || (now - this.weightsCacheTimestamp) > this.CACHE_DURATION) {
      await this.refreshWeightsCache(weightsLayer);
    }

    // Filter cached weights for the requested incident IDs
    const incidentIdSet = new Set(incidentIds);
    const filteredWeights = this.weightsCache?.filter(weight => incidentIdSet.has(weight.incident_id)) || [];
    
    console.log('[DEBUG] Weights filtering:', {
      totalCachedWeights: this.weightsCache?.length || 0,
      requestedIncidentIds: incidentIds.length,
      matchingWeights: filteredWeights.length,
      sampleRequestedIds: incidentIds.slice(0, 5),
      sampleMatchingWeights: filteredWeights.slice(0, 5)
    });
    
    return filteredWeights;
  }

  /**
   * Refresh the weights cache with paginated queries
   */
  private static async refreshWeightsCache(weightsLayer: FeatureLayer): Promise<void> {
    console.log('Refreshing weights cache...');
    
    let weightResultLength = 10000;
    let weightArr: IncidentHeatmapWeight[] = [];
    let offsetId = 0;

    while (weightResultLength === 10000) {
      const queryWeights = weightsLayer.createQuery();
      queryWeights.where = offsetId > 0 ? `objectid > ${offsetId}` : "1=1";
      queryWeights.outFields = ["*"];
      queryWeights.orderByFields = ["objectid"];
      queryWeights.num = 10000;
      queryWeights.returnGeometry = false;

      const weightResults = await weightsLayer.queryFeatures(queryWeights);
      const weightFeatures = weightResults.features;

      weightFeatures.forEach((feature: any) => {
        weightArr.push(this.mapWeightFeature(feature));
        offsetId = feature.attributes.objectid || feature.attributes.OBJECTID;
      });

      weightResultLength = weightFeatures.length;
    }

    this.weightsCache = weightArr;
    this.weightsCacheTimestamp = Date.now();
    console.log(`Weights cache refreshed with ${weightArr.length} records`);
  }

  /**
   * Join incidents with their related parties and weights
   */
  private static joinIncidentData(
    incidents: SafetyIncident[],
    parties: IncidentParty[],
    weights: IncidentHeatmapWeight[]
  ): EnrichedSafetyIncident[] {
    // Create lookup maps for efficient joining
    const partiesByIncident = new Map<number, IncidentParty[]>();
    parties.forEach(party => {
      if (!partiesByIncident.has(party.incident_id)) {
        partiesByIncident.set(party.incident_id, []);
      }
      partiesByIncident.get(party.incident_id)!.push(party);
    });

    const weightsByIncident = new Map<number, IncidentHeatmapWeight[]>();
    weights.forEach(weight => {
      if (!weightsByIncident.has(weight.incident_id)) {
        weightsByIncident.set(weight.incident_id, []);
      }
      weightsByIncident.get(weight.incident_id)!.push(weight);
    });

    // Join data and compute derived fields
    return incidents.map(incident => {
      const incidentParties = partiesByIncident.get(incident.id) || [];
      const incidentWeights = weightsByIncident.get(incident.id) || [];

      // Calculate max severity from all parties
      const severityOrder = ['fatal', 'severe_injury', 'injury', 'property_damage_only', ''];
      const maxSeverity = incidentParties.reduce((max, party) => {
        const currentSeverityIndex = severityOrder.indexOf(party.injury_severity);
        const maxSeverityIndex = severityOrder.indexOf(max);
        return currentSeverityIndex < maxSeverityIndex ? party.injury_severity : max;
      }, '');

      // Calculate weighted exposure (sum of all weights for this incident)
      const weightedExposure = incidentWeights.reduce((sum, weight) => sum + weight.exposure, 0);

      // Debug logging for first few incidents
      if (incident.id <= 10) {
        console.log(`[DEBUG] Join for incident ${incident.id}:`, {
          incidentId: incident.id,
          partiesCount: incidentParties.length,
          weightsCount: incidentWeights.length,
          weightedExposure,
          sampleWeights: incidentWeights.slice(0, 2)
        });
      }

      return {
        ...incident,
        parties: incidentParties,
        weights: incidentWeights,
        maxSeverity,
        totalParties: incidentParties.length,
        hasWeight: incidentWeights.length > 0,
        weightedExposure: weightedExposure > 0 ? weightedExposure : undefined
      };
    });
  }

  /**
   * Calculate summary statistics from enriched incidents
   */
  private static calculateSummaryStatistics(incidents: EnrichedSafetyIncident[]): SafetySummaryData {
    const total = incidents.length;
    const bikeIncidents = incidents.filter(inc => inc.bicyclist_involved === 1).length;
    const pedIncidents = incidents.filter(inc => inc.pedestrian_involved === 1).length;
    
    const fatalIncidents = incidents.filter(inc => inc.maxSeverity === 'fatal').length;
    const injuryIncidents = incidents.filter(inc => 
      inc.maxSeverity === 'injury' || inc.maxSeverity === 'severe_injury'
    ).length;
    
    // Near misses are incidents without injury severity (from BikeMaps)
    const nearMissIncidents = incidents.filter(inc => 
      inc.data_source === 'BikeMaps' && !inc.maxSeverity
    ).length;

    // Data source breakdown
    const switrsCount = incidents.filter(inc => inc.data_source === 'SWITRS').length;
    const bikemapsCount = incidents.filter(inc => inc.data_source === 'BikeMaps').length;

    // Calculate date range for incidents per day
    const dates = incidents.map(inc => new Date(inc.timestamp));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const incidentsPerDay = daysDiff > 0 ? total / daysDiff : 0;

    // Calculate average severity score (weighted by exposure if available)
    const weightedIncidents = incidents.filter(inc => inc.hasWeight && inc.weightedExposure);
    const avgSeverityScore = weightedIncidents.length > 0 
      ? weightedIncidents.reduce((sum, inc) => sum + (inc.weightedExposure || 0), 0) / weightedIncidents.length
      : 0;

    return {
      totalIncidents: total,
      bikeIncidents,
      pedIncidents,
      fatalIncidents,
      injuryIncidents,
      nearMissIncidents,
      avgSeverityScore,
      incidentsPerDay,
      dataSourceBreakdown: {
        switrs: switrsCount,
        bikemaps: bikemapsCount
      }
    };
  }

  /**
   * Map ArcGIS feature to SafetyIncident interface
   */
  private static mapIncidentFeature(feature: any): SafetyIncident {
    return {
      OBJECTID: feature.attributes.objectid || feature.attributes.OBJECTID,
      id: feature.attributes.id,
      source_id: feature.attributes.source_id,
      timestamp: new Date(feature.attributes.timestamp),
      conflict_type: feature.attributes.conflict_type,
      pedestrian_involved: feature.attributes.pedestrian_involved,
      bicyclist_involved: feature.attributes.bicyclist_involved,
      vehicle_involved: feature.attributes.vehicle_involved,
      data_source: feature.attributes.data_source,
      strava_id: feature.attributes.strava_id,
      geometry: feature.geometry
    };
  }

  /**
   * Map ArcGIS feature to IncidentParty interface
   */
  private static mapPartyFeature(feature: any): IncidentParty {
    return {
      OBJECTID: feature.attributes.objectid || feature.attributes.OBJECTID,
      incident_id: feature.attributes.incident_id,
      party_number: feature.attributes.party_number,
      victim_number: feature.attributes.victim_number,
      party_type: feature.attributes.party_type,
      injury_severity: feature.attributes.injury_severity,
      bicycle_type: feature.attributes.bicycle_type,
      age: feature.attributes.age,
      gender: feature.attributes.gender
    };
  }

  /**
   * Map ArcGIS feature to IncidentHeatmapWeight interface
   */
  private static mapWeightFeature(feature: any): IncidentHeatmapWeight {
    return {
      OBJECTID: feature.attributes.objectid || feature.attributes.OBJECTID,
      model: feature.attributes.model,
      road_user: feature.attributes.road_user,
      exposure: feature.attributes.exposure,
      year: feature.attributes.year,
      incident_id: feature.attributes.incident_id
    };
  }

  /**
   * Get empty summary for error states
   */
  private static getEmptySummary(): SafetySummaryData {
    return {
      totalIncidents: 0,
      bikeIncidents: 0,
      pedIncidents: 0,
      fatalIncidents: 0,
      injuryIncidents: 0,
      nearMissIncidents: 0,
      avgSeverityScore: 0,
      incidentsPerDay: 0,
      dataSourceBreakdown: {
        switrs: 0,
        bikemaps: 0
      }
    };
  }

  /**
   * Clear the weights cache (useful for testing or manual refresh)
   */
  static clearWeightsCache(): void {
    this.weightsCache = null;
    this.weightsCacheTimestamp = 0;
  }
}