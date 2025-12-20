/**
 * Safety incident processing utilities
 * Used by: SummaryStatistics, MostDangerousAreas charts
 */

import { AggregationUtilService } from "../shared/aggregation";
import { SpatialUtilService } from "../shared/spatial";

export class IncidentProcessingService {
  /**
   * Get safety summary statistics for current view
   * Used by: SafetyRightSidebar -> SummaryStatistics
   */
  static async getSafetySummaryStatistics(
    incidentsLayer: __esri.FeatureLayer,
    weightsLayer: __esri.FeatureLayer | null,
    mapView: __esri.MapView,
    filters: any
  ): Promise<{
    totalIncidents: number;
    bikeIncidents: number;
    pedIncidents: number;
    fatalIncidents: number;
    injuryIncidents: number;
    avgSeverityScore: number;
    incidentsPerDay: number;
  }> {
    // Get incidents in current extent
    const incidents = await SpatialUtilService.getIntersectingFeatures(
      incidentsLayer,
      mapView.extent,
      ["id", "incident_type", "severity", "timestamp"]
    );

    if (incidents.length === 0) {
      return {
        totalIncidents: 0,
        bikeIncidents: 0,
        pedIncidents: 0,
        fatalIncidents: 0,
        injuryIncidents: 0,
        avgSeverityScore: 0,
        incidentsPerDay: 0
      };
    }

    // Process incident data
    const bikeIncidents = incidents.filter(i => i.incident_type === 'bike').length;
    const pedIncidents = incidents.filter(i => i.incident_type === 'ped').length;
    const fatalIncidents = incidents.filter(i => i.severity === 'fatal').length;
    const injuryIncidents = incidents.filter(i => i.severity === 'injury').length;

    // Calculate date range for incidents per day
    const dates = incidents.map(i => new Date(i.timestamp));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const incidentsPerDay = daysDiff > 0 ? incidents.length / daysDiff : 0;

    return {
      totalIncidents: incidents.length,
      bikeIncidents,
      pedIncidents,
      fatalIncidents,
      injuryIncidents,
      avgSeverityScore: 0, // TODO: Calculate with weights
      incidentsPerDay
    };
  }

  /**
   * Get most dangerous areas/intersections
   * Used by: SafetyRightSidebar -> MostDangerousAreas
   */
  static async getMostDangerousAreas(
    incidentsLayer: __esri.FeatureLayer,
    mapView: __esri.MapView,
    filters: any,
    limit: number = 10
  ): Promise<Array<{
    location: string;
    incidentCount: number;
    bikeIncidents: number;
    pedIncidents: number;
    severityScore: number;
    geometry: __esri.Geometry;
  }>> {
    // TODO: Implement spatial clustering to identify dangerous areas
    // This would involve:
    // 1. Spatial clustering of incidents
    // 2. Reverse geocoding for location names  
    // 3. Severity scoring with weights
    return [];
  }

  /**
   * Join incidents with weights data
   * Helper for severity calculations
   */
  static async joinIncidentsWithWeights(
    incidents: any[],
    weightsLayer: __esri.FeatureLayer | null
  ): Promise<any[]> {
    // If weights layer is not available, return incidents without weights
    if (!weightsLayer) {
      return incidents.map(incident => ({
        ...incident,
        weights: [],
        weightedExposure: 0
      }));
    }
    
    // Get all weight records (paginated)
    const weights = await this.fetchAllWeights(weightsLayer);
    
    // Join by incident_id
    return incidents.map(incident => {
      const weight = weights.find(w => w.incident_id === incident.id);
      return {
        ...incident,
        weight: weight?.weight || 1,
        ...weight
      };
    });
  }

  /**
   * Fetch all weights with pagination (based on your existing pattern)
   */
  private static async fetchAllWeights(weightsLayer: __esri.FeatureLayer | null): Promise<any[]> {
    if (!weightsLayer) {
      return [];
    }
    let weightResultLength = 10000;
    const weightArr: Record<string, any>[] = [];
    let weightObjectIds: string[] = [];

    while (weightResultLength === 10000) {
      const queryWeights = weightsLayer.createQuery();
      queryWeights.where = "1=1";
      queryWeights.outFields = ["*"];
      queryWeights.maxRecordCountFactor = 5;
      
      if (weightObjectIds.length > 0) {
        queryWeights.objectIds = weightObjectIds.map(id => parseInt(id));
      }

      const weightResults = await weightsLayer.queryFeatures(queryWeights);
      const weightFeatures = weightResults.features;

      weightFeatures.forEach((feature: any) => {
        weightArr.push({ ...feature.attributes });
        weightObjectIds.push(feature.attributes.objectid.toString());
      });

      weightResultLength = weightFeatures.length;
      weightObjectIds = weightObjectIds.map((id) => (parseInt(id) + weightResultLength).toString());
    }

    return weightArr;
  }

  /**
   * Calculate incident density by area
   */
  static calculateIncidentDensity(
    incidents: any[],
    area: number, // in square units
    timeSpan: number // in days
  ): {
    incidentsPerSqKm: number;
    incidentsPerSqKmPerYear: number;
  } {
    const incidentsPerSqKm = incidents.length / area;
    const incidentsPerSqKmPerYear = (incidentsPerSqKm / timeSpan) * 365;
    
    return {
      incidentsPerSqKm,
      incidentsPerSqKmPerYear
    };
  }
}