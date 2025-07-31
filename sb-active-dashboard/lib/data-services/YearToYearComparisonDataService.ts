import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";

/**
 * Interface for year-to-year comparison data by different time scales
 */
export interface YearToYearComparisonData {
  name: string;
  year2023: number;
  year2024: number;
}

export interface YearToYearComparisonResult {
  data: YearToYearComparisonData[];
  totalCount2023: number;
  totalCount2024: number;
  percentChange: number;
  isLoading: boolean;
  error: string | null;
}

export type TimeScale = 'Hour' | 'Day' | 'Weekday vs Weekend' | 'Month' | 'Year';

/**
 * Service for querying and aggregating volume data for year-to-year comparison charts
 */
export class YearToYearComparisonDataService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";

  /**
   * Query year-to-year comparison data for selected area and time scale
   */
  static async queryYearToYearComparison(
    selectedGeometry: Polygon | null,
    timeScale: TimeScale,
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<YearToYearComparisonResult> {
    try {
      if (!selectedGeometry) {
        return this.getEmptyResult();
      }

      // Get site IDs within the selected geometry
      const siteIds = await this.getSiteIdsInPolygon(selectedGeometry);
      
      if (siteIds.length === 0) {
        return this.getEmptyResult();
      }

      // Query counts data for both years
      const year2023Data = await this.queryCountsForSitesAndYear(siteIds, 2023, showBicyclist, showPedestrian);
      const year2024Data = await this.queryCountsForSitesAndYear(siteIds, 2024, showBicyclist, showPedestrian);
      
      // Aggregate data based on time scale for both years
      const aggregated2023 = this.aggregateByTimeScale(year2023Data, timeScale);
      const aggregated2024 = this.aggregateByTimeScale(year2024Data, timeScale);

      // Combine the data for comparison
      const comparisonData = this.combineYearData(aggregated2023, aggregated2024, timeScale);
      
      const total2023 = aggregated2023.reduce((sum, item) => sum + item.value, 0);
      const total2024 = aggregated2024.reduce((sum, item) => sum + item.value, 0);
      const percentChange = total2023 > 0 ? ((total2024 - total2023) / total2023) * 100 : 0;

      return {
        data: comparisonData,
        totalCount2023: total2023,
        totalCount2024: total2024,
        percentChange,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying year-to-year comparison data:', error);
      return {
        data: [],
        totalCount2023: 0,
        totalCount2024: 0,
        percentChange: 0,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get site IDs that fall within the selected polygon
   */
  private static async getSiteIdsInPolygon(selectedGeometry: Polygon): Promise<number[]> {
    const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
    
    const query = sitesLayer.createQuery();
    query.geometry = selectedGeometry;
    query.spatialRelationship = "intersects";
    query.outFields = ["id"];
    query.returnGeometry = false;

    const results = await sitesLayer.queryFeatures(query);
    return results.features.map(feature => feature.attributes.id);
  }

  /**
   * Query raw counts data for specific site IDs and year
   */
  private static async queryCountsForSitesAndYear(
    siteIds: number[],
    year: number,
    showBicyclist: boolean,
    showPedestrian: boolean
  ): Promise<any[]> {
    const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });

    // Build count type filter
    const countTypeConditions = [];
    if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
    if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
    
    if (countTypeConditions.length === 0) {
      return [];
    }

    // Add year filter
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime();

    const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= ${yearStart} AND timestamp < ${yearEnd}`;

    const query = countsLayer.createQuery();
    query.where = whereClause;
    query.outFields = ["site_id", "timestamp", "count_type", "counts"];
    query.returnGeometry = false;

    const results = await countsLayer.queryFeatures(query);
    return results.features.map(feature => feature.attributes);
  }

  /**
   * Aggregate count data by time scale
   */
  private static aggregateByTimeScale(countsData: any[], timeScale: TimeScale): { name: string; value: number }[] {
    // Filter out suspicious data points
    const filteredData = countsData.filter(record => {
      const counts = record.counts || 0;
      return counts > 0 && counts < 10000;
    });

    console.log(`🔍 Year-to-Year Data Quality Check for ${timeScale}:`, {
      originalRecords: countsData.length,
      filteredRecords: filteredData.length,
      removedRecords: countsData.length - filteredData.length
    });

    // For Hour scale, work directly with hourly data
    if (timeScale === 'Hour') {
      const hourlyAggregation: { [key: string]: { total: number, count: number } } = {};
      
      filteredData.forEach(record => {
        const timestamp = new Date(record.timestamp);
        const counts = record.counts || 0;
        const key = timestamp.getHours().toString();
        
        if (!hourlyAggregation[key]) {
          hourlyAggregation[key] = { total: 0, count: 0 };
        }
        
        hourlyAggregation[key].total += counts;
        hourlyAggregation[key].count += 1;
      });

      const result = Object.entries(hourlyAggregation).map(([name, data]) => {
        const averageValue = data.count > 0 ? Math.round(data.total / data.count) : 0;
        return { name, value: averageValue };
      });
      
      return this.sortByTimeScale(result, timeScale);
    }

    // For all other scales, first aggregate hourly data to daily totals
    const dailyTotals: { [dateKey: string]: { [timeKey: string]: number } } = {};
    
    filteredData.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const counts = record.counts || 0;
      const siteId = record.site_id;
      
      const dateStr = timestamp.toISOString().split('T')[0];
      const dateKey = `${siteId}_${dateStr}`;
      
      let timeKey: string;
      switch (timeScale) {
        case 'Day':
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          timeKey = dayNames[timestamp.getDay()];
          break;
        case 'Weekday vs Weekend':
          const dayOfWeek = timestamp.getDay();
          timeKey = dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : 'Weekday';
          break;
        case 'Month':
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          timeKey = monthNames[timestamp.getMonth()];
          break;
        case 'Year':
          timeKey = timestamp.getFullYear().toString();
          break;
        default:
          timeKey = 'Unknown';
      }
      
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {};
      }
      if (!dailyTotals[dateKey][timeKey]) {
        dailyTotals[dateKey][timeKey] = 0;
      }
      
      dailyTotals[dateKey][timeKey] += counts;
    });

    // Aggregate daily totals by time scale
    const timeScaleAggregation: { [key: string]: { total: number, count: number } } = {};
    
    Object.entries(dailyTotals).forEach(([dateKey, timeKeys]) => {
      Object.entries(timeKeys).forEach(([timeKey, dailyTotal]) => {
        if (!timeScaleAggregation[timeKey]) {
          timeScaleAggregation[timeKey] = { total: 0, count: 0 };
        }
        
        timeScaleAggregation[timeKey].total += dailyTotal;
        timeScaleAggregation[timeKey].count += 1;
      });
    });

    const result = Object.entries(timeScaleAggregation).map(([name, data]) => {
      const averageDailyTraffic = data.count > 0 ? Math.round(data.total / data.count) : 0;
      return { name, value: averageDailyTraffic };
    });
    
    return this.sortByTimeScale(result, timeScale);
  }

  /**
   * Combine data from both years for comparison
   */
  private static combineYearData(
    data2023: { name: string; value: number }[],
    data2024: { name: string; value: number }[],
    timeScale: TimeScale
  ): YearToYearComparisonData[] {
    // Create maps for easy lookup
    const map2023 = new Map(data2023.map(item => [item.name, item.value]));
    const map2024 = new Map(data2024.map(item => [item.name, item.value]));

    // Get all unique time periods from both years
    const allPeriods = new Set([...map2023.keys(), ...map2024.keys()]);

    const result = Array.from(allPeriods).map(name => ({
      name,
      year2023: map2023.get(name) || 0,
      year2024: map2024.get(name) || 0
    }));

    return this.sortComparisonByTimeScale(result, timeScale);
  }

  /**
   * Sort data appropriately based on time scale
   */
  private static sortByTimeScale(data: { name: string; value: number }[], timeScale: TimeScale): { name: string; value: number }[] {
    switch (timeScale) {
      case 'Hour':
        return data.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      case 'Day':
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return data.sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));
      case 'Month':
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return data.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
      case 'Year':
        return data.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      case 'Weekday vs Weekend':
        return data.sort((a, b) => a.name === 'Weekday' ? -1 : 1);
      default:
        return data;
    }
  }

  /**
   * Sort comparison data appropriately based on time scale
   */
  private static sortComparisonByTimeScale(data: YearToYearComparisonData[], timeScale: TimeScale): YearToYearComparisonData[] {
    switch (timeScale) {
      case 'Hour':
        return data.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      case 'Day':
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return data.sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));
      case 'Month':
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return data.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
      case 'Year':
        return data.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      case 'Weekday vs Weekend':
        return data.sort((a, b) => a.name === 'Weekday' ? -1 : 1);
      default:
        return data;
    }
  }

  /**
   * Return empty result structure
   */
  private static getEmptyResult(): YearToYearComparisonResult {
    return {
      data: [],
      totalCount2023: 0,
      totalCount2024: 0,
      percentChange: 0,
      isLoading: false,
      error: null
    };
  }

  /**
   * Get default/fallback data for when no area is selected
   */
  static getDefaultData(timeScale: TimeScale): YearToYearComparisonData[] {
    const data2023 = {
      Hour: Array.from({ length: 24 }, (_, i) => ({ name: `${i}`, year2023: Math.floor(Math.random() * 50) + 100, year2024: Math.floor(Math.random() * 50) + 95 })),
      Day: [
        { name: 'Mon', year2023: 120, year2024: 118 },
        { name: 'Tue', year2023: 125, year2024: 123 },
        { name: 'Wed', year2023: 118, year2024: 121 },
        { name: 'Thu', year2023: 132, year2024: 129 },
        { name: 'Fri', year2023: 115, year2024: 117 },
        { name: 'Sat', year2023: 128, year2024: 125 },
        { name: 'Sun', year2023: 122, year2024: 119 },
      ],
      'Weekday vs Weekend': [
        { name: 'Weekday', year2023: 122, year2024: 120 },
        { name: 'Weekend', year2023: 125, year2024: 122 },
      ],
      Month: [
        { name: 'Jan', year2023: 125, year2024: 121 },
        { name: 'Feb', year2023: 130, year2024: 125 },
        { name: 'Mar', year2023: 128, year2024: 124 },
        { name: 'Apr', year2023: 135, year2024: 132 },
        { name: 'May', year2023: 125, year2024: 121.5 },
        { name: 'Jun', year2023: 130, year2024: 127 },
        { name: 'Jul', year2023: 132, year2024: 129 },
        { name: 'Aug', year2023: 120, year2024: 118 },
        { name: 'Sep', year2023: 125, year2024: 122 },
        { name: 'Oct', year2023: 135, year2024: 132 },
        { name: 'Nov', year2023: 130, year2024: 127 },
        { name: 'Dec', year2023: 128, year2024: 125 },
      ],
      Year: [
        { name: '2023', year2023: 128, year2024: 0 },
        { name: '2024', year2023: 0, year2024: 125 },
      ],
    };

    return data2023[timeScale] || [];
  }
}