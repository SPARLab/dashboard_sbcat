/**
 * SafetySpatialQueryService - Query rendered safety features directly from the map layer
 * 
 * This approach is much more efficient than server queries because:
 * 1. It queries only the features already rendered on the map
 * 2. No network requests needed
 * 3. Respects current layer filters and visibility
 * 4. Works exactly like the Volume app's successful implementation
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import MapView from "@arcgis/core/views/MapView";
import Polygon from "@arcgis/core/geometry/Polygon";
import { SafetyFilters, SafetySummaryData, EnrichedSafetyIncident } from "../safety-app/types";

export class SafetySpatialQueryService {
  
  /**
   * Query safety incidents within a polygon using the rendered layer view
   * This is much faster and more reliable than server queries
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
      // Get the layer view (this contains only rendered features)
      const layerView = await mapView.whenLayerView(incidentsLayer) as FeatureLayerView;
      
      // Wait for layer view to finish updating if needed
      if (layerView.updating) {
        await layerView.when();
      }

      // Query features within the polygon using the layer view
      const queryResult = await layerView.queryFeatures({
        geometry: polygon,
        spatialRelationship: "intersects",
        returnGeometry: true,
        outFields: ["*"]
      });

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
          maxSeverity: attrs.maxSeverity || attrs.max_severity,
          severity: attrs.severity,
          latitude: attrs.latitude,
          longitude: attrs.longitude,
          loc_desc: attrs.loc_desc,
          strava_id: attrs.strava_id,
          bike_traffic: attrs.bike_traffic,
          ped_traffic: attrs.ped_traffic,
          parties: attrs.parties, // Assuming parties are attached in some way
          geometry: feature.geometry
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
   */
  private static calculateSummaryStatistics(incidents: EnrichedSafetyIncident[]): SafetySummaryData {
    const total = incidents.length;
    const bikeIncidents = incidents.filter(inc => inc.bicyclist_involved === 1).length;
    const pedIncidents = incidents.filter(inc => inc.pedestrian_involved === 1).length;
    
    // Calculate severity statistics based on actual database values
    // Note: 'No Injury' in database maps to 'Near Miss' in UI display
    const fatalIncidents = incidents.filter(inc => inc.maxSeverity === 'Fatality').length;
    const injuryIncidents = incidents.filter(inc => 
      inc.maxSeverity === 'Injury' || inc.maxSeverity === 'Severe Injury'
    ).length;
    const nearMissIncidents = incidents.filter(inc => inc.maxSeverity === 'No Injury').length;
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
    const avgSeverityScore = total > 0 ? severityScores.reduce((sum, score) => sum + score, 0) / total : 0;

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
      injuryIncidents,
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
      injuryIncidents: 0,
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
