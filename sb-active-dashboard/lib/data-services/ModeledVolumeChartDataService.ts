/**
 * Modeled Volume Chart Data Service
 * Provides chart-ready data for modeled volume components
 */

import Geometry from "@arcgis/core/geometry/Geometry";
import MapView from "@arcgis/core/views/MapView";
import { ModeledVolumeDataService } from './ModeledVolumeDataService';

interface ChartDataConfig {
  dataSource: 'dillon' | 'lily';
  countTypes: ('bike' | 'ped')[];
  dateRange: { start: Date; end: Date };
  year: number;
  detailLevel: 'overview' | 'detailed';
}

interface TrafficLevelBreakdownData {
  categories: string[];
  totalMiles: number[];
  percentages: number[];
  details: {
    low: { miles: number; percentage: number; segments: number };
    medium: { miles: number; percentage: number; segments: number };
    high: { miles: number; percentage: number; segments: number };
  };
  totalNetworkMiles: number;
}

export class ModeledVolumeChartDataService {
  private volumeDataService: ModeledVolumeDataService;

  constructor() {
    this.volumeDataService = new ModeledVolumeDataService();
  }

  /**
   * Get traffic level breakdown data for bar chart
   */
  async getTrafficLevelBreakdownData(
    mapView: MapView,
    config: ChartDataConfig,
    geometry?: Geometry
  ): Promise<TrafficLevelBreakdownData> {
    try {
      // Get raw traffic level data with proper geometry handling
      const rawData = geometry 
        ? await this.volumeDataService.getTrafficLevelDataWithGeometry(mapView, config, geometry)
        : await this.volumeDataService.getTrafficLevelData(mapView, config);
      
      // Calculate totals and percentages (using simulated data)
      const totalMiles = rawData.totalMiles?.reduce((sum, miles) => sum + miles, 0) || 0;
      const percentages = rawData.totalMiles?.map(miles => 
        totalMiles > 0 ? (miles / totalMiles) * 100 : 0
      ) || [];

      return {
        categories: rawData.categories || [],
        totalMiles: rawData.totalMiles || [],
        percentages,
        details: {
          low: {
            miles: rawData.details?.low.miles || 0,
            percentage: percentages[0] || 0,
            segments: rawData.details?.low.segments || 0
          },
          medium: {
            miles: rawData.details?.medium.miles || 0,
            percentage: percentages[1] || 0,
            segments: rawData.details?.medium.segments || 0
          },
          high: {
            miles: rawData.details?.high.miles || 0,
            percentage: percentages[2] || 0,
            segments: rawData.details?.high.segments || 0
          }
        },
        totalNetworkMiles: totalMiles
      };

    } catch (error) {
      console.error('Error getting traffic level breakdown data:', error);
      
      // Return empty data instead of fallback data to allow UI to detect no data state
      return {
        categories: ['Low', 'Medium', 'High'],
        totalMiles: [0, 0, 0],
        percentages: [0, 0, 0],
        details: {
          low: { miles: 0, percentage: 0, segments: 0 },
          medium: { miles: 0, percentage: 0, segments: 0 },
          high: { miles: 0, percentage: 0, segments: 0 }
        },
        totalNetworkMiles: 0
      };
    }
  }

  /**
   * Get summary statistics for modeled data
   */
  async getSummaryStatistics(
    mapView: MapView,
    config: ChartDataConfig,
    geometry?: Geometry
  ): Promise<{
    totalNetworkMiles: number;
    avgDailyBikes: number;
    avgDailyPeds: number;
    highestVolumeSegment: { location: string; volume: number };
    dataQuality: 'High' | 'Medium' | 'Low';
  }> {
    try {
      const trafficData = await this.getTrafficLevelBreakdownData(mapView, config, geometry);
      
      return {
        totalNetworkMiles: trafficData.totalNetworkMiles,
        avgDailyBikes: 450, // TODO: Calculate from actual data
        avgDailyPeds: 280,  // TODO: Calculate from actual data
        highestVolumeSegment: {
          location: "State St & Canon Perdido", // TODO: Query actual highest volume
          volume: 1250
        },
        dataQuality: config.dataSource === 'dillon' ? 'High' : 'Medium'
      };

    } catch (error) {
      console.error('Error getting summary statistics:', error);
      
      return {
        totalNetworkMiles: 364,
        avgDailyBikes: 450,
        avgDailyPeds: 280,
        highestVolumeSegment: {
          location: "Data unavailable",
          volume: 0
        },
        dataQuality: 'Low'
      };
    }
  }

  /**
   * Get volume comparison data (e.g., year-over-year)
   */
  async getVolumeComparisonData(
    mapView: MapView,
    config: ChartDataConfig,
    comparisonYear: number
  ): Promise<{
    currentYear: { year: number; totalVolume: number; breakdown: number[] };
    comparisonYear: { year: number; totalVolume: number; breakdown: number[] };
    percentChange: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    try {
      // Get current year data
      const currentData = await this.getTrafficLevelBreakdownData(mapView, config);
      
      // Get comparison year data
      const comparisonConfig = { ...config, year: comparisonYear };
      const comparisonData = await this.getTrafficLevelBreakdownData(mapView, comparisonConfig);

      const currentTotal = currentData.totalNetworkMiles;
      const comparisonTotal = comparisonData.totalNetworkMiles;
      const percentChange = comparisonTotal > 0 ? 
        ((currentTotal - comparisonTotal) / comparisonTotal) * 100 : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (percentChange > 5) trend = 'increasing';
      else if (percentChange < -5) trend = 'decreasing';

      return {
        currentYear: {
          year: config.year,
          totalVolume: currentTotal,
          breakdown: currentData.totalMiles
        },
        comparisonYear: {
          year: comparisonYear,
          totalVolume: comparisonTotal,
          breakdown: comparisonData.totalMiles
        },
        percentChange,
        trend
      };

    } catch (error) {
      console.error('Error getting volume comparison data:', error);
      
      return {
        currentYear: {
          year: config.year,
          totalVolume: 364,
          breakdown: [115, 127, 122]
        },
        comparisonYear: {
          year: comparisonYear,
          totalVolume: 340,
          breakdown: [110, 120, 110]
        },
        percentChange: 7.1,
        trend: 'increasing'
      };
    }
  }

  /**
   * Get the underlying volume data service
   */
  getVolumeDataService(): ModeledVolumeDataService {
    return this.volumeDataService;
  }

  /**
   * Check if data is available for the given configuration
   */
  isConfigurationValid(config: ChartDataConfig): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check year availability
    if (!this.volumeDataService.isDataAvailable(config.year, config.dataSource)) {
      if (config.dataSource === 'dillon') {
        errors.push(`Year ${config.year} not available for Dillon's data (2019-2023 only)`);
      } else if (config.dataSource === 'lily') {
        errors.push(`Year ${config.year} not available for Lily's data (2023 only)`);
      }
    }

    // Check count types
    if (config.countTypes.length === 0) {
      warnings.push("No count types selected - results may be empty");
    }

    // Check date range
    const yearStart = new Date(config.year, 0, 1);
    const yearEnd = new Date(config.year, 11, 31);
    if (config.dateRange.start < yearStart || config.dateRange.end > yearEnd) {
      warnings.push("Date range extends beyond the selected year");
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
}