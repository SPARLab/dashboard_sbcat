import { loadProfiles, ProfilesIndex } from "./factors";
import { expandToAADX, ShortRecord } from "./nbpdExpand";
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
 * AADV calculation result with metadata
 */
export interface AADVCalculationResult {
  siteYear: SiteYear;
  warnings: string[];
  method: 'nbpd-expansion' | 'raw-aggregation';
}

/**
 * Configuration for AADV calculations
 */
export interface AADVCalculationConfig {
  nbpdProfileKey?: string;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  scalingFactor?: number; // For raw aggregation (default: 24 for hourly to daily)
}

/**
 * Centralized service for calculating Average Annual Daily Volume (AADV)
 * 
 * Provides consistent AADV calculations across the entire application using:
 * 1. NBPD expansion with Santa Cruz factors (preferred method)
 * 2. Raw data aggregation (fallback method)
 */
export class AADVCalculationService {
  private static profilesCache: ProfilesIndex | null = null;

  /**
   * Calculate AADV for multiple sites and years using the best available method
   * 
   * @param rawCountData - Raw count records from database
   * @param config - Configuration options
   * @returns Array of AADV calculations with metadata
   */
  static async calculateAADV(
    rawCountData: RawCountRecord[],
    config: AADVCalculationConfig = {}
  ): Promise<AADVCalculationResult[]> {
    const {
      nbpdProfileKey,
      showBicyclist = true,
      showPedestrian = true,
      scalingFactor = 24
    } = config;

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

    // Use NBPD expansion if profile key is provided
    if (nbpdProfileKey) {
      return await this.calculateAADVWithExpansion(filteredData, nbpdProfileKey);
    } else {
      return this.calculateAADVFromRawCounts(filteredData, scalingFactor);
    }
  }

  /**
   * Calculate AADV using NBPD expansion with Santa Cruz factors (preferred method)
   * 
   * @param rawCountData - Raw count records
   * @param profileKey - NBPD profile key (e.g., 'SantaCruz_citywide_v1')
   * @returns AADV calculations using expansion factors
   */
  static async calculateAADVWithExpansion(
    rawCountData: RawCountRecord[],
    profileKey: string
  ): Promise<AADVCalculationResult[]> {
    try {
      // Convert to ShortRecord format for NBPD expansion
      const shortRecords = this.convertToShortRecords(rawCountData);
      
      // Apply NBPD expansion
      const aadxData = await this.mapRecordsToAADX(shortRecords, profileKey);
      
      // Convert to result format
      return aadxData.map(record => ({
        siteYear: {
          siteId: record.siteId,
          year: record.year,
          aadv: record.aadx
        },
        warnings: record.warnings,
        method: 'nbpd-expansion' as const
      }));
    } catch (error) {
      console.error('Error in NBPD expansion AADV calculation:', error);
      // Fallback to raw aggregation
      return this.calculateAADVFromRawCounts(rawCountData, 24);
    }
  }

  /**
   * Calculate AADV using simple raw count aggregation (fallback method)
   * 
   * @param rawCountData - Raw count records
   * @param scalingFactor - Factor to scale hourly counts to daily (default: 24)
   * @returns AADV calculations using simple averaging
   */
  static calculateAADVFromRawCounts(
    rawCountData: RawCountRecord[],
    scalingFactor: number = 24
  ): AADVCalculationResult[] {
    // Group by site and year
    const siteYearAggregation: { 
      [key: string]: { 
        siteId: string; 
        year: number; 
        total: number; 
        count: number; 
      } 
    } = {};

    rawCountData.forEach(record => {
      const year = new Date(record.timestamp).getUTCFullYear();
      const key = `${record.site_id}-${year}`;
      
      if (!siteYearAggregation[key]) {
        siteYearAggregation[key] = {
          siteId: record.site_id.toString(),
          year,
          total: 0,
          count: 0
        };
      }
      
      siteYearAggregation[key].total += record.counts || 0;
      siteYearAggregation[key].count += 1;
    });

    // Calculate AADV for each site-year combination
    return Object.values(siteYearAggregation).map(data => {
      const avgHourly = data.count > 0 ? data.total / data.count : 0;
      const aadv = avgHourly * scalingFactor;

      return {
        siteYear: {
          siteId: data.siteId,
          year: data.year,
          aadv
        },
        warnings: data.count < 24 ? [`Limited data: only ${data.count} observations for site ${data.siteId} in ${data.year}`] : [],
        method: 'raw-aggregation' as const
      };
    });
  }

