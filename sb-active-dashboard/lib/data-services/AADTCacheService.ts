/**
 * AADT Cache Service
 * Provides fast access to AADT data for count site popups and analysis
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

export interface AADTYearlyData {
  year: number;
  countType: 'bike' | 'ped';
  startDate: string;
  endDate: string;
  allAadt: number;
  weekdayAadt: number;
  weekendAadt: number;
}

export interface AADTCacheEntry {
  siteId: number;
  siteName: string;
  source: string;
  locality: string;
  yearlyData: AADTYearlyData[];
  firstSurvey: string;
  lastSurvey: string;
  availableCountTypes: ('bike' | 'ped')[];
  totalObservationPeriods: number;
}

export interface AADTSummaryStats {
  totalSites: number;
  sitesWithBikeData: number;
  sitesWithPedData: number;
  sitesWithBothData: number;
  earliestSurvey: string;
  latestSurvey: string;
  availableYears: number[];
}

export class AADTCacheService {
  private static instance: AADTCacheService;
  private cache = new Map<number, AADTCacheEntry>();
  private summaryStats: AADTSummaryStats | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  // Service URLs
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";
  private static readonly AADT_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2";

  private constructor() {}

  public static getInstance(): AADTCacheService {
    if (!AADTCacheService.instance) {
      AADTCacheService.instance = new AADTCacheService();
    }
    return AADTCacheService.instance;
  }

  /**
   * Initialize and populate the cache
   */
  public async initialize(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.loadAADTData();
    
    try {
      await this.loadPromise;
      this.isLoaded = true;
      console.log(`✅ AADT Cache initialized with ${this.cache.size} sites`);
    } catch (error) {
      console.error('❌ Failed to initialize AADT cache:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load all AADT data and populate cache
   */
  private async loadAADTData(): Promise<void> {
    const sitesLayer = new FeatureLayer({ url: AADTCacheService.SITES_URL });
    const aadtLayer = new FeatureLayer({ url: AADTCacheService.AADT_URL });

    try {
      // Query all sites
      const sitesQuery = sitesLayer.createQuery();
      sitesQuery.where = "1=1";
      sitesQuery.outFields = ["*"];
      sitesQuery.returnGeometry = false;

      const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
      console.log(`📊 Loading AADT data for ${sitesResult.features.length} sites...`);

      // Query all AADT data
      const aadtQuery = aadtLayer.createQuery();
      aadtQuery.where = "1=1";
      aadtQuery.outFields = ["*"];
      aadtQuery.returnGeometry = false;

      const aadtResult = await aadtLayer.queryFeatures(aadtQuery);
      console.log(`📊 Processing ${aadtResult.features.length} AADT records...`);

      // Group AADT data by site_id
      const aadtBySite = new Map<number, any[]>();
      aadtResult.features.forEach(feature => {
        const siteId = feature.attributes.site_id;
        if (!aadtBySite.has(siteId)) {
          aadtBySite.set(siteId, []);
        }
        aadtBySite.get(siteId)!.push(feature.attributes);
      });

      // Build cache entries
      const allYears = new Set<number>();
      let earliestSurvey = new Date();
      let latestSurvey = new Date(0);
      let sitesWithBike = 0;
      let sitesWithPed = 0;
      let sitesWithBoth = 0;

      sitesResult.features.forEach(siteFeature => {
        const siteId = siteFeature.attributes.id;
        const siteName = siteFeature.attributes.name || `Site ${siteId}`;
        const source = siteFeature.attributes.source || 'Unknown';
        const locality = siteFeature.attributes.locality || 'Unknown';

        const aadtRecords = aadtBySite.get(siteId) || [];
        
        if (aadtRecords.length === 0) {
          // Site with no AADT data - still cache basic info
          this.cache.set(siteId, {
            siteId,
            siteName,
            source,
            locality,
            yearlyData: [],
            firstSurvey: '',
            lastSurvey: '',
            availableCountTypes: [],
            totalObservationPeriods: 0
          });
          return;
        }

        // Process AADT records for this site
        const yearlyData: AADTYearlyData[] = [];
        const countTypes = new Set<'bike' | 'ped'>();
        let siteEarliest = new Date();
        let siteLatest = new Date(0);

        aadtRecords.forEach(record => {
          const year = record.year;
          const countType = record.count_type as 'bike' | 'ped';
          const startDate = record.start_date;
          const endDate = record.end_date;

          allYears.add(year);
          countTypes.add(countType);

          // Track date ranges
          if (startDate) {
            const start = new Date(startDate);
            if (start < siteEarliest) siteEarliest = start;
            if (start < earliestSurvey) earliestSurvey = start;
          }
          if (endDate) {
            const end = new Date(endDate);
            if (end > siteLatest) siteLatest = end;
            if (end > latestSurvey) latestSurvey = end;
          }

          yearlyData.push({
            year,
            countType,
            startDate: startDate || '',
            endDate: endDate || '',
            allAadt: record.all_aadt || 0,
            weekdayAadt: record.weekday_aadt || 0,
            weekendAadt: record.weekend_aadt || 0
          });
        });

        // Count sites by data type
        const hasB = countTypes.has('bike');
        const hasP = countTypes.has('ped');
        if (hasB) sitesWithBike++;
        if (hasP) sitesWithPed++;
        if (hasB && hasP) sitesWithBoth++;

        // Create cache entry
        this.cache.set(siteId, {
          siteId,
          siteName,
          source,
          locality,
          yearlyData,
          firstSurvey: siteEarliest.getTime() > 0 ? siteEarliest.toISOString() : '',
          lastSurvey: siteLatest.getTime() > 0 ? siteLatest.toISOString() : '',
          availableCountTypes: Array.from(countTypes),
          totalObservationPeriods: yearlyData.length
        });
      });

      // Build summary stats
      this.summaryStats = {
        totalSites: sitesResult.features.length,
        sitesWithBikeData: sitesWithBike,
        sitesWithPedData: sitesWithPed,
        sitesWithBothData: sitesWithBoth,
        earliestSurvey: earliestSurvey.getTime() > 0 ? earliestSurvey.toISOString() : '',
        latestSurvey: latestSurvey.getTime() > 0 ? latestSurvey.toISOString() : '',
        availableYears: Array.from(allYears).sort((a, b) => a - b)
      };

      console.log('📈 AADT Cache Summary:', this.summaryStats);

    } catch (error) {
      console.error('❌ Error loading AADT data:', error);
      throw error;
    }
  }

  /**
   * Get cached AADT data for a specific site
   */
  public getSiteData(siteId: number): AADTCacheEntry | null {
    if (!this.isLoaded) {
      console.warn('⚠️ AADT cache not loaded yet');
      return null;
    }
    return this.cache.get(siteId) || null;
  }

  /**
   * Get all cached site data
   */
  public getAllSites(): AADTCacheEntry[] {
    if (!this.isLoaded) {
      console.warn('⚠️ AADT cache not loaded yet');
      return [];
    }
    return Array.from(this.cache.values());
  }

  /**
   * Get summary statistics
   */
  public getSummaryStats(): AADTSummaryStats | null {
    return this.summaryStats;
  }

  /**
   * Check if cache is loaded
   */
  public isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get sites with data for specific count type and year
   */
  public getSitesForTypeAndYear(countType: 'bike' | 'ped', year: number): AADTCacheEntry[] {
    if (!this.isLoaded) return [];
    
    return Array.from(this.cache.values()).filter(site => 
      site.yearlyData.some(data => 
        data.countType === countType && data.year === year
      )
    );
  }

  /**
   * Get AADT value for specific site, type, and year
   */
  public getAADTValue(siteId: number, countType: 'bike' | 'ped', year: number, aadtType: 'all' | 'weekday' | 'weekend' = 'all'): number | null {
    const site = this.getSiteData(siteId);
    if (!site) return null;

    const yearData = site.yearlyData.find(data => 
      data.countType === countType && data.year === year
    );

    if (!yearData) return null;

    switch (aadtType) {
      case 'weekday': return yearData.weekdayAadt;
      case 'weekend': return yearData.weekendAadt;
      default: return yearData.allAadt;
    }
  }

  /**
   * Force refresh the cache
   */
  public async refresh(): Promise<void> {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.cache.clear();
    this.summaryStats = null;
    await this.initialize();
  }

  /**
   * Get cache size and status info
   */
  public getStatus(): { isLoaded: boolean; isLoading: boolean; cacheSize: number } {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      cacheSize: this.cache.size
    };
  }
}

// Export singleton instance
export const aadtCache = AADTCacheService.getInstance();
