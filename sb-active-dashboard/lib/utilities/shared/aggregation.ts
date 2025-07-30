/**
 * Common aggregation utilities for statistical operations
 */

export class AggregationUtilService {
  /**
   * Create server-side aggregation query for hourly data
   */
  static createHourlyStatsQuery(
    layer: __esri.FeatureLayer,
    whereClause: string
  ): __esri.Query {
    const query = layer.createQuery();
    query.where = whereClause;
    query.outStatistics = [
      {
        statisticType: "sum",
        onStatisticField: "counts",
        outStatisticFieldName: "total_counts"
      },
      {
        statisticType: "count",
        onStatisticField: "counts", 
        outStatisticFieldName: "num_records"
      }
    ];
    query.groupByFieldsForStatistics = ["hour", "count_type"];
    query.orderByFields = ["hour ASC", "count_type ASC"];
    query.returnGeometry = false;
    
    return query;
  }

  /**
   * Process hourly aggregation results into structured data
   */
  static processHourlyAggregation(features: any[]): any[] {
    // Initialize 24-hour structure
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      bikeCount: 0,
      pedCount: 0,
      avgBikeCount: 0,
      avgPedCount: 0
    }));

    // Process aggregated features
    features.forEach(feature => {
      const { hour, count_type, total_counts, num_records } = feature.attributes;
      const avg = num_records > 0 ? total_counts / num_records : 0;

      if (hour >= 0 && hour < 24) {
        if (count_type === 'bike') {
          hourlyData[hour].bikeCount = total_counts;
          hourlyData[hour].avgBikeCount = avg;
        } else if (count_type === 'ped') {
          hourlyData[hour].pedCount = total_counts;
          hourlyData[hour].avgPedCount = avg;
        }
      }
    });

    return hourlyData;
  }

  /**
   * Aggregate data by time period (daily, monthly, yearly)
   */
  static aggregateByTimePeriod(
    data: any[],
    timePeriod: 'daily' | 'monthly' | 'yearly',
    dateField: string = 'date',
    valueField: string = 'count'
  ): any[] {
    // TODO: Implement temporal aggregation
    return [];
  }

  /**
   * Calculate summary statistics (sum, avg, min, max)
   */
  static calculateSummaryStats(values: number[]): {
    sum: number;
    avg: number;
    min: number;
    max: number;
    count: number;
  } {
    if (values.length === 0) {
      return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { sum, avg, min, max, count: values.length };
  }

  /**
   * Group data by field value
   */
  static groupByField<T>(data: T[], fieldName: string): { [key: string]: T[] } {
    return data.reduce((groups, item) => {
      const key = (item as any)[fieldName];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: T[] });
  }

  /**
   * Calculate percentiles for a dataset
   */
  static calculatePercentiles(values: number[], percentiles: number[] = [25, 50, 75, 90, 95]): { [key: number]: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const result: { [key: number]: number } = {};

    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[p] = sorted[Math.max(0, index)];
    });

    return result;
  }

  /**
   * Calculate year-over-year change
   */
  static calculateYearOverYearChange(currentYear: number, previousYear: number): {
    absoluteChange: number;
    percentChange: number;
    direction: 'increase' | 'decrease' | 'no-change';
  } {
    const absoluteChange = currentYear - previousYear;
    const percentChange = previousYear === 0 ? 0 : (absoluteChange / previousYear) * 100;
    
    let direction: 'increase' | 'decrease' | 'no-change';
    if (absoluteChange > 0) direction = 'increase';
    else if (absoluteChange < 0) direction = 'decrease';
    else direction = 'no-change';

    return { absoluteChange, percentChange, direction };
  }
}