  /**
   * Get just the SiteYear data (for backward compatibility)
   */
  static async getSiteYearData(
    rawCountData: RawCountRecord[],
    config: AADVCalculationConfig = {}
  ): Promise<SiteYear[]> {
    const results = await this.calculateAADV(rawCountData, config);
    return results.map(result => result.siteYear);
  }

  /**
   * Calculate AADV for a single site-year combination
   */
  static async calculateSingleSiteAADV(
    siteId: string,
    year: number,
    rawCountData: RawCountRecord[],
    config: AADVCalculationConfig = {}
  ): Promise<AADVCalculationResult | null> {
    // Filter data for specific site and year
    const filteredData = rawCountData.filter(record => {
      const recordYear = new Date(record.timestamp).getUTCFullYear();
      return record.site_id.toString() === siteId && recordYear === year;
    });

    if (filteredData.length === 0) {
      return null;
    }

    const results = await this.calculateAADV(filteredData, config);
    return results.find(result => 
      result.siteYear.siteId === siteId && result.siteYear.year === year
    ) || null;
  }

  // Private helper methods (extracted from YearToYearComparisonDataService)

  /**
   * Ensure NBPD profiles are loaded
   */
  private static async ensureProfiles(): Promise<ProfilesIndex> {
    if (!this.profilesCache) {
      this.profilesCache = await loadProfiles();
    }
    return this.profilesCache;
  }

  /**
   * Convert raw count records to ShortRecord format for NBPD expansion
   */
  private static convertToShortRecords(countsData: RawCountRecord[]): ShortRecord[] {
    // Group by site-date-mode-context
    const grouped: { [key: string]: { 
      siteId: string; 
      mode: "bike" | "ped"; 
      context: "PATH" | "PED"; 
      date: string; 
      hours: Array<{ hour: number; count: number }>;
    } } = {};

    countsData.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const date = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = timestamp.getHours();
      const mode = record.count_type;
      const context = mode === "bike" ? "PATH" : "PED";
      const key = `${record.site_id}-${date}-${mode}-${context}`;

      if (!grouped[key]) {
        grouped[key] = {
          siteId: record.site_id.toString(),
          mode,
          context,
          date,
          hours: []
        };
      }

      grouped[key].hours.push({
        hour,
        count: record.counts || 0
      });
    });

    // Convert to ShortRecord format
    return Object.values(grouped);
  }

  /**
   * Map short records to AADX using NBPD expansion
   */
  private static async mapRecordsToAADX(
    records: ShortRecord[],
    profileKey: string
  ): Promise<Array<{ siteId: string; year: number; aadx: number; warnings: string[] }>> {
    const profiles = await this.ensureProfiles();
    
    return records.map(record => {
      const { aadx, warnings } = expandToAADX(record, profileKey, profiles);
      const year = new Date(record.date).getUTCFullYear();
      
      return {
        siteId: record.siteId,
        year,
        aadx,
        warnings
      };
    });
  }

  /**
   * Validate AADV calculation results
   */
  static validateAADVResults(results: AADVCalculationResult[]): {
    valid: AADVCalculationResult[];
    invalid: AADVCalculationResult[];
    warnings: string[];
  } {
    const valid: AADVCalculationResult[] = [];
    const invalid: AADVCalculationResult[] = [];
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
