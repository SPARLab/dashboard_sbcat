import { SiteYear } from "./year-over-year";

/**
 * Raw count record interface (from database queries)
 */
export interface RawCountRecord {
  site_id: number;
  timestamp: string;
  counts: number;
  count_type: 'bike' | 'ped';
}

/**
 * Enhanced AADV calculation result with detailed metadata
 */
export interface EnhancedAADVResult {
  siteYear: SiteYear;
  warnings: string[];
  method: 'enhanced-expansion' | 'fallback-raw';
  factorsUsed: {
    santaCruz: boolean;
    nbpd: boolean;
    hourlyFactorsApplied: number;
    dailyFactorsApplied: number;
    monthlyFactorsApplied: number;
  };
}

/**
 * Configuration for enhanced AADV calculations
 */
export interface EnhancedAADVConfig {
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  santaCruzProfileKey?: string;
  nbpdProfileKey?: string;
}

/**
 * Santa Cruz factors structure
 */
interface SantaCruzFactors {
  days: Record<string, Record<string, number>>; // month -> dayName -> factor
  months: Record<string, number>; // month -> factor
}

/**
 * NBPD factors structure
 */
interface NBPDFactors {
  hours: Record<string, Record<string, Record<string, number>>>; // month -> dayType -> hour -> factor
  days: Record<string, Record<string, number>>; // month -> dayName -> factor
  months: Record<string, number>; // month -> factor
}

/**
 * Combined factors index
 */
interface CombinedFactorsIndex {
  santaCruz: Record<string, SantaCruzFactors>;
  nbpd: Record<string, NBPDFactors>;
}

/**
 * Enhanced AADV Calculation Service
 * 
 * This service combines Santa Cruz expansion factors (for monthly and daily variations)
 * with NBPD factors (for hourly variations) to provide the most accurate AADV calculations.
 * 
 * Process:
 * 1. Apply NBPD hourly factors to normalize hourly fluctuations
 * 2. Apply Santa Cruz daily factors to normalize daily variations
 * 3. Apply Santa Cruz monthly factors to normalize monthly variations
 * 4. Result is a true Average Annual Daily Volume (AADV)
 */
export class EnhancedAADVCalculationService {
  private static factorsCache: CombinedFactorsIndex | null = null;

  /**
   * Calculate enhanced AADV for multiple sites and years
   */
  static async calculateEnhancedAADV(
    rawCountData: RawCountRecord[],
    config: EnhancedAADVConfig = {}
  ): Promise<EnhancedAADVResult[]> {
    const {
      showBicyclist = true,
      showPedestrian = true,
      santaCruzProfileKey = 'SantaCruz_citywide_v1',
      nbpdProfileKey = 'NBPD_PATH_moderate_2009'
    } = config;

    // Simplified logging - only show summary
    if (rawCountData.length === 0) {
      return [];
    }

    // Filter by count type
    const filteredData = rawCountData.filter(record => {
      if (record.count_type === 'bike' && !showBicyclist) return false;
      if (record.count_type === 'ped' && !showPedestrian) return false;
      return true;
    });

    if (filteredData.length === 0) {
      return [];
    }

    try {
      // Load both factor sets
      const factors = await this.ensureFactors();
      
      // Calculate AADV using enhanced method
      const results = await this.calculateWithEnhancedFactors(
        filteredData, 
        santaCruzProfileKey, 
        nbpdProfileKey, 
        factors
      );
      
      return results;
    } catch (error) {
      console.error('❌ Error in enhanced AADV calculation:', error);
      const fallbackResults = this.calculateFallbackAADV(filteredData);
      return fallbackResults;
    }
  }

  /**
   * Calculate AADV for a single site-year combination
   */
  static async calculateSingleSiteEnhancedAADV(
    siteId: string,
    year: number,
    rawCountData: RawCountRecord[],
    config: EnhancedAADVConfig = {}
  ): Promise<EnhancedAADVResult | null> {
    // Filter data for specific site and year
    const filteredData = rawCountData.filter(record => {
      const recordYear = new Date(record.timestamp).getUTCFullYear();
      return record.site_id.toString() === siteId && recordYear === year;
    });

    if (filteredData.length === 0) {
      return null;
    }

    const results = await this.calculateEnhancedAADV(filteredData, config);
    return results.find(result => 
      result.siteYear.siteId === siteId && result.siteYear.year === year
    ) || null;
  }

