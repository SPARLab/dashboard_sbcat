/**
 * Volume Chart Data Service
 * Centralized service for all volume chart data needs
 * One import per chart component - clean namespacing
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import { TimeSeriesPrepService } from "../utilities/chart-data-prep/time-series-prep";
import { CountSiteProcessingService } from "../utilities/volume-utils/count-site-processing";

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
    bikeAADV: number;
    pedAADV: number;
    totalAADV: number;
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

export interface ModeBreakdownData {
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
    filters: { showBicyclist: boolean; showPedestrian: boolean },
    selectedGeometry?: __esri.Geometry | null
  ): Promise<SummaryStatsData> {
    return CountSiteProcessingService.getSummaryStatistics(
      this.sitesLayer,
      this.aadtLayer,
      mapView,
      filters,
      selectedGeometry
    );
  }

  /**
   * Get data for HighestVolume chart component
   */
  async getHighestVolumeData(
    mapView: MapView,
    filters: { showBicyclist: boolean; showPedestrian: boolean },
    dateRange: { startDate: Date; endDate: Date },
    limit: number = 10,
    selectedGeometry?: __esri.Geometry | null
  ): Promise<HighestVolumeData> {
    const sites = await CountSiteProcessingService.getHighestVolumeSites(
      this.sitesLayer,
      this.aadtLayer,
      mapView,
      filters,
      dateRange,
      limit,
      selectedGeometry
    );

    // Add locality field to match interface
    const sitesWithLocality = (sites || []).map(site => ({
      ...site,
      locality: 'Unknown' // Default value since locality is required in interface
    }));
    
    return { sites: sitesWithLocality };
  }

  /**
   * Helper method to query all features from a layer in parallel, bypassing record limits.
   */
  private async queryAllFeaturesInParallel(layer: __esri.FeatureLayer, query: __esri.Query): Promise<__esri.Graphic[]> {
    const maxRecordCount = 1000; // Safe value for ArcGIS Server feature queries

    // 1. Get all object IDs that match the original query
    const allObjectIds = await layer.queryObjectIds(query as __esri.QueryProperties);
    
    if (!allObjectIds || allObjectIds.length === 0) {
        return [];
    }

    // 2. Split IDs into chunks
    const idChunks: number[][] = [];
    for (let i = 0; i < allObjectIds.length; i += maxRecordCount) {
        idChunks.push(allObjectIds.slice(i, i + maxRecordCount).filter((id): id is number => typeof id === 'number'));
    }

    // 3. Create feature query promises for each chunk
    const featureQueryPromises = idChunks.map(chunk => {
        const featureQuery = query.clone();
        featureQuery.objectIds = chunk;
        return layer.queryFeatures(featureQuery as __esri.QueryProperties);
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
    filters: { showBicyclist: boolean; showPedestrian: boolean },
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

      const sitesResult = await this.sitesLayer.queryFeatures(sitesQuery as __esri.QueryProperties);
            
      if (sitesResult.features.length === 0) {
        return { sites: [] };
      }
      
      const siteIds = sitesResult.features.map(f => f.attributes.id);
      const siteMetadata = sitesResult.features.reduce((acc, feature) => {
        acc[feature.attributes.id] = feature.attributes;
        return acc;
      }, {} as Record<number, {id: number, name: string}>);

      // Step 2: Get count data for these sites within the date range using paginated helper
      const countsQuery = this.countsLayer.createQuery();
      const startDate = timeSpan.start.toISOString().split('T')[0];
      const endDate = timeSpan.end.toISOString().split('T')[0];
      
      countsQuery.where = `site_id IN (${siteIds.join(',')}) AND timestamp >= DATE '${startDate}' AND timestamp <= DATE '${endDate}'`;
      countsQuery.outFields = ["site_id", "timestamp"];
      countsQuery.returnGeometry = false;

      const countsResultFeatures = await this.queryAllFeaturesInParallel(this.countsLayer, countsQuery);

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

      // Step 4: Convert to timeline format, including sites with no data in the period
      const timelineData = sitesResult.features.map((siteFeature, index) => {
        const siteId = siteFeature.attributes.id;
        const siteName = siteMetadata[siteId]?.name || `Site ${siteId}`;
        const countDates = countsBySite[siteId] || [];
        
        countDates.sort((a, b) => a.getTime() - b.getTime());
        
        const dataPeriods = [];
        if (countDates.length > 0) {
          // Group consecutive dates into discrete periods with gaps
          dataPeriods.push(...this.findDataPeriods(countDates, timeSpan));
        }

        const result = {
          siteId: siteId,
          siteName: siteName,
          siteLabel: `Site ${index + 1}`,
          dataPeriods
        };
        
        return result;
      });

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
    filters: { showBicyclist: boolean; showPedestrian: boolean },
    selectedGeometry?: __esri.Geometry | null
  ): Promise<ModeBreakdownData> {
    // Get summary stats first
    const summary = await this.getSummaryStatistics(mapView, filters, selectedGeometry);
    
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mapView: MapView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters: { showBicyclist: boolean; showPedestrian: boolean },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _currentYear: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _previousYear: number
  ): Promise<{
    categories: string[];
    series: Array<{ name: string; data: number[] }>;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mapView: MapView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters: { showBicyclist: boolean; showPedestrian: boolean }
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
    _filters: { showBicyclist: boolean; showPedestrian: boolean },
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mapView: MapView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters: { showBicyclist: boolean; showPedestrian: boolean }
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mapView: MapView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters: { showBicyclist: boolean; showPedestrian: boolean }
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

  /**
   * Find discrete data periods from a sorted array of count dates
   * Uses smart granularity: daily for short spans, weekly for multi-year spans
   */
  private findDataPeriods(sortedDates: Date[], timeSpan: { start: Date; end: Date }): Array<{ start: Date; end: Date }> {
    if (sortedDates.length === 0) return [];
    
    const totalDays = (timeSpan.end.getTime() - timeSpan.start.getTime()) / (1000 * 60 * 60 * 24);
    const useWeeklyGranularity = totalDays > 730; // Use weekly granularity for spans > 2 years
    
    if (useWeeklyGranularity) {
      return this.findWeeklyDataPeriods(sortedDates);
    } else {
      return this.findDailyDataPeriods(sortedDates);
    }
  }

  /**
   * Find data periods at daily granularity
   * Considers gaps larger than 3 days as separate periods
   */
  private findDailyDataPeriods(sortedDates: Date[]): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = [];
    const maxGapDays = 3; // Consider gaps larger than 3 days as separate periods
    
    let periodStart = sortedDates[0];
    let lastDate = sortedDates[0];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const daysDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > maxGapDays) {
        // End current period and start a new one
        periods.push({
          start: periodStart,
          end: lastDate
        });
        periodStart = currentDate;
      }
      
      lastDate = currentDate;
    }
    
    // Add the final period
    periods.push({
      start: periodStart,
      end: lastDate
    });
    
    return periods;
  }

  /**
   * Find data periods at weekly granularity
   * Groups dates by week and considers gaps larger than 2 weeks as separate periods
   */
  private findWeeklyDataPeriods(sortedDates: Date[]): Array<{ start: Date; end: Date }> {
    // Group dates by week (ISO week)
    const weekGroups = new Map<string, Date[]>();
    
    sortedDates.forEach(date => {
      const weekKey = this.getISOWeekKey(date);
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(date);
    });
    
    // Sort weeks and find continuous periods
    const sortedWeeks = Array.from(weekGroups.keys()).sort();
    const periods: Array<{ start: Date; end: Date }> = [];
    
    if (sortedWeeks.length === 0) return periods;
    
    let periodStartWeek = sortedWeeks[0];
    let lastWeek = sortedWeeks[0];
    
    for (let i = 1; i < sortedWeeks.length; i++) {
      const currentWeek = sortedWeeks[i];
      const weeksDiff = this.getWeekDifference(lastWeek, currentWeek);
      
      if (weeksDiff > 2) { // Gap larger than 2 weeks
        // End current period
        const periodStartDate = this.getWeekStartDate(periodStartWeek);
        const periodEndDate = this.getWeekEndDate(lastWeek);
        periods.push({
          start: periodStartDate,
          end: periodEndDate
        });
        periodStartWeek = currentWeek;
      }
      
      lastWeek = currentWeek;
    }
    
    // Add the final period
    const periodStartDate = this.getWeekStartDate(periodStartWeek);
    const periodEndDate = this.getWeekEndDate(lastWeek);
    periods.push({
      start: periodStartDate,
      end: periodEndDate
    });
    
    return periods;
  }

  /**
   * Get ISO week key (YYYY-WW format)
   */
  private getISOWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getISOWeek(date);
    return `${year}-${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get ISO week number (1-53)
   */
  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Calculate difference in weeks between two week keys
   */
  private getWeekDifference(week1: string, week2: string): number {
    const [year1, weekNum1] = week1.split('-').map(Number);
    const [year2, weekNum2] = week2.split('-').map(Number);
    
    // Simple approximation - could be more precise with actual dates
    const totalWeeks1 = year1 * 52 + weekNum1;
    const totalWeeks2 = year2 * 52 + weekNum2;
    
    return Math.abs(totalWeeks2 - totalWeeks1);
  }

  /**
   * Get the start date (Monday) of a given ISO week
   */
  private getWeekStartDate(weekKey: string): Date {
    const [year, week] = weekKey.split('-').map(Number);
    const jan1 = new Date(year, 0, 1);
    const daysToAdd = (week - 1) * 7 - jan1.getDay() + 1;
    return new Date(year, 0, 1 + daysToAdd);
  }

  /**
   * Get the end date (Sunday) of a given ISO week
   */
  private getWeekEndDate(weekKey: string): Date {
    const startDate = this.getWeekStartDate(weekKey);
    return new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  }
}