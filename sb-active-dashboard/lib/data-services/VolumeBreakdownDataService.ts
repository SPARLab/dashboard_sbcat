import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";

/**
 * Interface for volume breakdown data by different time scales
 */
export interface VolumeBreakdownData {
  name: string;
  value: number;
}

export interface VolumeBreakdownResult {
  data: VolumeBreakdownData[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

export type TimeScale = 'Hour' | 'Day' | 'Weekday vs Weekend' | 'Month' | 'Year';

/**
 * Service for querying and aggregating raw volume count data for breakdown charts
 */
export class VolumeBreakdownDataService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";

  private static currentDateRange: { startDate: Date; endDate: Date } | undefined;

  static setDateRange(dateRange?: { startDate: Date; endDate: Date }) {
    this.currentDateRange = dateRange;
  }

  /**
   * Query volume breakdown data for selected area and time scale
   */
  static async queryVolumeBreakdown(
    selectedGeometry: Polygon | null,
    timeScale: TimeScale,
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<VolumeBreakdownResult> {
    try {
      if (!selectedGeometry) {
        return this.getEmptyResult();
      }

      // Get site IDs within the selected geometry
      const siteIds = await this.getSiteIdsInPolygon(selectedGeometry);
      
      if (siteIds.length === 0) {
        return this.getEmptyResult();
      }

      // Query counts data for these sites
      const countsData = await this.queryCountsForSites(
        siteIds,
        showBicyclist,
        showPedestrian,
        this.currentDateRange
      );
      
      // Aggregate data based on time scale
      const aggregatedData = this.aggregateByTimeScale(countsData, timeScale);

      return {
        data: aggregatedData,
        totalCount: aggregatedData.reduce((sum, item) => sum + item.value, 0),
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying volume breakdown data:', error);
      return {
        data: [],
        totalCount: 0,
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
   * Query raw counts data for specific site IDs
   */
  private static async queryCountsForSites(
    siteIds: number[],
    showBicyclist: boolean,
    showPedestrian: boolean,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<any[]> {
    const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });

    // Build count type filter
    const countTypeConditions = [];
    if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
    if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
    
    if (countTypeConditions.length === 0) {
      return [];
    }

    const whereParts = [`site_id IN (${siteIds.join(',')})`, `(${countTypeConditions.join(' OR ')})`];
    if (dateRange?.startDate && dateRange?.endDate) {
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];
      // Use DATE 'YYYY-MM-DD' syntax, inclusive bounds
      whereParts.push(`timestamp >= DATE '${startDate}' AND timestamp <= DATE '${endDate}'`);
    }
    const whereClause = whereParts.join(' AND ');

    const query = countsLayer.createQuery();
    query.where = whereClause;
    query.outFields = ["site_id", "timestamp", "count_type", "counts"];
    query.returnGeometry = false;
    // Debug the where clause to verify date filtering
    // eslint-disable-next-line no-console
    console.debug('[VolumeBreakdownDataService] counts where:', query.where);

    const results = await countsLayer.queryFeatures(query);
    return results.features.map(feature => feature.attributes);
  }

  /**
   * Aggregate count data by time scale
   * Properly handles hourly data by first aggregating to daily totals, then to target time scale
   */
  private static aggregateByTimeScale(countsData: any[], timeScale: TimeScale): VolumeBreakdownData[] {
    // Filter out suspicious data points
    const filteredData = countsData.filter(record => {
      const counts = record.counts || 0;
      // Filter out obviously bad data (negative, extremely high, or zero counts)
      return counts > 0 && counts < 10000; // Adjust threshold as needed
    });

    // For Hour scale, we can work directly with hourly data
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
      
      // Create unique date key (site + date)
      const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const dateKey = `${siteId}_${dateStr}`;
      
      // Determine time scale key
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
      
      // Sum hourly counts to get daily total for this site-date-timekey combination
      dailyTotals[dateKey][timeKey] += counts;
    });

    // Now aggregate daily totals by time scale
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

    // Calculate average daily traffic for each time period
    const result = Object.entries(timeScaleAggregation).map(([name, data]) => {
      const averageDailyTraffic = data.count > 0 ? Math.round(data.total / data.count) : 0;
      
      return { 
        name, 
        value: averageDailyTraffic 
      };
    });
    
    return this.sortByTimeScale(result, timeScale);
  }

  /**
   * Sort data appropriately based on time scale
   */
  private static sortByTimeScale(data: VolumeBreakdownData[], timeScale: TimeScale): VolumeBreakdownData[] {
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
  private static getEmptyResult(): VolumeBreakdownResult {
    return {
      data: [],
      totalCount: 0,
      isLoading: false,
      error: null
    };
  }

  /**
   * Get default/fallback data for when no area is selected
   * This maintains the current behavior with some sample data
   */
  static getDefaultData(timeScale: TimeScale): VolumeBreakdownData[] {
    switch (timeScale) {
      case 'Hour':
        return Array.from({ length: 24 }, (_, i) => ({ 
          name: `${i}`, 
          value: Math.floor(Math.random() * 100) + 50 
        }));
      case 'Day':
        return [
          { name: 'Mon', value: 120 },
          { name: 'Tue', value: 132 },
          { name: 'Wed', value: 101 },
          { name: 'Thu', value: 134 },
          { name: 'Fri', value: 90 },
          { name: 'Sat', value: 230 },
          { name: 'Sun', value: 210 },
        ];
      case 'Weekday vs Weekend':
        return [
          { name: 'Weekday', value: 577 },
          { name: 'Weekend', value: 440 },
        ];
      case 'Month':
        return [
          { name: 'Jan', value: 115 }, { name: 'Feb', value: 127 },
          { name: 'Mar', value: 122 }, { name: 'Apr', value: 130 },
          { name: 'May', value: 110 }, { name: 'Jun', value: 140 },
          { name: 'Jul', value: 150 }, { name: 'Aug', value: 145 },
          { name: 'Sep', value: 135 }, { name: 'Oct', value: 125 },
          { name: 'Nov', value: 118 }, { name: 'Dec', value: 128 },
        ];
      case 'Year':
        return Array.from({ length: 5 }, (_, i) => ({ 
          name: `${new Date().getFullYear() - i}`, 
          value: Math.floor(Math.random() * 1000) + 500 
        })).reverse();

      default:
        return [];
    }
  }
}