  /**
   * Get aggregated AADV for all sites in a year (for year-to-year comparison)
   */
  static async calculateAggregatedAADVForYear(
    rawCountData: RawCountRecord[],
    year: number,
    config: EnhancedAADVConfig = {}
  ): Promise<{ totalAADV: number; siteCount: number; warnings: string[] }> {
    // Filter data for specific year
    const yearData = rawCountData.filter(record => {
      const recordYear = new Date(record.timestamp).getUTCFullYear();
      return recordYear === year;
    });

    if (yearData.length === 0) {
      return { totalAADV: 0, siteCount: 0, warnings: ['No data for year ' + year] };
    }

    const results = await this.calculateEnhancedAADV(yearData, config);
    
    const totalAADV = results.reduce((sum, result) => sum + result.siteYear.aadv, 0);
    const allWarnings = results.flatMap(result => result.warnings);
    
    return {
      totalAADV,
      siteCount: results.length,
      warnings: Array.from(new Set(allWarnings)) // Remove duplicates
    };
  }

  /**
   * Load and cache both Santa Cruz and NBPD factors
   */
  private static async ensureFactors(): Promise<CombinedFactorsIndex> {
    if (!this.factorsCache) {
      const [santaCruzResponse, nbpdResponse] = await Promise.all([
        fetch("/factors/santa_cruz_factors.json"),
        fetch("/factors/nbpd_factors_moderate_2009.json")
      ]);

      if (!santaCruzResponse.ok) {
        throw new Error(`Failed to load Santa Cruz factors: ${santaCruzResponse.status}`);
      }
      if (!nbpdResponse.ok) {
        throw new Error(`Failed to load NBPD factors: ${nbpdResponse.status}`);
      }

      const [santaCruzData, nbpdData] = await Promise.all([
        santaCruzResponse.json(),
        nbpdResponse.json()
      ]);

      this.factorsCache = {
        santaCruz: santaCruzData,
        nbpd: nbpdData
      };
    }

    return this.factorsCache;
  }

