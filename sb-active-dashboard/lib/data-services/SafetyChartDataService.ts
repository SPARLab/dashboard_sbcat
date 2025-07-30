/**
 * Safety Chart Data Service
 * Centralized service for all safety chart data needs
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import { IncidentProcessingService } from "../utilities/safety-utils/incident-processing";

interface SafetySummaryData {
  totalIncidents: number;
  bikeIncidents: number;
  pedIncidents: number;
  fatalIncidents: number;
  injuryIncidents: number;
  avgSeverityScore: number;
  incidentsPerDay: number;
}

interface MostDangerousAreasData {
  areas: Array<{
    location: string;
    incidentCount: number;
    bikeIncidents: number;
    pedIncidents: number;
    severityScore: number;
    geometry: __esri.Geometry;
  }>;
}

interface SeverityBreakdownData {
  categories: string[];
  bikeData: number[];
  pedData: number[];
  totalByCategory: number[];
}

export class SafetyChartDataService {
  private incidentsLayer: FeatureLayer;
  private weightsLayer: FeatureLayer;

  constructor(
    incidentsLayer: FeatureLayer,
    weightsLayer: FeatureLayer
  ) {
    this.incidentsLayer = incidentsLayer;
    this.weightsLayer = weightsLayer;
  }

  /**
   * Get data for Safety SummaryStatistics chart component
   */
  async getSummaryStatistics(
    mapView: MapView,
    filters: any
  ): Promise<SafetySummaryData> {
    return IncidentProcessingService.getSafetySummaryStatistics(
      this.incidentsLayer,
      this.weightsLayer,
      mapView,
      filters
    );
  }

  /**
   * Get data for MostDangerousAreas chart component
   */
  async getMostDangerousAreasData(
    mapView: MapView,
    filters: any,
    limit: number = 10
  ): Promise<MostDangerousAreasData> {
    const areas = await IncidentProcessingService.getMostDangerousAreas(
      this.incidentsLayer,
      mapView,
      filters,
      limit
    );

    return { areas };
  }

  /**
   * Get data for SeverityBreakdown chart component
   */
  async getSeverityBreakdownData(
    mapView: MapView,
    filters: any
  ): Promise<SeverityBreakdownData> {
    // TODO: Implement severity breakdown analysis
    return {
      categories: ['Fatal', 'Injury', 'Property Damage Only'],
      bikeData: [5, 25, 70],
      pedData: [8, 35, 57],
      totalByCategory: [13, 60, 127]
    };
  }

  /**
   * Get data for ConflictTypeBreakdown chart component
   */
  async getConflictTypeBreakdownData(
    mapView: MapView,
    filters: any
  ): Promise<{
    categories: string[];
    data: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
  }> {
    // TODO: Implement conflict type analysis
    return {
      categories: ['Intersection', 'Mid-Block', 'Driveway', 'Other'],
      data: [
        { name: 'Intersection', value: 45, percentage: 45 },
        { name: 'Mid-Block', value: 30, percentage: 30 },
        { name: 'Driveway', value: 15, percentage: 15 },
        { name: 'Other', value: 10, percentage: 10 }
      ]
    };
  }

  /**
   * Get data for AnnualIncidentsComparison chart component
   */
  async getAnnualIncidentsComparisonData(
    mapView: MapView,
    filters: any,
    years: number[]
  ): Promise<{
    categories: string[];
    series: Array<{
      name: string;
      data: number[];
    }>;
  }> {
    // TODO: Implement annual comparison
    return {
      categories: years.map(y => y.toString()),
      series: [
        {
          name: 'Bicycle Incidents',
          data: [120, 135, 110, 145, 160]
        },
        {
          name: 'Pedestrian Incidents',
          data: [80, 95, 85, 105, 115]
        }
      ]
    };
  }

  /**
   * Get data for IncidentsVsTrafficRatios chart component
   */
  async getIncidentsVsTrafficRatiosData(
    mapView: MapView,
    safetyFilters: any,
    volumeFilters: any
  ): Promise<{
    areas: Array<{
      name: string;
      incidents: number;
      volume: number;
      ratio: number; // incidents per 1000 volume
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  }> {
    // TODO: Implement safety vs volume ratio calculation
    // This requires joining safety and volume data spatially
    return {
      areas: []
    };
  }
}