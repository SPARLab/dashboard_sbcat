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

  private static incidentsLayer: FeatureLayer | null = null;
  private static partiesLayer: FeatureLayer | null = null;

  /**
   * Initialize the feature layers
   */
  static initializeLayers(): {
    incidentsLayer: FeatureLayer;
    partiesLayer: FeatureLayer;
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

    return {
      incidentsLayer: this.incidentsLayer,
      partiesLayer: this.partiesLayer
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
      const { incidentsLayer, partiesLayer } = this.initializeLayers();

      // Build where clause for incidents
      const whereClause = this.buildWhereClause(filters);

      // Query with pagination to get ALL incidents
      const incidents: SafetyIncident[] = [];
      let hasMore = true;
      let offsetId = 0;
      const pageSize = 2000; // Match typical ArcGIS limit
      

      
      while (hasMore) {
        const paginatedQuery = incidentsLayer.createQuery();
        paginatedQuery.where = offsetId > 0 
          ? `(${whereClause}) AND objectid > ${offsetId}`
          : whereClause;
        paginatedQuery.outFields = ["*"];
        paginatedQuery.returnGeometry = true;
        paginatedQuery.orderByFields = ["objectid"];
        paginatedQuery.num = pageSize;
        
        if (extent) {
          paginatedQuery.geometry = extent;
          paginatedQuery.spatialRelationship = "intersects";
        }
        
        const pageResult = await incidentsLayer.queryFeatures(paginatedQuery);
        const pageFeatures = pageResult.features;
        
        if (pageFeatures.length === 0) {
          hasMore = false;
        } else {
          pageFeatures.forEach(feature => {
            incidents.push(this.mapIncidentFeature(feature));
            offsetId = Math.max(offsetId, feature.attributes.objectid || feature.attributes.OBJECTID || 0);
          });
          
          // If we got less than pageSize, we've reached the end
          if (pageFeatures.length < pageSize) {
            hasMore = false;
          }
        }
        
      }
      

      
      // Also get the total count to verify pagination worked
      const countQuery = incidentsLayer.createQuery();
      countQuery.where = whereClause;
      countQuery.returnCountOnly = true;
      if (extent) {
        countQuery.geometry = extent;
        countQuery.spatialRelationship = "intersects";
      }
      const totalCount = await incidentsLayer.queryFeatureCount(countQuery);
      
      if (totalCount > incidents.length) {
        console.warn(`[WARNING] Pagination may have missed some records! Got ${incidents.length} but total is ${totalCount}`);
      }
      
      // Debug: Check if there's any BikeMaps.org data at all
      if (filters?.dataSource?.includes('BikeMaps.org') && incidents.length === 0) {
        const testQuery = incidentsLayer.createQuery();
        testQuery.where = "data_source = 'BikeMaps.org'";
        testQuery.returnCountOnly = true;
        const countResult = await incidentsLayer.queryFeatureCount(testQuery);
      }
      
      if (incidents.length === 0) {
        return {
          incidents: [],
          parties: [],
          isLoading: false,
          error: null
        };
      }

      // Get incident IDs for related data queries
      const incidentIds = incidents.map(inc => inc.id);

      // Query parties for these incidents
      const parties = await this.queryPartiesForIncidents(partiesLayer, incidentIds);

      return {
        incidents,
        parties,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying safety data:', error);
      return {
        incidents: [],
        parties: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get enriched safety incidents with joined parties and weights data
   */
  static async getEnrichedSafetyData(
    extent?: Extent,
    filters?: Partial<SafetyFilters>,
    geometry?: Polygon,
  ): Promise<SafetyAnalysisResult> {
    try {
      const rawData = await this.querySafetyData(geometry || extent, filters);
      
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
        rawData.parties
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
      // Format dates for ArcGIS TIMESTAMP queries (YYYY-MM-DD HH:MI:SS)
      const startStr = filters.dateRange.start.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      const endStr = filters.dateRange.end.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      conditions.push(`timestamp >= TIMESTAMP '${startStr}' AND timestamp <= TIMESTAMP '${endStr}'`);
    }

    // Apply data source filter - if empty array, show nothing
    if (filters?.dataSource !== undefined) {
      if (filters.dataSource.length === 0) {
        // When no data sources are selected, return no results
        conditions.push('1=0'); // This will always be false, returning no results
      } else {
        const sources = filters.dataSource.map(src => `'${src}'`).join(',');
        conditions.push(`data_source IN (${sources})`);
      }
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
   * Join incidents with their related parties
   */
  static joinIncidentData(
    incidents: SafetyIncident[],
    parties: IncidentParty[]
  ): EnrichedSafetyIncident[] {
    // Create lookup maps for efficient joining
    const partiesByIncident = new Map<number, IncidentParty[]>();
    parties.forEach(party => {
      if (!partiesByIncident.has(party.incident_id)) {
        partiesByIncident.set(party.incident_id, []);
      }
      partiesByIncident.get(party.incident_id)!.push(party);
    });

    // Join data and compute derived fields
    return incidents.map(incident => {
      const incidentParties = partiesByIncident.get(incident.id) || [];

      // Calculate max severity from all parties or use incident severity
      const severityOrder = ['Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown', ''];
      let maxSeverity = incident.severity || '';
      
      if (incidentParties.length > 0) {
        maxSeverity = incidentParties.reduce((max, party) => {
          const currentSeverityIndex = severityOrder.indexOf(party.injury_severity);
          const maxSeverityIndex = severityOrder.indexOf(max);
          return currentSeverityIndex < maxSeverityIndex ? party.injury_severity : max;
        }, maxSeverity);
      }

      const hasTrafficData = !!(incident.bike_traffic || incident.ped_traffic);
      
      return {
        ...incident,
        parties: incidentParties,
        maxSeverity,
        totalParties: incidentParties.length,
        hasTrafficData: hasTrafficData,
        bikeTrafficLevel: incident.bike_traffic,
        pedTrafficLevel: incident.ped_traffic
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
    
    // Calculate severity statistics based on actual database values
    
    const fatalIncidents = incidents.filter(inc => inc.maxSeverity === 'Fatality').length;
    const injuryIncidents = incidents.filter(inc => 
      inc.maxSeverity === 'Injury' || inc.maxSeverity === 'Severe Injury'
    ).length;
    
    // Near misses are "No Injury" incidents from BikeMaps.org
    const nearMissIncidents = incidents.filter(inc => 
      inc.data_source === 'BikeMaps.org' && inc.maxSeverity === 'No Injury'
    ).length;

    // Data source breakdown
    const switrsCount = incidents.filter(inc => inc.data_source === 'SWITRS').length;
    const bikemapsCount = incidents.filter(inc => inc.data_source === 'BikeMaps.org').length;

    // Calculate date range for incidents per day
    const dates = incidents.map(inc => new Date(inc.timestamp));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const incidentsPerDay = daysDiff > 0 ? total / daysDiff : 0;

    // Calculate average severity score (using traffic data if available)
    const incidentsWithTrafficData = incidents.filter(inc => inc.hasTrafficData);
    const avgSeverityScore = incidentsWithTrafficData.length > 0 
      ? incidentsWithTrafficData.length / incidents.length
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
      severity: feature.attributes.severity,
      pedestrian_involved: feature.attributes.pedestrian_involved,
      bicyclist_involved: feature.attributes.bicyclist_involved,
      vehicle_involved: feature.attributes.vehicle_involved,
      loc_desc: feature.attributes.loc_desc,
      data_source: feature.attributes.data_source,
      strava_id: feature.attributes.strava_id,
      bike_traffic: feature.attributes.bike_traffic,
      ped_traffic: feature.attributes.ped_traffic,
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
}