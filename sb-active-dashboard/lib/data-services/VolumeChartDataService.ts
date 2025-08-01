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
    limit: number = 10,
    selectedGeometry?: __esri.Geometry | null
  ): Promise<HighestVolumeData> {
    const sites = await CountSiteProcessingService.getHighestVolumeSites(
      this.sitesLayer,
      this.aadtLayer,
      mapView,
      filters,
      limit,
      selectedGeometry
    );

    return { sites };
  }

  /**
   * Helper method to query all features from a layer in parallel, bypassing record limits.
   */
  private async queryAllFeaturesInParallel(layer: __esri.FeatureLayer, query: __esri.Query): Promise<__esri.Graphic[]> {
    const maxRecordCount = 1000; // Safe value for ArcGIS Server feature queries

    // 1. Get all object IDs that match the original query
    const allObjectIds = await layer.queryObjectIds(query);
    
    if (!allObjectIds || allObjectIds.length === 0) {
        return [];
    }

    // 2. Split IDs into chunks
    const idChunks: number[][] = [];
    for (let i = 0; i < allObjectIds.length; i += maxRecordCount) {
        idChunks.push(allObjectIds.slice(i, i + maxRecordCount));
    }

    // 3. Create feature query promises for each chunk
    const featureQueryPromises = idChunks.map(chunk => {
        const featureQuery = query.clone();
        featureQuery.objectIds = chunk;
        return layer.queryFeatures(featureQuery);
    });

    // 4. Run in parallel and combine results
    const featureSets = await Promise.all(featureQueryPromises);
    const allFeatures = featureSets.flatMap(featureSet => featureSet.features);
    
    return allFeatures;
  }

  /**
   * Get data for TimelineSparkline chart component
   */
  async getTimelineSparklineData(
    mapView: MapView,
    filters: any,
    timeSpan: { start: Date; end: Date },
    selectedGeometry?: __esri.Geometry | null
  ): Promise<TimelineSparklineData> {
    try {
      if (!selectedGeometry) {
        return { sites: [] };
      }

      // Step 1: Get sites within the selected geometry
      const sitesQuery = this.sitesLayer.createQuery();
      sitesQuery.geometry = selectedGeometry;
      sitesQuery.spatialRelationship = "intersects";
      sitesQuery.outFields = ["id", "name"];
      sitesQuery.returnGeometry = false;

      const sitesResult = await this.sitesLayer.queryFeatures(sitesQuery);
      
      console.log('Step 1: Sites in polygon', sitesResult.features.map(f => f.attributes));
      
      if (sitesResult.features.length === 0) {
        return { sites: [] };
      }
      
      const siteIds = sitesResult.features.map(f => f.attributes.id);
      const siteMetadata = sitesResult.features.reduce((acc, feature) => {
        acc[feature.attributes.id] = feature.attributes;
        return acc;
      }, {} as Record<number, {id: number, name: string}>);
      console.log('Step 1b: Site metadata', siteMetadata);

      // Step 2: Get count data for these sites within the date range using paginated helper
      const countsQuery = this.countsLayer.createQuery();
      const startDate = timeSpan.start.toISOString().split('T')[0];
      const endDate = timeSpan.end.toISOString().split('T')[0];
      
      countsQuery.where = `site_id IN (${siteIds.join(',')}) AND timestamp >= DATE '${startDate}' AND timestamp <= DATE '${endDate}'`;
      countsQuery.outFields = ["site_id", "timestamp"];
      countsQuery.returnGeometry = false;

      const countsResultFeatures = await this.queryAllFeaturesInParallel(this.countsLayer, countsQuery);
      console.log('Step 2: Counts data from server', countsResultFeatures.map(f => f.attributes));

      // Step 3: Group count data by site to find data periods
      const countsBySite = countsResultFeatures.reduce((acc, feature) => {
        const siteId = feature.attributes.site_id;
        const countDate = new Date(feature.attributes.timestamp);
        
        if (!acc[siteId]) {
          acc[siteId] = [];
        }
        acc[siteId].push(countDate);
        return acc;
      }, {} as Record<number, Date[]>);
      console.log('Step 3: Counts grouped by site', countsBySite);

      // Step 4: Convert to timeline format, including sites with no data in the period
      const timelineData = sitesResult.features.map((siteFeature, index) => {
        const siteId = siteFeature.attributes.id;
        const siteName = siteMetadata[siteId]?.name || `Site ${siteId}`;
        const countDates = countsBySite[siteId] || [];
        
        countDates.sort((a, b) => a.getTime() - b.getTime());
        
        const dataPeriods = [];
        if (countDates.length > 0) {
          // TODO: Enhance this to find gaps and create multiple periods
          dataPeriods.push({
            start: countDates[0],
            end: countDates[countDates.length - 1]
          });
        }

        const result = {
          siteId: siteId,
          siteName: siteName,
          siteLabel: `Site ${index + 1}`,
          dataPeriods
        };
        
        return result;
      });
      console.log('Step 4: Final timeline data', timelineData);

      const sites = TimeSeriesPrepService.prepareTimelineSparklineData(timelineData, timeSpan);
      return { sites };
      
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      return { sites: [] };
    }
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