/**
 * Volume Chart Data Service
 * Centralized service for all volume chart data needs
 * One import per chart component - clean namespacing
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import { CountSiteProcessingService } from "../utilities/volume-utils/count-site-processing";
import { TimeSeriesPrepService } from "../utilities/chart-data-prep/time-series-prep";
import { AggregationUtilService } from "../utilities/shared/aggregation";

// Chart-specific data interfaces
interface SummaryStatsData {
  totalSites: number;
  bikeSites: number;
  pedSites: number;
  avgDailyVolume: number;
  totalDailyVolume: number;
}

interface HighestVolumeData {
  sites: Array<{
    siteId: number;
    siteName: string;
    bikeAADT: number;
    pedAADT: number;
    totalAADT: number;
    locality: string;
  }>;
}

interface TimelineSparklineData {
  sites: Array<{
    id: string;
    name: string;
    dataPeriods: Array<{ start: number; end: number }>;
  }>;
}

interface ModeBreakdownData {
  bicycle: { count: number; percentage: number };
  pedestrian: { count: number; percentage: number };
  total: number;
}

export class VolumeChartDataService {
  private sitesLayer: FeatureLayer;
  private countsLayer: FeatureLayer;
  private aadtLayer: FeatureLayer;

  constructor(
    sitesLayer: FeatureLayer,
    countsLayer: FeatureLayer,
    aadtLayer: FeatureLayer
  ) {
    this.sitesLayer = sitesLayer;
    this.countsLayer = countsLayer;
    this.aadtLayer = aadtLayer;
  }

  /**
   * Get data for SummaryStatistics chart component
   */
  async getSummaryStatistics(
    mapView: MapView,
    filters: any
  ): Promise<SummaryStatsData> {
    return CountSiteProcessingService.getSummaryStatistics(
      this.sitesLayer,
      this.aadtLayer,
      mapView,
      filters
    );
  }

  /**
   * Get data for HighestVolume chart component
   */
  async getHighestVolumeData(
    mapView: MapView,
    filters: any,
    limit: number = 10
  ): Promise<HighestVolumeData> {
    const sites = await CountSiteProcessingService.getHighestVolumeSites(
      this.sitesLayer,
      this.aadtLayer,
      mapView,
      filters,
      limit
    );

    return { sites };
  }

  /**
   * Get data for TimelineSparkline chart component
   */
  async getTimelineSparklineData(
    mapView: MapView,
    filters: any,
    timeSpan: { start: Date; end: Date }
  ): Promise<TimelineSparklineData> {
    // TODO: Implement timeline data fetching
    // This would query count data to find when each site has data
    const mockData = [
      {
        siteId: 1,
        siteName: "Site 1",
        dataPeriods: [
          { start: new Date(2020, 0, 1), end: new Date(2020, 5, 1) },
          { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) }
        ]
      }
    ];

    const sites = TimeSeriesPrepService.prepareTimelineSparklineData(mockData, timeSpan);
    return { sites };
  }

  /**
   * Get data for ModeBreakdown chart component
   */
  async getModeBreakdownData(
    mapView: MapView,
    filters: any
  ): Promise<ModeBreakdownData> {
    // Get summary stats first
    const summary = await this.getSummaryStatistics(mapView, filters);
    
    const bicycle = summary.bikeSites;
    const pedestrian = summary.pedSites;
    const total = bicycle + pedestrian;

    return {
      bicycle: {
        count: bicycle,
        percentage: total > 0 ? (bicycle / total) * 100 : 0
      },
      pedestrian: {
        count: pedestrian,
        percentage: total > 0 ? (pedestrian / total) * 100 : 0
      },
      total
    };
  }

  /**
   * Get data for YearToYearVolumeComparison chart component
   */
  async getYearToYearComparisonData(
    mapView: MapView,
    filters: any,
    currentYear: number,
    previousYear: number
  ): Promise<{
    categories: string[];
    series: any[];
    summary: {
      totalChange: number;
      percentChange: number;
      direction: 'increase' | 'decrease' | 'no-change';
    };
  }> {
    // TODO: Implement year-over-year comparison
    // This would aggregate data by month for each year
    const mockCurrentData = [100, 120, 110, 130, 140, 135, 150, 145, 155, 160, 165, 170];
    const mockPreviousData = [90, 100, 95, 115, 125, 120, 135, 130, 140, 145, 150, 155];
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return TimeSeriesPrepService.prepareYearOverYearData(
      mockCurrentData,
      mockPreviousData,
      labels
    );
  }

  /**
   * Get data for AggregatedVolumeBreakdown chart component
   */
  async getAggregatedVolumeBreakdownData(
    mapView: MapView,
    filters: any
  ): Promise<{
    totalVolume: number;
    weekdayVolume: number;
    weekendVolume: number;
    peakHourVolume: number;
    offPeakVolume: number;
  }> {
    // TODO: Implement aggregated volume breakdown
    return {
      totalVolume: 0,
      weekdayVolume: 0,
      weekendVolume: 0,
      peakHourVolume: 0,
      offPeakVolume: 0
    };
  }

  /**
   * Get data for CompletenessMetrics chart component
   */
  async getCompletenessMetricsData(
    mapView: MapView,
    filters: any,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    sitesWithData: number;
    sitesWithoutData: number;
    dataCompleteness: number;
    avgDataDensity: number;
  }> {
    return CountSiteProcessingService.getCompletenessMetrics(
      this.sitesLayer,
      this.countsLayer,
      mapView,
      dateRange
    );
  }

  /**
   * Get data for MilesOfStreetByTrafficLevelBarChart component
   */
  async getMilesOfStreetByTrafficLevelData(
    mapView: MapView,
    filters: any
  ): Promise<{
    categories: string[];
    data: number[];
    total: number;
  }> {
    // TODO: Implement traffic level analysis
    // This would use modeled data to categorize street miles by volume
    return {
      categories: ['Low', 'Medium', 'High', 'Very High'],
      data: [25, 35, 25, 15],
      total: 100
    };
  }

  /**
   * Get data for LowDataCoverage chart component
   */
  async getLowDataCoverageData(
    mapView: MapView,
    filters: any
  ): Promise<{
    areas: Array<{
      name: string;
      coverage: number;
      recommendedSites: number;
    }>;
  }> {
    // TODO: Implement data coverage analysis
    return {
      areas: []
    };
  }
}