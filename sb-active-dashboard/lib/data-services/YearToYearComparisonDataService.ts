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

/**
 * Interface for multi-year comparison data
 */
export interface MultiYearComparisonResult {
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  totalsByYear: Record<number, number>;
}

export type TimeScale = 'Hour' | 'Day' | 'Weekday vs Weekend' | 'Month' | 'Year';
export type NormalizationMode = 'none' | 'equal-site';

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
    showPedestrian: boolean = true,
    normalization: NormalizationMode = 'none',
    scaleHourlyToDaily: boolean = false
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
      const aggregated2023 = this.aggregateByTimeScale(year2023Data, timeScale, normalization, scaleHourlyToDaily);
      const aggregated2024 = this.aggregateByTimeScale(year2024Data, timeScale, normalization, scaleHourlyToDaily);

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

    // Add year filter - use ISO date strings instead of Unix timestamps
    const yearStart = new Date(year, 0, 1).toISOString();
    const yearEnd = new Date(year + 1, 0, 1).toISOString();

    const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= '${yearStart}' AND timestamp < '${yearEnd}'`;

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
  private static aggregateByTimeScale(
    countsData: any[],
    timeScale: TimeScale,
    normalization: NormalizationMode = 'none',
    scaleHourlyToDaily: boolean = false
  ): { name: string; value: number }[] {
    // Debug: Log data quality analysis
    this.logDataQualityAnalysis(countsData, timeScale);
    
    // Keep all data but log outliers for investigation
    const filteredData = countsData.filter(record => {
      const counts = record.counts || 0;
      return counts > 0; // Only remove zero/negative values
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
        const avgHourly = data.count > 0 ? data.total / data.count : 0;
        const averageValue = Math.round(scaleHourlyToDaily ? avgHourly * 24 : avgHourly);
        return { name, value: averageValue };
      });
      
      return this.sortByTimeScale(result, timeScale);
    }

    // For all other scales, calculate proper average daily volumes
    // Step 1: Group data by site-date to calculate hourly averages per site-day
    const siteDayData: { [dateKey: string]: { [timeKey: string]: { total: number, hours: number } } } = {};
    
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
      
      if (!siteDayData[dateKey]) {
        siteDayData[dateKey] = {};
      }
      if (!siteDayData[dateKey][timeKey]) {
        siteDayData[dateKey][timeKey] = { total: 0, hours: 0 };
      }
      
      siteDayData[dateKey][timeKey].total += counts;
      siteDayData[dateKey][timeKey].hours += 1;
    });

    // Step 2: Calculate average hourly volume for each site-day, then aggregate by time scale
    const timeScaleAggregation: { [key: string]: { siteDayAverages: number[], count: number } } = {};
    // For equal-site normalization, collect per-site arrays of site-day averages
    const timeKeyToSiteAverages: { [timeKey: string]: { [siteId: string]: number[] } } = {};
    
    Object.entries(siteDayData).forEach(([dateKey, timeKeys]) => {
      const siteId = dateKey.split('_')[0];
      Object.entries(timeKeys).forEach(([timeKey, data]) => {
        if (!timeScaleAggregation[timeKey]) {
          timeScaleAggregation[timeKey] = { siteDayAverages: [], count: 0 };
        }
        
        // Calculate average hourly volume for this site-day
        const siteDayHourlyAverage = data.hours > 0 ? data.total / data.hours : 0;
        timeScaleAggregation[timeKey].siteDayAverages.push(siteDayHourlyAverage);
        timeScaleAggregation[timeKey].count += 1;

        if (normalization === 'equal-site') {
          if (!timeKeyToSiteAverages[timeKey]) timeKeyToSiteAverages[timeKey] = {};
          if (!timeKeyToSiteAverages[timeKey][siteId]) timeKeyToSiteAverages[timeKey][siteId] = [];
          timeKeyToSiteAverages[timeKey][siteId].push(siteDayHourlyAverage);
        }
      });
    });

    // Step 3: Calculate the final average across all site-days for each time period
    let result: { name: string; value: number }[];
    if (normalization === 'equal-site') {
      // Compute site-month (or site-timeKey) averages, then equal-mean across sites
      result = Object.entries(timeKeyToSiteAverages).map(([timeKey, bySite]) => {
        const siteAvgs: number[] = Object.values(bySite).map(arr => {
          if (arr.length === 0) return 0;
          return arr.reduce((s, v) => s + v, 0) / arr.length;
        });
        const meanAcrossSites = siteAvgs.length > 0 ? siteAvgs.reduce((s, v) => s + v, 0) / siteAvgs.length : 0;
        const value = Math.round(scaleHourlyToDaily ? meanAcrossSites * 24 : meanAcrossSites);
        return { name: timeKey, value };
      });
    } else {
      result = Object.entries(timeScaleAggregation).map(([name, data]) => {
        const meanHourly = data.siteDayAverages.length > 0 
          ? (data.siteDayAverages.reduce((sum, avg) => sum + avg, 0) / data.siteDayAverages.length)
          : 0;
        const value = Math.round(scaleHourlyToDaily ? meanHourly * 24 : meanHourly);
        return { name, value };
      });
    }
    
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
    const allPeriods = new Set([...Array.from(map2023.keys()), ...Array.from(map2024.keys())]);

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
   * Log detailed data quality analysis for debugging
   */
  private static logDataQualityAnalysis(countsData: any[], timeScale: TimeScale): void {
    return;

    // TODO: Remove this once we have a better way to handle data quality analysis
    if (countsData.length === 0) return;

    const counts = countsData.map(record => record.counts || 0).filter(c => c > 0);
    const timestamps = countsData.map(record => new Date(record.timestamp));
    
    // Basic statistics
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    const median = counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)];
    
    // Identify outliers (values > 3 standard deviations from mean)
    const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length);
    const outlierThreshold = mean + (3 * stdDev);
    const outliers = countsData.filter(record => (record.counts || 0) > outlierThreshold);
    
    // Group data by month-year for July 2022 analysis
    const monthlyGroups: { [key: string]: any[] } = {};
    countsData.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const monthYear = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyGroups[monthYear]) monthlyGroups[monthYear] = [];
      monthlyGroups[monthYear].push(record);
    });

    console.group(`📊 Data Quality Analysis - ${timeScale} Scale`);
    console.log(`Total records: ${countsData.length}`);
    console.log(`Valid counts: ${counts.length}`);
    console.log(`Count range: ${min} - ${max}`);
    console.log(`Mean: ${mean.toFixed(2)}, Median: ${median}`);
    console.log(`Standard deviation: ${stdDev.toFixed(2)}`);
    console.log(`Outlier threshold (>3σ): ${outlierThreshold.toFixed(2)}`);
    

    // July 2022 specific analysis
    const july2022 = monthlyGroups['2022-07'] || [];
    if (july2022.length > 0) {
      const july2022Counts = july2022.map(r => r.counts || 0).filter(c => c > 0);
      const july2022Mean = july2022Counts.reduce((sum, c) => sum + c, 0) / july2022Counts.length;
      const july2022Max = Math.max(...july2022Counts);
      
      console.group(`🔍 July 2022 Analysis`);
      console.log(`July 2022 records: ${july2022.length}`);
      console.log(`July 2022 mean: ${july2022Mean.toFixed(2)}`);
      console.log(`July 2022 max: ${july2022Max}`);
      
      // Show highest values in July 2022
      const july2022Sorted = july2022.sort((a, b) => (b.counts || 0) - (a.counts || 0));
      console.log(`Top 5 highest July 2022 counts:`);
      july2022Sorted.slice(0, 5).forEach((record, i) => {
        const timestamp = new Date(record.timestamp);
        console.log(`  ${i + 1}. Site ${record.site_id}, ${timestamp.toISOString()}: ${record.counts} counts`);
      });
      console.groupEnd();
    }

    // Compare with other months in 2022
    const months2022 = Object.keys(monthlyGroups).filter(key => key.startsWith('2022-'));
    if (months2022.length > 1) {
      console.group(`📅 2022 Monthly Comparison`);
      months2022.forEach(monthYear => {
        const monthData = monthlyGroups[monthYear];
        const monthCounts = monthData.map(r => r.counts || 0).filter(c => c > 0);
        const monthMean = monthCounts.length > 0 ? monthCounts.reduce((sum, c) => sum + c, 0) / monthCounts.length : 0;
        const monthName = new Date(2022, parseInt(monthYear.split('-')[1]) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        console.log(`${monthName} 2022: ${monthData.length} records, mean: ${monthMean.toFixed(2)}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Export detailed raw data for external analysis (call from browser console)
   * Usage: YearToYearComparisonDataService.exportRawDataForAnalysis(selectedGeometry, [2022], true, true)
   */
  static async exportRawDataForAnalysis(
    selectedGeometry: Polygon | null,
    years: number[],
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<void> {
    if (!selectedGeometry || years.length === 0) {
      console.error('Please provide a selected geometry and years array');
      return;
    }

    try {
      console.log('🔍 Exporting raw data for analysis...');
      
      // Get site IDs within the selected geometry
      const siteIds = await this.getSiteIdsInPolygon(selectedGeometry);
      console.log(`Found ${siteIds.length} sites in selected area:`, siteIds);
      
      // Build count type filter
      const countTypeConditions: string[] = [];
      if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
      if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
      
      if (countTypeConditions.length === 0) {
        console.error('No count types selected');
        return;
      }

      // Query raw data for each year
      const allRawData: any[] = [];
      for (const year of years) {
        const yearStart = new Date(year, 0, 1).toISOString();
        const yearEnd = new Date(year + 1, 0, 1).toISOString();
        
        const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= '${yearStart}' AND timestamp < '${yearEnd}'`;
        
        const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
        const query = countsLayer.createQuery();
        query.where = whereClause;
        query.outFields = ["site_id", "timestamp", "count_type", "counts"];
        query.returnGeometry = false;

        console.log(`Querying ${year} data with: ${whereClause}`);
        const features = await this.queryAllFeaturesInParallel(countsLayer, query);
        const yearData = features.map(feature => ({
          ...feature.attributes,
          year: year
        }));
        
        console.log(`${year}: Found ${yearData.length} records`);
        allRawData.push(...yearData);
      }

      // Process and group data for analysis
      const processedData = allRawData.map(record => {
        const timestamp = new Date(record.timestamp);
        return {
          site_id: record.site_id,
          year: record.year,
          month: timestamp.getMonth() + 1,
          day: timestamp.getDate(),
          hour: timestamp.getHours(),
          count_type: record.count_type,
          counts: record.counts,
          timestamp: record.timestamp,
          date_string: timestamp.toISOString().split('T')[0],
          month_name: timestamp.toLocaleDateString('en-US', { month: 'short' })
        };
      });

      // Group by month for easy analysis
      const monthlyData: { [key: string]: any[] } = {};
      processedData.forEach(record => {
        const key = `${record.year}-${String(record.month).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = [];
        monthlyData[key].push(record);
      });

      console.group('📈 Raw Data Export Summary');
      console.log(`Total records exported: ${processedData.length}`);
      console.log('Monthly breakdown:');
      Object.keys(monthlyData).sort().forEach(monthKey => {
        const data = monthlyData[monthKey];
        const counts = data.map(r => r.counts).filter(c => c > 0);
        const mean = counts.length > 0 ? counts.reduce((sum, c) => sum + c, 0) / counts.length : 0;
        const max = counts.length > 0 ? Math.max(...counts) : 0;
        console.log(`  ${monthKey}: ${data.length} records, mean: ${mean.toFixed(2)}, max: ${max}`);
      });
      console.groupEnd();

      // Make data available in global scope for analysis
      (window as any).rawVolumeData = processedData;
      (window as any).monthlyVolumeData = monthlyData;
      
      console.log('✅ Data exported to window.rawVolumeData and window.monthlyVolumeData');
      console.log('💡 You can now copy this data to CSV or analyze in browser console');
      
      // Example analysis queries
      console.group('🔧 Example Analysis Queries');
      console.log('// Find July 2022 outliers:');
      console.log('window.rawVolumeData.filter(r => r.year === 2022 && r.month === 7 && r.counts > 1000)');
      console.log('');
      console.log('// Group by site and date to see daily totals:');
      console.log('const dailyTotals = {}; window.rawVolumeData.forEach(r => { const key = `${r.site_id}_${r.date_string}`; if (!dailyTotals[key]) dailyTotals[key] = 0; dailyTotals[key] += r.counts; });');
      console.log('');
      console.log('// Convert to CSV:');
      console.log('console.log("site_id,year,month,day,hour,count_type,counts,timestamp\\n" + window.rawVolumeData.map(r => `${r.site_id},${r.year},${r.month},${r.day},${r.hour},${r.count_type},${r.counts},${r.timestamp}`).join("\\n"))');
      console.groupEnd();

    } catch (error) {
      console.error('Error exporting raw data:', error);
    }
  }

  /**
   * Export full raw counts layer data (all attributes) for the selected region and years
   * Writes both JSON and CSV to disk and exposes window.fullRawCountsData
   */
  static async exportFullRawCountsData(
    selectedGeometry: Polygon | null,
    years: number[],
    includeGeometry: boolean = false
  ): Promise<void> {
    if (!selectedGeometry || years.length === 0) {
      console.error('Please provide a selected geometry and years array');
      return;
    }

    try {
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
      const siteIds = await this.getSiteIdsInPolygon(selectedGeometry);
      console.log(`Full export: ${siteIds.length} sites in polygon`);

      const allRecords: any[] = [];
      for (const year of years) {
        const yearStart = new Date(year, 0, 1).toISOString();
        const yearEnd = new Date(year + 1, 0, 1).toISOString();
        const whereClause = `site_id IN (${siteIds.join(',')}) AND timestamp >= '${yearStart}' AND timestamp < '${yearEnd}'`;

        const query = countsLayer.createQuery();
        query.where = whereClause;
        query.outFields = ['*'];
        query.returnGeometry = includeGeometry;

        console.log(`Full export querying ${year} with outFields=* includeGeometry=${includeGeometry}`);
        const features = await this.queryAllFeaturesInParallel(countsLayer, query);
        for (const f of features) {
          const attrs = { ...f.attributes };
          if (includeGeometry) {
            (attrs as any).geometry_json = f.geometry ? JSON.stringify((f.geometry as any).toJSON ? (f.geometry as any).toJSON() : f.geometry) : null;
          }
          allRecords.push(attrs);
        }
      }

      // Deduce header keys from union of all attribute keys
      const keySet = new Set<string>();
      allRecords.forEach(r => Object.keys(r || {}).forEach(k => keySet.add(k)));
      const headers = Array.from(keySet);

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        const needsQuotes = /[",\n]/.test(s);
        const escaped = s.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const rows = allRecords.map(r => headers.map(h => escapeCsv((r as any)[h])).join(','));
      const csv = headers.join(',') + '\n' + rows.join('\n');

      // Download helpers
      const download = (name: string, content: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      };

      // Expose and download
      (window as any).fullRawCountsData = allRecords;
      download(`full_raw_counts_${years[0]}-${years[years.length - 1]}.json`, JSON.stringify(allRecords, null, 2), 'application/json');
      download(`full_raw_counts_${years[0]}-${years[years.length - 1]}.csv`, csv, 'text/csv');

      console.log(`✅ Exported ${allRecords.length} records with ${headers.length} fields to JSON and CSV.`);
    } catch (err) {
      console.error('Error exporting full raw counts data:', err);
    }
  }

  /**
   * Helper method to query all features from a layer in parallel, bypassing record limits
   */
  private static async queryAllFeaturesInParallel(layer: FeatureLayer, query: __esri.Query): Promise<__esri.Graphic[]> {
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
   * Query multi-year comparison data for selected area and time scale
   */
  static async queryMultiYearComparison(
    selectedGeometry: Polygon | null,
    timeScale: TimeScale,
    years: number[],
    showBicyclist: boolean = true,
    showPedestrian: boolean = true,
    dateRange: { start: Date; end: Date },
    normalization: NormalizationMode = 'none',
    scaleHourlyToDaily: boolean = false
  ): Promise<MultiYearComparisonResult> {
    try {
      if (!selectedGeometry || years.length === 0) {
        return { categories: [], series: [], totalsByYear: {} };
      }

      // Get site IDs within the selected geometry
      const siteIds = await this.getSiteIdsInPolygon(selectedGeometry);
      
      if (siteIds.length === 0) {
        return { categories: [], series: [], totalsByYear: {} };
      }

      // Build count type filter
      const countTypeConditions: string[] = [];
      if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
      if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
      
      if (countTypeConditions.length === 0) {
        return { categories: [], series: [], totalsByYear: {} };
      }

      // Query data for each year in parallel
      const yearDataPromises = years.map(async (year) => {
        // Calculate effective time window (intersection of year bounds and date range)
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        const effectiveStart = new Date(Math.max(yearStart.getTime(), dateRange.start.getTime()));
        const effectiveEnd = new Date(Math.min(yearEnd.getTime(), dateRange.end.getTime()));
        
        // Skip if no overlap
        if (effectiveStart >= effectiveEnd) {
          return { year, data: [] };
        }

        // Query counts for this year's effective window
        const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
        const startDateStr = effectiveStart.toISOString().split('T')[0];
        const endDateStr = effectiveEnd.toISOString().split('T')[0];
        
        const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDateStr}' AND timestamp < DATE '${endDateStr}'`;

        const query = countsLayer.createQuery();
        query.where = whereClause;
        query.outFields = ["site_id", "timestamp", "count_type", "counts"];
        query.returnGeometry = false;

        const features = await this.queryAllFeaturesInParallel(countsLayer, query);
        const data = features.map(feature => feature.attributes);
        
        return { year, data };
      });

      const yearResults = await Promise.all(yearDataPromises);
      
      // Aggregate data by time scale for each year
      const aggregatedByYear = new Map<number, { name: string; value: number }[]>();
      const totalsByYear: Record<number, number> = {};

      yearResults.forEach(({ year, data }) => {
        const aggregated = this.aggregateByTimeScale(data, timeScale, normalization, scaleHourlyToDaily);
        aggregatedByYear.set(year, aggregated);
        totalsByYear[year] = aggregated.reduce((sum, item) => sum + item.value, 0);
      });

      // Build categories and series
      const allCategoryNames = new Set<string>();
      Array.from(aggregatedByYear.values()).forEach(yearData => {
        yearData.forEach(item => allCategoryNames.add(item.name));
      });

      const categories = this.sortCategoriesByTimeScale(Array.from(allCategoryNames), timeScale);
      
      // Build series for each year
      const series = years.map(year => {
        const yearData = aggregatedByYear.get(year) || [];
        const dataMap = new Map(yearData.map(item => [item.name, item.value]));
        
        const seriesData = categories.map(category => dataMap.get(category) || 0);
        
        return {
          name: year.toString(),
          data: seriesData
        };
      });

      return {
        categories,
        series,
        totalsByYear
      };

    } catch (error) {
      console.error('Error querying multi-year comparison data:', error);
      return { categories: [], series: [], totalsByYear: {} };
    }
  }

  /**
   * Sort categories by time scale
   */
  private static sortCategoriesByTimeScale(categories: string[], timeScale: TimeScale): string[] {
    switch (timeScale) {
      case 'Hour':
        return categories.sort((a, b) => parseInt(a) - parseInt(b));
      case 'Day':
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return categories.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      case 'Month':
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return categories.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
      case 'Year':
        return categories.sort((a, b) => parseInt(a) - parseInt(b));
      case 'Weekday vs Weekend':
        return categories.sort((a, b) => a === 'Weekday' ? -1 : 1);
      default:
        return categories;
    }
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