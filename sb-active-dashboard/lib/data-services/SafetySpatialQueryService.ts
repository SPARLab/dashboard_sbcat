/**
 * SafetySpatialQueryService - Query safety features from the layer
 * 
 * This approach queries all features in the layer that match the spatial
 * and attribute filters, regardless of map extent or zoom level.
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import Polygon from "@arcgis/core/geometry/Polygon";
import { SafetyFilters, SafetySummaryData, EnrichedSafetyIncident } from "../safety-app/types";

export class SafetySpatialQueryService {
  
  /**
   * Query safety incidents within a polygon
   * Queries the entire layer, not just rendered features in the viewport
   */
  static async queryIncidentsWithinPolygon(
    mapView: MapView,
    incidentsLayer: FeatureLayer,
    polygon: Polygon,
    filters?: Partial<SafetyFilters>
  ): Promise<{
    incidents: EnrichedSafetyIncident[];
    summary: SafetySummaryData;
    error?: string;
  }> {
    try {
      // Build where clause for filters
      let whereClause = "1=1"; // Default to all records
      
      // Apply date range filter if provided
      if (filters?.dateRange) {
        const startStr = filters.dateRange.start.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
        const endStr = filters.dateRange.end.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
        whereClause += ` AND timestamp >= TIMESTAMP '${startStr}' AND timestamp <= TIMESTAMP '${endStr}'`;
      }
      
      // Apply data source filter if provided
      if (filters?.dataSource && filters.dataSource.length > 0 && filters.dataSource.length < 2) {
        const source = filters.dataSource[0];
        if (source === 'SWITRS') {
          whereClause += " AND (data_source = 'SWITRS' OR data_source = 'Police')";
        } else {
          whereClause += " AND (data_source = 'BikeMaps.org' OR data_source = 'BikeMaps')";
        }
      }
      
      // Apply severity filter if provided
      if (filters?.severityTypes && filters.severityTypes.length > 0 && filters.severityTypes.length < 5) {
        const severityConditions = filters.severityTypes.map(type => `maxSeverity = '${type}'`);
        whereClause += ` AND (${severityConditions.join(' OR ')})`;
      }
      
      // Apply conflict type filter if provided
      if (filters?.conflictType && filters.conflictType.length > 0) {
        const conflictConditions = filters.conflictType.map(type => `conflict_type = '${type}'`);
        whereClause += ` AND (${conflictConditions.join(' OR ')})`;
      }
      
      // Apply e-bike filter if provided
      if (filters?.ebikeMode === true) {
        whereClause += " AND hasEbike = 1";
      }

      // Query the LAYER directly (not the layerView) to get ALL features, not just rendered ones
      const query = incidentsLayer.createQuery();
      query.geometry = polygon;
      query.spatialRelationship = "intersects";
      query.returnGeometry = true;
      query.outFields = ["*"];
      query.where = whereClause;
      
      const queryResult = await incidentsLayer.queryFeatures(query);
      
      // Convert ArcGIS features to our incident format
      const incidents: EnrichedSafetyIncident[] = queryResult.features.map(feature => {
        const attrs = feature.attributes;
        return {
          // Map all the fields from the enriched layer
          objectid: attrs.objectid || attrs.OBJECTID,
          incident_id: attrs.incident_id,
          timestamp: attrs.timestamp,
          incident_date: attrs.incident_date,
          data_source: attrs.data_source,
          conflict_type: attrs.conflict_type,
          pedestrian_involved: attrs.pedestrian_involved,
          bicyclist_involved: attrs.bicyclist_involved,
          vehicle_involved: attrs.vehicle_involved,
          maxSeverity: attrs.maxSeverity || attrs.max_severity,
          severity: attrs.severity,
          latitude: attrs.latitude,
          longitude: attrs.longitude,
          loc_desc: attrs.loc_desc,
          strava_id: attrs.strava_id,
          bike_traffic: attrs.bike_traffic,
          ped_traffic: attrs.ped_traffic,
          parties: attrs.parties || [], // Default to empty array
          geometry: feature.geometry,
          // Required fields for EnrichedSafetyIncident
          OBJECTID: attrs.OBJECTID || attrs.objectid,
          id: attrs.id || attrs.incident_id,
          source_id: attrs.source_id || '',
          totalParties: attrs.parties?.length || 0,
          hasTrafficData: !!(attrs.bike_traffic || attrs.ped_traffic),
          bikeTrafficLevel: attrs.bike_traffic,
          pedTrafficLevel: attrs.ped_traffic
        } as EnrichedSafetyIncident;
      });

      // Calculate summary statistics
      const summary = this.calculateSummaryStatistics(incidents);
      
      return {
        incidents,
        summary
      };

    } catch (error) {
      console.error('SafetySpatialQueryService error:', error);
      
      return {
        incidents: [],
        summary: this.getEmptySummary(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate summary statistics from incidents array
   * Public method to allow recalculation after filtering
   */
  static calculateSummaryStatistics(incidents: EnrichedSafetyIncident[]): SafetySummaryData {
    const total = incidents.length;
    const bikeIncidents = incidents.filter(inc => inc.bicyclist_involved === 1).length;
    const pedIncidents = incidents.filter(inc => inc.pedestrian_involved === 1).length;
    
    // Calculate severity statistics based on actual database values
    const fatalIncidents = incidents.filter(inc => inc.maxSeverity === 'Fatality').length;
    const severeInjuryIncidents = incidents.filter(inc => inc.maxSeverity === 'Severe Injury').length;
    const injuryIncidents = incidents.filter(inc => inc.maxSeverity === 'Injury').length;
    
    // Separate "No Injury" (actual collisions) from "Near Miss" (crowd-sourced close calls)
    // No Injury: Actual collisions with no injury (typically from SWITRS)
    const noInjuryIncidents = incidents.filter(inc => 
      inc.data_source === 'SWITRS' && inc.maxSeverity === 'No Injury'
    ).length;
    
    // Near Miss: Crowd-sourced near misses from BikeMaps.org
    const nearMissIncidents = incidents.filter(inc => 
      inc.data_source === 'BikeMaps.org' && inc.maxSeverity === 'No Injury'
    ).length;
    
    const unknownIncidents = incidents.filter(inc => 
      inc.maxSeverity === 'Unknown' || inc.maxSeverity === '' || !inc.maxSeverity
    ).length;

    // Calculate average severity score (simple scoring system)
    const severityScores = incidents.map(inc => {
      switch (inc.maxSeverity) {
        case 'Fatality': return 4;
        case 'Severe Injury': return 3;
        case 'Injury': return 2;
        case 'No Injury': return 1;
        default: return 0;
      }
    });
    const avgSeverityScore = total > 0 ? severityScores.reduce((sum: number, score: number) => sum + score, 0) / total : 0;

    // Calculate incidents per day (assuming data spans multiple years)
    const incidentsPerDay = total > 0 ? total / 365 : 0; // Rough estimate

    // Calculate data source breakdown
    const switrsCount = incidents.filter(inc => inc.data_source === 'SWITRS').length;
    const bikemapsCount = incidents.filter(inc => inc.data_source === 'BikeMaps.org').length;

    return {
      totalIncidents: total,
      bikeIncidents,
      pedIncidents,
      fatalIncidents,
      severeInjuryIncidents,
      injuryIncidents,
      noInjuryIncidents,
      nearMissIncidents,
      unknownIncidents,
      avgSeverityScore,
      incidentsPerDay,
      dataSourceBreakdown: {
        switrs: switrsCount,
        bikemaps: bikemapsCount
      }
    };
  }

  /**
   * Get empty summary for error cases
   */
  private static getEmptySummary(): SafetySummaryData {
    return {
      totalIncidents: 0,
      bikeIncidents: 0,
      pedIncidents: 0,
      fatalIncidents: 0,
      severeInjuryIncidents: 0,
      injuryIncidents: 0,
      noInjuryIncidents: 0,
      nearMissIncidents: 0,
      unknownIncidents: 0,
      avgSeverityScore: 0,
      incidentsPerDay: 0,
      dataSourceBreakdown: {
        switrs: 0,
        bikemaps: 0
      }
    };
  }
}
