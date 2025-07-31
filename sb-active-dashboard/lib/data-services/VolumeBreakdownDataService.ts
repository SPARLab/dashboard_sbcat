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

export type TimeScale = 'Hour' | 'Day' | 'Week' | 'Weekday vs Weekend' | 'Month' | 'Year';

/**
 * Service for querying and aggregating raw volume count data for breakdown charts
 */
export class VolumeBreakdownDataService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";

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
      const countsData = await this.queryCountsForSites(siteIds, showBicyclist, showPedestrian);
      
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

    const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')})`;

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
  private static aggregateByTimeScale(countsData: any[], timeScale: TimeScale): VolumeBreakdownData[] {
    const aggregation: { [key: string]: number } = {};

    countsData.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const counts = record.counts || 0;
      
      let key: string;
      
      switch (timeScale) {
        case 'Hour':
          key = timestamp.getHours().toString();
          break;
        case 'Day':
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          key = dayNames[timestamp.getDay()];
          break;
        case 'Week':
          // Get week number of the year
          const weekNumber = this.getWeekNumber(timestamp);
          key = `Week ${weekNumber}`;
          break;
        case 'Weekday vs Weekend':
          const dayOfWeek = timestamp.getDay();
          key = dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : 'Weekday';
          break;
        case 'Month':
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          key = monthNames[timestamp.getMonth()];
          break;
        case 'Year':
          key = timestamp.getFullYear().toString();
          break;
        default:
          key = 'Unknown';
      }
      
      aggregation[key] = (aggregation[key] || 0) + counts;
    });

    // Convert to array and sort appropriately
    const result = Object.entries(aggregation).map(([name, value]) => ({ name, value }));
    
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
      case 'Week':
        return data.sort((a, b) => {
          const weekA = parseInt(a.name.replace('Week ', ''));
          const weekB = parseInt(b.name.replace('Week ', ''));
          return weekA - weekB;
        });
      case 'Weekday vs Weekend':
        return data.sort((a, b) => a.name === 'Weekday' ? -1 : 1);
      default:
        return data;
    }
  }

  /**
   * Get week number for a given date
   */
  private static getWeekNumber(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
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
      case 'Week':
        return Array.from({ length: 52 }, (_, i) => ({ 
          name: `Week ${i + 1}`, 
          value: Math.floor(Math.random() * 200) + 100 
        }));
      default:
        return [];
    }
  }
}