  /**
   * Calculate AADV using enhanced method with both factor sets
   */
  private static async calculateWithEnhancedFactors(
    rawCountData: RawCountRecord[],
    santaCruzProfileKey: string,
    nbpdProfileKey: string,
    factors: CombinedFactorsIndex
  ): Promise<EnhancedAADVResult[]> {
    const santaCruzProfile = factors.santaCruz[santaCruzProfileKey];
    const nbpdProfile = factors.nbpd[nbpdProfileKey];

    if (!santaCruzProfile) {
      throw new Error(`Santa Cruz profile not found: ${santaCruzProfileKey}`);
    }
    if (!nbpdProfile) {
      throw new Error(`NBPD profile not found: ${nbpdProfileKey}`);
    }

    // Group data by site and year
    const siteYearGroups = this.groupBySiteYear(rawCountData);
    const results: EnhancedAADVResult[] = [];

    for (const [key, records] of Object.entries(siteYearGroups)) {
      const [siteId, year] = key.split('-');
      
      const result = this.calculateSiteYearAADV(
        records,
        siteId,
        parseInt(year),
        santaCruzProfile,
        nbpdProfile
      );
      
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate AADV for a single site-year using enhanced factors
   */
  private static calculateSiteYearAADV(
    records: RawCountRecord[],
    siteId: string,
    year: number,
    santaCruzProfile: SantaCruzFactors,
    nbpdProfile: NBPDFactors
  ): EnhancedAADVResult {
    const warnings: string[] = [];
    let totalExpandedVolume = 0;
    let validObservations = 0;
    
    const factorsUsed = {
      santaCruz: false,
      nbpd: false,
      hourlyFactorsApplied: 0,
      dailyFactorsApplied: 0,
      monthlyFactorsApplied: 0
    };

    // Group records by date to process daily totals
    const dailyGroups = this.groupByDate(records);

    for (const [dateStr, dayRecords] of Object.entries(dailyGroups)) {
      const date = new Date(dateStr);
      const month = date.getUTCMonth() + 1; // 1-12
      const dayName = this.getDayName(date);
      const dayType = this.getDayType(date);

      // Determine if we have full 24-hour coverage or partial hours
      const hourlyTotals = this.groupByHour(dayRecords);
      const hoursWithData = Object.keys(hourlyTotals).map(h => parseInt(h)).sort((a, b) => a - b);
      const hasFullDayCoverage = hoursWithData.length === 24 && 
                                hoursWithData[0] === 0 && 
                                hoursWithData[23] === 23;
      
      let dailyTotal = 0;

      if (hasFullDayCoverage) {
        // Case A: Full 24-hour day - use daily and monthly factors only
        // AADV = C × D_ij × M_j
        const totalDailyCounts = dayRecords.reduce((sum, record) => sum + (record.counts || 0), 0);
        
        // Apply Santa Cruz daily factor (D_ij)
        const dailyFactor = santaCruzProfile.days?.[month]?.[dayName];
        if (dailyFactor != null) {
          dailyTotal = totalDailyCounts * dailyFactor;
          factorsUsed.santaCruz = true;
          factorsUsed.dailyFactorsApplied++;
        } else {
          dailyTotal = totalDailyCounts;
          warnings.push(`No Santa Cruz daily factor for month=${month}, dayName=${dayName}`);
        }
      } else {
        // Case B: Partial hours - use proper traffic engineering methodology with p-values
        // Standard method: ADT = ∑(counts) / ∑(p_values) where p = 1/H
        // Then apply day-of-week and monthly factors to get AADV
        let totalCounts = 0;
        let totalPValues = 0;
        let validHours = 0;
        
        for (const [hourStr, hourRecords] of Object.entries(hourlyTotals)) {
          const hour = parseInt(hourStr);
          const hourlyCount = hourRecords.reduce((sum, record) => sum + (record.counts || 0), 0);
          
          // Get NBPD hourly expansion factor (H)
          const hourlyExpansionFactor = nbpdProfile.hours?.[month]?.[dayType]?.[hour];
          if (hourlyExpansionFactor != null && hourlyExpansionFactor > 0) {
            // Calculate p-value: p = 1/H
            const pValue = 1.0 / hourlyExpansionFactor;
            
            totalCounts += hourlyCount;
            totalPValues += pValue;
            validHours++;
            factorsUsed.nbpd = true;
            factorsUsed.hourlyFactorsApplied++;
          } else {
            // No hourly factor available - this is expected for hours 0-5 and 22-23
            // Only log warning if it's during expected hours (6-21)
            if (hour >= 6 && hour <= 21) {
              warnings.push(`No valid NBPD hourly factor for month=${month}, dayType=${dayType}, hour=${hour} (factor=${hourlyExpansionFactor})`);
            }
          }
        }
        
        // Calculate ADT using proper methodology
        if (validHours > 0 && totalPValues > 0) {
          // ADT = ∑counts / ∑p_values
          const adt = totalCounts / totalPValues;
          
          // Apply Santa Cruz daily factor to convert ADT to MADT (Month's Average Daily Traffic)
          const dailyFactor = santaCruzProfile.days?.[month]?.[dayName];
          if (dailyFactor != null) {
            dailyTotal = adt * dailyFactor;
            factorsUsed.santaCruz = true;
            factorsUsed.dailyFactorsApplied++;
          } else {
            dailyTotal = adt;
            warnings.push(`No Santa Cruz daily factor for month=${month}, dayName=${dayName}`);
          }
        } else {
          // Fallback: if no hourly factors available, sum raw counts (not ideal)
          dailyTotal = Object.values(hourlyTotals).flat().reduce((sum, record) => sum + (record.counts || 0), 0);
          warnings.push(`Fallback to raw count sum due to missing hourly factors (validHours=${validHours}, totalPValues=${totalPValues})`);
        }
      }

      // Apply Santa Cruz monthly factor (M_j) - always applied regardless of case
      const monthlyFactor = santaCruzProfile.months?.[month];
      if (monthlyFactor != null) {
        dailyTotal *= monthlyFactor;
        factorsUsed.santaCruz = true;
        factorsUsed.monthlyFactorsApplied++;
      } else {
        warnings.push(`No Santa Cruz monthly factor for month=${month}`);
      }

      totalExpandedVolume += dailyTotal;
      validObservations++;
    }
    
    // Calculate AADV (each day's expanded volume represents the annual average daily volume)
    // We take the average of the expanded daily volumes as each represents an AADV estimate
    const aadv = validObservations > 0 ? totalExpandedVolume / validObservations : 0;

    return {
      siteYear: {
        siteId,
        year,
        aadv: Math.round(aadv * 100) / 100 // Round to 2 decimal places
      },
      warnings,
      method: 'enhanced-expansion',
      factorsUsed
    };
  }

  /**
   * Fallback AADV calculation using simple raw aggregation
   */
  private static calculateFallbackAADV(rawCountData: RawCountRecord[]): EnhancedAADVResult[] {
    const siteYearGroups = this.groupBySiteYear(rawCountData);
    
    return Object.entries(siteYearGroups).map(([key, records]) => {
      const [siteId, year] = key.split('-');
      const totalCounts = records.reduce((sum, record) => sum + (record.counts || 0), 0);
      const avgHourly = records.length > 0 ? totalCounts / records.length : 0;
      const aadv = avgHourly * 24; // Scale hourly to daily

      return {
        siteYear: {
          siteId,
          year: parseInt(year),
          aadv: Math.round(aadv * 100) / 100
        },
        warnings: [
          'Using fallback raw aggregation method',
          `Limited data: ${records.length} observations for site ${siteId} in ${year}`
        ],
        method: 'fallback-raw',
        factorsUsed: {
          santaCruz: false,
          nbpd: false,
          hourlyFactorsApplied: 0,
          dailyFactorsApplied: 0,
          monthlyFactorsApplied: 0
        }
      };
    });
  }

  // Helper methods

  private static groupBySiteYear(records: RawCountRecord[]): Record<string, RawCountRecord[]> {
    const groups: Record<string, RawCountRecord[]> = {};
    
    records.forEach(record => {
      const year = new Date(record.timestamp).getUTCFullYear();
      const key = `${record.site_id}-${year}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });
    
    return groups;
  }

  private static groupByDate(records: RawCountRecord[]): Record<string, RawCountRecord[]> {
    const groups: Record<string, RawCountRecord[]> = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
    });
    
    return groups;
  }

  private static groupByHour(records: RawCountRecord[]): Record<string, RawCountRecord[]> {
    const groups: Record<string, RawCountRecord[]> = {};
    
    records.forEach(record => {
      const hour = new Date(record.timestamp).getUTCHours().toString();
      
      if (!groups[hour]) {
        groups[hour] = [];
      }
      groups[hour].push(record);
    });
    
    return groups;
  }

  private static getDayName(date: Date): string {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return dayNames[date.getUTCDay()];
  }

  private static getDayType(date: Date): string {
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
    // NBPD factors use "weekday" and "weekend" (not "saturday"/"sunday")
    if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";
    return "weekday";
  }

  /**
   * Get just the SiteYear data (for backward compatibility)
   */
  static async getSiteYearData(
    rawCountData: RawCountRecord[],
    config: EnhancedAADVConfig = {}
  ): Promise<SiteYear[]> {
    const results = await this.calculateEnhancedAADV(rawCountData, config);
    return results.map(result => result.siteYear);
  }

  /**
   * Validate enhanced AADV calculation results
   */
  static validateEnhancedAADVResults(results: EnhancedAADVResult[]): {
    valid: EnhancedAADVResult[];
    invalid: EnhancedAADVResult[];
    warnings: string[];
  } {
    const valid: EnhancedAADVResult[] = [];
    const invalid: EnhancedAADVResult[] = [];
    const warnings: string[] = [];

    results.forEach(result => {
      const { aadv } = result.siteYear;
      
      // Check for valid AADV values
      if (isNaN(aadv) || !isFinite(aadv) || aadv < 0) {
        invalid.push(result);
        warnings.push(`Invalid AADV value for site ${result.siteYear.siteId} in ${result.siteYear.year}: ${aadv}`);
      } else if (aadv === 0) {
        valid.push(result);
        warnings.push(`Zero AADV value for site ${result.siteYear.siteId} in ${result.siteYear.year}`);
      } else {
        valid.push(result);
      }

      // Add method-specific warnings
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }
    });

    return { valid, invalid, warnings };
  }
}
