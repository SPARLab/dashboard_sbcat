import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import { EnhancedAADVCalculationService, RawCountRecord as EnhancedRawCountRecord, EnhancedAADVConfig } from "../../src/lib/enhanced-aadv-calculations";

/**
 * Interface for AADV data per count site
 */
export interface SiteAADVData {
  siteId: number;
  siteName: string;
  aadv: number;
  bikeAADV: number;
  pedAADV: number;
}

/**
 * Interface for histogram bin data
 */
export interface HistogramBinData {
  binLabel: string;
  binMin: number;
  binMax: number;
  count: number;
  sites: SiteAADVData[];
}

/**
 * Interface for AADV histogram result
 */
export interface AADVHistogramResult {
  bins: HistogramBinData[];
  totalSites: number;
  minAADV: number;
  maxAADV: number;
  meanAADV: number;
  medianAADV: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Service for calculating AADV histograms for count sites
 */
export class AADVHistogramDataService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";
  private static readonly AADT_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2";

  /**
   * Query AADV histogram data for selected area using enhanced AADV calculation
   */
  static async queryAADVHistogram(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true,
    numberOfBins: number = 10
  ): Promise<AADVHistogramResult> {
    try {
      if (!selectedGeometry) {
        return this.getEmptyResult();
      }

      // Get AADV data using enhanced calculation with both Santa Cruz and NBPD factors
      const siteAADVs = await this.getAADVDataFromEnhancedCalculation(selectedGeometry, dateRange, showBicyclist, showPedestrian);

      // Filter out sites with no data
      const validSiteAADVs = siteAADVs.filter(site => site.aadv > 0);

      if (validSiteAADVs.length === 0) {
        return this.getEmptyResult();
      }

      // Create histogram bins
      const bins = this.createHistogramBins(validSiteAADVs, numberOfBins);

      // Calculate statistics
      const aadvValues = validSiteAADVs.map(site => site.aadv);
      const minAADV = Math.min(...aadvValues);
      const maxAADV = Math.max(...aadvValues);
      const meanAADV = aadvValues.reduce((sum, val) => sum + val, 0) / aadvValues.length;
      const sortedAADVs = [...aadvValues].sort((a, b) => a - b);
      const medianAADV = sortedAADVs[Math.floor(sortedAADVs.length / 2)];

      return {
        bins,
        totalSites: validSiteAADVs.length,
        minAADV,
        maxAADV,
        meanAADV,
        medianAADV,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying AADV histogram data:', error);
      return {
        bins: [],
        totalSites: 0,
        minAADV: 0,
        maxAADV: 0,
        meanAADV: 0,
        medianAADV: 0,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get AADV data using enhanced calculation with both Santa Cruz and NBPD factors
   * This replaces the old method that used pre-calculated AADT values
   */
  private static async getAADVDataFromEnhancedCalculation(
    selectedGeometry: Polygon,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean,
    showPedestrian: boolean
  ): Promise<SiteAADVData[]> {
    // First, query the Sites layer for sites within the polygon
    const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
    const sitesQuery = sitesLayer.createQuery();
    sitesQuery.geometry = selectedGeometry;
    sitesQuery.spatialRelationship = "intersects";
    sitesQuery.outFields = ["id", "name"];
    sitesQuery.returnGeometry = false;

    const sitesResults = await sitesLayer.queryFeatures(sitesQuery);
    
    if (sitesResults.features.length === 0) {
      return [];
    }

    // Get the site IDs and create metadata lookup
    const siteIds = sitesResults.features.map(feature => feature.attributes.id);
    const siteMetadata = sitesResults.features.reduce((acc, feature) => {
      acc[feature.attributes.id] = {
        id: feature.attributes.id,
        name: feature.attributes.name || `Site ${feature.attributes.id}`
      };
      return acc;
    }, {} as Record<number, {id: number, name: string}>);
    
    // Query raw count data for the date range
    const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
    
    // Build count type filter
    const countTypeConditions = [];
    if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
    if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
    
    if (countTypeConditions.length === 0) {
      return [];
    }

    // Format dates for query
    const startDateStr = dateRange.startDate.toISOString().split('T')[0];
    const endDateStr = dateRange.endDate.toISOString().split('T')[0];
    
    const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDateStr}' AND timestamp <= DATE '${endDateStr}'`;

    const countsQuery = countsLayer.createQuery();
    countsQuery.where = whereClause;
    countsQuery.outFields = ["site_id", "timestamp", "count_type", "counts"];
    countsQuery.returnGeometry = false;

    const countsResults = await countsLayer.queryFeatures(countsQuery);
    
    if (countsResults.features.length === 0) {
      return [];
    }

    // Convert to EnhancedRawCountRecord format
    const rawCountData: EnhancedRawCountRecord[] = countsResults.features.map(feature => ({
      site_id: feature.attributes.site_id,
      timestamp: feature.attributes.timestamp,
      counts: feature.attributes.counts || 0,
      count_type: feature.attributes.count_type as 'bike' | 'ped'
    }));

    // Use enhanced AADV calculation service with both Santa Cruz and NBPD factors
    const enhancedConfig: EnhancedAADVConfig = {
      showBicyclist,
      showPedestrian,
      santaCruzProfileKey: 'SantaCruz_citywide_v1',
      nbpdProfileKey: 'NBPD_PATH_moderate_2009'
    };

    const aadvResults = await EnhancedAADVCalculationService.calculateEnhancedAADV(
      rawCountData, 
      enhancedConfig
    );

    // Group results by site
    const aadvBySite = aadvResults.reduce((acc, result) => {
      const siteId = parseInt(result.siteYear.siteId);
      if (!acc[siteId]) {
        acc[siteId] = [];
      }
      acc[siteId].push(result);
      return acc;
    }, {} as Record<number, typeof aadvResults>);

    // Process each site's AADV data
    const siteAADVs: SiteAADVData[] = [];
    
    for (const siteId of siteIds) {
      const siteResults = aadvBySite[siteId] || [];
      const metadata = siteMetadata[siteId];
      
      if (siteResults.length === 0) {
        continue;
      }

      // Calculate average AADV across all years for this site
      const totalAADV = siteResults.reduce((sum, result) => sum + result.siteYear.aadv, 0) / siteResults.length;
      
      // For bike/ped breakdown, we need to calculate separately by filtering the original data
      let bikeAADV = 0;
      let pedAADV = 0;
      
      if (showBicyclist) {
        const bikeData = rawCountData.filter(record => 
          record.site_id === siteId && record.count_type === 'bike'
        );
        if (bikeData.length > 0) {
          const bikeConfig = { ...enhancedConfig, showPedestrian: false };
          const bikeResults = await EnhancedAADVCalculationService.calculateEnhancedAADV(bikeData, bikeConfig);
          bikeAADV = bikeResults.length > 0 
            ? bikeResults.reduce((sum, result) => sum + result.siteYear.aadv, 0) / bikeResults.length 
            : 0;
        }
      }
      
      if (showPedestrian) {
        const pedData = rawCountData.filter(record => 
          record.site_id === siteId && record.count_type === 'ped'
        );
        if (pedData.length > 0) {
          const pedConfig = { ...enhancedConfig, showBicyclist: false };
          const pedResults = await EnhancedAADVCalculationService.calculateEnhancedAADV(pedData, pedConfig);
          pedAADV = pedResults.length > 0 
            ? pedResults.reduce((sum, result) => sum + result.siteYear.aadv, 0) / pedResults.length 
            : 0;
        }
      }
      
      // Only include sites that have data for the selected count types
      if (totalAADV > 0) {
        siteAADVs.push({
          siteId,
          siteName: metadata?.name || `Site ${siteId}`,
          aadv: totalAADV,
          bikeAADV: bikeAADV,
          pedAADV: pedAADV
        });
      }
    }

    return siteAADVs;
  }



  /**
   * Format numbers for display (same as in AADTHistogram component)
   */
  private static formatNumber(value: number): string {
    if (value >= 1000000) {
      const formatted = (value / 1000000);
      return formatted % 1 === 0 ? `${formatted}M` : `${Math.round(formatted)}M`;
    } else if (value >= 1000) {
      const formatted = (value / 1000);
      return formatted % 1 === 0 ? `${formatted}K` : `${Math.round(formatted)}K`;
    }
    return Math.round(value).toString();
  }

  /**
   * Create histogram bins from AADV data
   */
  private static createHistogramBins(
    siteAADVs: SiteAADVData[],
    numberOfBins: number
  ): HistogramBinData[] {
    if (siteAADVs.length === 0) return [];

    const aadvValues = siteAADVs.map(site => site.aadv);
    const minAADV = Math.min(...aadvValues);
    const maxAADV = Math.max(...aadvValues);
    
    // Handle edge case where all values are the same
    if (minAADV === maxAADV) {
      return [{
        binLabel: this.formatNumber(minAADV),
        binMin: minAADV,
        binMax: maxAADV,
        count: siteAADVs.length,
        sites: siteAADVs
      }];
    }

    // Calculate bin width
    const range = maxAADV - minAADV;
    const binWidth = range / numberOfBins;

    // Create bins
    const bins: HistogramBinData[] = [];
    
    for (let i = 0; i < numberOfBins; i++) {
      const binMin = minAADV + (i * binWidth);
      const binMax = i === numberOfBins - 1 ? maxAADV : minAADV + ((i + 1) * binWidth);
      
      // Find sites that fall into this bin
      const sitesInBin = siteAADVs.filter(site => {
        return site.aadv >= binMin && (i === numberOfBins - 1 ? site.aadv <= binMax : site.aadv < binMax);
      });

      // Format bin label
      const binLabel = `${this.formatNumber(binMin)}-${this.formatNumber(binMax)}`;

      bins.push({
        binLabel,
        binMin,
        binMax,
        count: sitesInBin.length,
        sites: sitesInBin
      });
    }

    return bins;
  }

  /**
   * Return empty result structure
   */
  private static getEmptyResult(): AADVHistogramResult {
    return {
      bins: [],
      totalSites: 0,
      minAADV: 0,
      maxAADV: 0,
      meanAADV: 0,
      medianAADV: 0,
      isLoading: false,
      error: null
    };
  }

  /**
   * Get sites in a specific AADV range (for map highlighting)
   */
  static getSitesInAADVRange(
    histogramResult: AADVHistogramResult,
    binIndex: number
  ): SiteAADVData[] {
    if (!histogramResult.bins[binIndex]) {
      return [];
    }
    return histogramResult.bins[binIndex].sites;
  }

  /**
   * Get individual site data sorted by AADV for individual bar visualization
   */
  static async queryIndividualSiteAADV(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<{ sites: SiteAADVData[]; error: string | null }> {
    try {
      if (!selectedGeometry) {
        return { sites: [], error: null };
      }

      // Get AADV data using enhanced calculation with both Santa Cruz and NBPD factors
      const siteAADVs = await this.getAADVDataFromEnhancedCalculation(selectedGeometry, dateRange, showBicyclist, showPedestrian);

      // Filter out sites with no data and sort by AADV
      const validSiteAADVs = siteAADVs
        .filter(site => site.aadv > 0)
        .sort((a, b) => a.aadv - b.aadv); // Sort ascending for better visualization

      return { sites: validSiteAADVs, error: null };

    } catch (error) {
      console.error('Error querying individual site AADV data:', error);
      return { 
        sites: [], 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}
