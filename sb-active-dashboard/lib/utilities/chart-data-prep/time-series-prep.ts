/**
 * Time series data preparation utilities
 * Used by: Timeline charts, hourly breakdowns, year-over-year comparisons
 */

import { AggregationUtilService } from "../shared/aggregation";

export class TimeSeriesPrepService {
  /**
   * Prepare hourly volume data for charts
   * Used by: Various hourly breakdown charts
   */
  static prepareHourlyChartData(
    hourlyData: Array<{
      hour: number;
      bikeCount: number;
      pedCount: number;
      avgBikeCount: number;
      avgPedCount: number;
    }>,
    chartType: 'bar' | 'line' | 'area'
  ): {
    categories: string[];
    series: Array<{
      name: string;
      data: number[];
      type?: string;
      color?: string;
    }>;
  } {
    const categories = hourlyData.map(h => `${h.hour}:00`);
    
    const series = [
      {
        name: 'Bicycle',
        data: hourlyData.map(h => h.avgBikeCount),
        color: '#3B82F6', // Blue
        type: chartType
      },
      {
        name: 'Pedestrian', 
        data: hourlyData.map(h => h.avgPedCount),
        color: '#10B981', // Green
        type: chartType
      }
    ];

    return { categories, series };
  }

  /**
   * Prepare year-over-year comparison data
   * Used by: YearToYearVolumeComparison chart
   */
  static prepareYearOverYearData(
    currentYearData: number[],
    previousYearData: number[],
    labels: string[]
  ): {
    categories: string[];
    series: any[];
    summary: {
      totalChange: number;
      percentChange: number;
      direction: 'increase' | 'decrease' | 'no-change';
    };
  } {
    // Calculate totals
    const currentTotal = currentYearData.reduce((sum, val) => sum + val, 0);
    const previousTotal = previousYearData.reduce((sum, val) => sum + val, 0);
    const change = AggregationUtilService.calculateYearOverYearChange(currentTotal, previousTotal);

    const series = [
      {
        name: 'Current Year',
        data: currentYearData,
        color: '#3B82F6'
      },
      {
        name: 'Previous Year',
        data: previousYearData,
        color: '#94A3B8'
      }
    ];

    return {
      categories: labels,
      series,
      summary: {
        totalChange: change.absoluteChange,
        percentChange: change.percentChange,
        direction: change.direction
      }
    };
  }

  /**
   * Prepare timeline sparkline data
   * Used by: TimelineSparkline component
   */
  static prepareTimelineSparklineData(
    siteData: Array<{
      siteId: number;
      siteName: string;
      siteLabel: string;
      dataPeriods: Array<{ start: Date; end: Date }>;
    }>,
    totalTimeSpan: { start: Date; end: Date }
  ): Array<{
    id: string;
    name: string;
    label: string;
    dataPeriods: Array<{ start: number; end: number }>; // Normalized 0-100
  }> {
    const totalSpanMs = totalTimeSpan.end.getTime() - totalTimeSpan.start.getTime();

    return siteData.map(site => ({
      id: `site${site.siteId}`,
      name: site.siteName,
      label: site.siteLabel,
      dataPeriods: site.dataPeriods.map(period => {
        const startPercent = ((period.start.getTime() - totalTimeSpan.start.getTime()) / totalSpanMs) * 100;
        const endPercent = ((period.end.getTime() - totalTimeSpan.start.getTime()) / totalSpanMs) * 100;
        
        return {
          start: Math.max(0, startPercent),
          end: Math.min(100, endPercent)
        };
      })
    }));
  }

  /**
   * Prepare monthly/annual trend data
   * Used by: Trend analysis charts
   */
  static prepareTrendData(
    rawData: Array<{ date: Date; value: number; type?: string }>,
    groupBy: 'month' | 'year' | 'quarter'
  ): {
    categories: string[];
    data: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    // Group data by time period
    const grouped = this.groupDataByTimePeriod(rawData, groupBy);
    
    // Calculate trend
    const values = Object.values(grouped);
    const trend = this.calculateTrend(values);

    return {
      categories: Object.keys(grouped),
      data: values,
      trend
    };
  }

  /**
   * Helper: Group data by time period
   */
  private static groupDataByTimePeriod(
    data: Array<{ date: Date; value: number }>,
    groupBy: 'month' | 'year' | 'quarter'
  ): { [key: string]: number } {
    return data.reduce((groups, item) => {
      let key: string;
      
      switch (groupBy) {
        case 'year':
          key = item.date.getFullYear().toString();
          break;
        case 'month':
          key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(item.date.getMonth() / 3) + 1;
          key = `${item.date.getFullYear()}-Q${quarter}`;
          break;
        default:
          key = item.date.toISOString().split('T')[0];
      }

      groups[key] = (groups[key] || 0) + item.value;
      return groups;
    }, {} as { [key: string]: number });
  }

  /**
   * Helper: Calculate trend direction
   */
  private static calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    // Simple linear trend analysis
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const threshold = firstAvg * 0.05; // 5% threshold
    
    if (secondAvg > firstAvg + threshold) return 'increasing';
    if (secondAvg < firstAvg - threshold) return 'decreasing';
    return 'stable';
  }
}