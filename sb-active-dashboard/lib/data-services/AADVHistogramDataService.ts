import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import { EnhancedAADVCalculationService, RawCountRecord as EnhancedRawCountRecord, EnhancedAADVConfig } from "../../src/lib/enhanced-aadv-calculations";
import { queryDeduplicator, QueryDeduplicator } from "../utilities/shared/QueryDeduplicator";

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
    if (!selectedGeometry) {
      return this.getEmptyResult();
    }

    const cacheKey = QueryDeduplicator.generateGeometryKey(
      'aadv-histogram',
      selectedGeometry,
      {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        showBicyclist,
        showPedestrian,
        numberOfBins
      }
    );

    return queryDeduplicator.deduplicate(cacheKey, async () => {
      try {

      // Get AADV data using enhanced calculation with both Santa Cruz and NBPD factors
      const siteAADVs = await this.getAADVDataFromEnhancedCalculation(selectedGeometry, dateRange, showBicyclist, showPedestrian);

      // Filter out sites with no data
      const validSiteAADVs = siteAADVs.filter(site => site.aadv > 0);

      if (validSiteAADVs.length === 0) {
        console.warn('❌ No sites with AADV > 0 - all sites have zero values');
        // Still return the zero-value sites for consistency with Sparkline behavior
        // The histogram will show all sites at zero
        const bins = [{
          binLabel: '0',
          binMin: 0,
          binMax: 0,
          count: siteAADVs.length,
          sites: siteAADVs
        }];
        
        return {
          bins,
          totalSites: siteAADVs.length,
          minAADV: 0,
          maxAADV: 0,
          meanAADV: 0,
          medianAADV: 0,
          isLoading: false,
          error: null
        };
      }

      // Create histogram bins (only for sites with AADV > 0)
      const bins = this.createHistogramBins(validSiteAADVs, numberOfBins);

      // Calculate statistics (only for sites with AADV > 0)
      const aadvValues = validSiteAADVs.map(site => site.aadv);
      const minAADV = Math.min(...aadvValues);
      const maxAADV = Math.max(...aadvValues);
      const meanAADV = aadvValues.reduce((sum, val) => sum + val, 0) / aadvValues.length;
      const sortedAADVs = [...aadvValues].sort((a, b) => a - b);
      const medianAADV = sortedAADVs[Math.floor(sortedAADVs.length / 2)];

      return {
        bins,
        totalSites: siteAADVs.length, // SPARKLINE BEHAVIOR: Report total sites including zeros
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
    });
  }

  /**
   * Helper method to query all features from a layer in parallel, bypassing record limits.
   * Copied from VolumeChartDataService to ensure consistent behavior.
   */
  private static async queryAllFeaturesInParallel(layer: __esri.FeatureLayer, query: __esri.Query): Promise<__esri.Graphic[]> {
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
    // Sites layer uses 'id' field (consistent with VolumeChartDataService)
    const siteIds = sitesResults.features.map(feature => feature.attributes.id);
    
    const siteMetadata = sitesResults.features.reduce((acc, feature) => {
      const siteId = feature.attributes.id;
      acc[siteId] = {
        id: siteId,
        name: feature.attributes.name || `Site ${siteId}`
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

    // Use paginated query to handle large result sets (like VolumeChartDataService)
    const countsResultFeatures = await this.queryAllFeaturesInParallel(countsLayer, countsQuery);
    

    
    if (countsResultFeatures.length === 0) {
      return [];
    }

    // Log count data distribution by site
    const countsBySite = countsResultFeatures.reduce((acc, feature) => {
      const siteId = feature.attributes.site_id;
      if (!acc[siteId]) acc[siteId] = 0;
      acc[siteId]++;
      return acc;
    }, {} as Record<number, number>);
    
    // Check what site IDs are actually in the count data
    const actualSiteIdsInCountData = Array.from(new Set(countsResultFeatures.map(f => f.attributes.site_id)));
    
    // Check for sites that were queried but have no data
    const queriedSiteIds = new Set(siteIds);
    const sitesWithDataIds = new Set(Object.keys(countsBySite).map(id => parseInt(id)));
    const queriedButNoData = Array.from(queriedSiteIds).filter(id => !sitesWithDataIds.has(id));
    
    // Identify sites with no count data (keep warnings for important data issues)
    const sitesWithoutData = siteIds.filter(siteId => !countsBySite[siteId]);
    if (sitesWithoutData.length > 0) {
      // Show first few examples as warnings (important for debugging data issues)
      const examples = sitesWithoutData.slice(0, 3);
      examples.forEach(siteId => {
        const siteName = siteMetadata[siteId]?.name || `Site ${siteId}`;
        console.warn(`⚠️ Site ${siteId} (${siteName}): No count records in date range`);
      });
    }

    // Convert to EnhancedRawCountRecord format
    const rawCountData: EnhancedRawCountRecord[] = countsResultFeatures.map(feature => ({
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

    // Check which sites got AADV results vs which sites had raw count data
    const sitesWithAADVResults = new Set(aadvResults.map(result => parseInt(result.siteYear.siteId)));
    const sitesWithRawCountData = new Set(Object.keys(countsBySite).map(id => parseInt(id)));
    
    // Check for critical issues (keep warnings for important problems)
    const rawDataButNoAADV = Array.from(sitesWithRawCountData).filter(id => !sitesWithAADVResults.has(id));
    if (rawDataButNoAADV.length > 0) {
      console.warn(`⚠️ CRITICAL: Sites with raw data but NO AADV results: ${rawDataButNoAADV.length} sites`);
    }
    
    const aadvButNoRawData = Array.from(sitesWithAADVResults).filter(id => !sitesWithRawCountData.has(id));
    if (aadvButNoRawData.length > 0) {
      console.warn(`⚠️ CRITICAL: Sites with AADV results but NO raw count data: ${aadvButNoRawData.length} sites`);
    }

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
    const sitesWithoutAADVResults: number[] = [];
    const sitesWithZeroAADV: number[] = [];
    
    // SPARKLINE BEHAVIOR: Include ALL sites from spatial query, like the Sparkline component
    // Sites without count data will have zero AADV values

    for (const siteId of siteIds) {
      const siteResults = aadvBySite[siteId];
      // Get metadata from spatial query if available, otherwise create basic metadata
      const metadata = siteMetadata[siteId] || { 
        id: siteId, 
        name: `Site ${siteId}` 
      };

      // Calculate average AADV across all years for this site
      // If no AADV results, assign zero (like sites without count data in Sparkline)
      const totalAADV = siteResults ? 
        siteResults.reduce((sum, result) => sum + result.siteYear.aadv, 0) / siteResults.length : 
        0;
      
      // For bike/ped breakdown, we need to calculate separately by filtering the original data
      // Only calculate if site has AADV results, otherwise leave as zero
      let bikeAADV = 0;
      let pedAADV = 0;
      
      if (siteResults && showBicyclist) {
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
      
      if (siteResults && showPedestrian) {
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
      

      
      // SPARKLINE BEHAVIOR: Include ALL sites, even those with zero AADV
      siteAADVs.push({
        siteId,
        siteName: metadata?.name || `Site ${siteId}`,
        aadv: totalAADV,
        bikeAADV: bikeAADV,
        pedAADV: pedAADV
      });
      
      // Track sites with zero AADV for logging
      if (totalAADV === 0) {
        sitesWithZeroAADV.push(siteId);
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
   * Compare AADV Histogram data processing with HighestVolume component
   * This method helps debug why different components show different numbers of sites
   */
  static async compareWithHighestVolumeComponent(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<{
    aadvHistogramSites: SiteAADVData[];
    highestVolumeSites: any[];
    comparison: {
      aadvHistogramCount: number;
      highestVolumeCount: number;
      commonSites: number[];
      onlyInAADVHistogram: number[];
      onlyInHighestVolume: number[];
      processingDifferences: string[];
    };
  }> {
    console.group('🔍 Component Comparison: AADV Histogram vs Highest Volume');
    
    try {
      // Get data from AADV Histogram approach
      console.log('📊 Getting data from AADV Histogram approach...');
      const aadvHistogramSites = await this.getAADVDataFromEnhancedCalculation(
        selectedGeometry!,
        dateRange,
        showBicyclist,
        showPedestrian
      );

      // Get data from Highest Volume approach (using CountSiteProcessingService)
      console.log('📈 Getting data from Highest Volume approach...');
      const { CountSiteProcessingService } = await import('../utilities/volume-utils/count-site-processing');
      const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
      const aadtLayer = new FeatureLayer({ url: this.AADT_URL });
      
      // Create a mock MapView for the CountSiteProcessingService
      const mockMapView = {
        extent: selectedGeometry?.extent,
        spatialReference: selectedGeometry?.spatialReference
      } as any;

      const highestVolumeSites = await CountSiteProcessingService.getHighestVolumeSites(
        sitesLayer,
        aadtLayer,
        mockMapView,
        { showBicyclist, showPedestrian },
        dateRange,
        100, // Get all sites, not just top 5
        selectedGeometry
      );

      // Compare the results
      const aadvHistogramSiteIds = aadvHistogramSites.map(s => s.siteId);
      const highestVolumeSiteIds = highestVolumeSites.map(s => s.siteId);
      
      const commonSites = aadvHistogramSiteIds.filter(id => highestVolumeSiteIds.includes(id));
      const onlyInAADVHistogram = aadvHistogramSiteIds.filter(id => !highestVolumeSiteIds.includes(id));
      const onlyInHighestVolume = highestVolumeSiteIds.filter(id => !aadvHistogramSiteIds.includes(id));

      const processingDifferences = [
        'AADV Histogram uses AADVHistogramDataService.getAADVDataFromEnhancedCalculation()',
        'Highest Volume uses CountSiteProcessingService.getHighestVolumeSites()',
        'Both use enhanced AADV calculation but may have different filtering logic',
        'AADV Histogram filters sites with aadv <= 0 at multiple stages',
        'Highest Volume may have different site inclusion criteria'
      ];

      const comparison = {
        aadvHistogramCount: aadvHistogramSites.length,
        highestVolumeCount: highestVolumeSites.length,
        commonSites,
        onlyInAADVHistogram,
        onlyInHighestVolume,
        processingDifferences
      };

      console.log('📊 Comparison Results:');
      console.log(`  AADV Histogram sites: ${comparison.aadvHistogramCount}`);
      console.log(`  Highest Volume sites: ${comparison.highestVolumeCount}`);
      console.log(`  Common sites: ${comparison.commonSites.length} [${comparison.commonSites.join(', ')}]`);
      console.log(`  Only in AADV Histogram: ${comparison.onlyInAADVHistogram.length} [${comparison.onlyInAADVHistogram.join(', ')}]`);
      console.log(`  Only in Highest Volume: ${comparison.onlyInHighestVolume.length} [${comparison.onlyInHighestVolume.join(', ')}]`);

      console.groupEnd();
      return {
        aadvHistogramSites,
        highestVolumeSites,
        comparison
      };

    } catch (error) {
      console.error('❌ Error in component comparison:', error);
      console.groupEnd();
      throw error;
    }
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

  /**
   * Compare AADV Histogram with Sparkline Timeline to identify the 350 vs 32 sites discrepancy
   */
  static async compareWithSparklineTimeline(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<void> {
    if (!selectedGeometry) {
      console.error('❌ No geometry provided for comparison');
      return;
    }

    console.group('🔍 SPARKLINE vs AADV HISTOGRAM COMPARISON');
    console.log('🎯 Investigating: 350 active sites (Sparkline) vs 32 sites (AADV Histogram)');
    
    try {
      // Step 1: Replicate Sparkline Timeline query logic
      console.log('\n📊 Step 1: Replicating Sparkline Timeline Logic...');
      
      const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });

      // Query sites in polygon (same as Sparkline)
      const sitesQuery = sitesLayer.createQuery();
      sitesQuery.geometry = selectedGeometry;
      sitesQuery.spatialRelationship = "intersects";
      sitesQuery.outFields = ["id", "name"];
      sitesQuery.returnGeometry = false;

      const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
      console.log(`📍 Sites in polygon: ${sitesResult.features.length}`);

      // Query count data for these sites (same as Sparkline)
      const siteIds = sitesResult.features.map(f => f.attributes.id);
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];
      
      const sparklineCountsQuery = countsLayer.createQuery();
      sparklineCountsQuery.where = `site_id IN (${siteIds.join(',')}) AND timestamp >= DATE '${startDate}' AND timestamp <= DATE '${endDate}'`;
      sparklineCountsQuery.outFields = ["site_id", "timestamp"];
      sparklineCountsQuery.returnGeometry = false;

      const sparklineCountsResult = await countsLayer.queryFeatures(sparklineCountsQuery);
      console.log(`📊 Total count records (Sparkline logic): ${sparklineCountsResult.features.length}`);

      // Group by site to find sites with data
      const sparklineSitesWithData = sparklineCountsResult.features.reduce((acc, feature) => {
        const siteId = feature.attributes.site_id;
        if (!acc[siteId]) acc[siteId] = 0;
        acc[siteId]++;
        return acc;
      }, {} as Record<number, number>);

      const sparklineActiveSites = Object.keys(sparklineSitesWithData).map(id => parseInt(id));
      console.log(`✅ Sites with data (Sparkline logic): ${sparklineActiveSites.length}`);
      console.log(`📋 Sparkline active sites: [${sparklineActiveSites.slice(0, 20).join(', ')}${sparklineActiveSites.length > 20 ? '...' : ''}]`);

      // Step 2: Run AADV Histogram logic
      console.log('\n📊 Step 2: Running AADV Histogram Logic...');
      const aadvSites = await this.getAADVDataFromEnhancedCalculation(
        selectedGeometry,
        dateRange,
        showBicyclist,
        showPedestrian
      );

      const aadvActiveSites = aadvSites.map(s => s.siteId);
      console.log(`✅ Sites with AADV data: ${aadvActiveSites.length}`);
      console.log(`📋 AADV active sites: [${aadvActiveSites.slice(0, 20).join(', ')}${aadvActiveSites.length > 20 ? '...' : ''}]`);

      // Step 3: Detailed comparison
      console.log('\n🔍 Step 3: Detailed Comparison Analysis...');
      
      const commonSites = sparklineActiveSites.filter(id => aadvActiveSites.includes(id));
      const onlyInSparkline = sparklineActiveSites.filter(id => !aadvActiveSites.includes(id));
      const onlyInAADV = aadvActiveSites.filter(id => !sparklineActiveSites.includes(id));

      console.log(`🤝 Common sites: ${commonSites.length}`);
      console.log(`📊 Only in Sparkline: ${onlyInSparkline.length}`);
      console.log(`📈 Only in AADV: ${onlyInAADV.length}`);

      // Step 4: Analyze the missing sites
      if (onlyInSparkline.length > 0) {
        console.log('\n🔍 Step 4: Analyzing sites that appear in Sparkline but NOT in AADV...');
        
        // Sample first 10 missing sites for detailed analysis
        const samplesToAnalyze = onlyInSparkline.slice(0, 10);
        console.log(`🔬 Analyzing sample of ${samplesToAnalyze.length} missing sites: [${samplesToAnalyze.join(', ')}]`);

        for (const siteId of samplesToAnalyze) {
          const siteName = sitesResult.features.find(f => f.attributes.id === siteId)?.attributes.name || `Site ${siteId}`;
          const recordCount = sparklineSitesWithData[siteId];
          
          console.log(`\n🔍 Site ${siteId} (${siteName}): ${recordCount} records in Sparkline`);

          // Check AADV-specific filtering
          const countTypeConditions = [];
          if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
          if (showPedestrian) countTypeConditions.push("count_type = 'ped'");

          const aadvCountsQuery = countsLayer.createQuery();
          aadvCountsQuery.where = `site_id = ${siteId} AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDate}' AND timestamp <= DATE '${endDate}'`;
          aadvCountsQuery.outFields = ["site_id", "timestamp", "count_type", "counts"];
          aadvCountsQuery.returnGeometry = false;

          const aadvCountsResult = await countsLayer.queryFeatures(aadvCountsQuery);
          console.log(`  📊 Records with count_type filter: ${aadvCountsResult.features.length}`);

          if (aadvCountsResult.features.length > 0) {
            const countsByType = aadvCountsResult.features.reduce((acc, f) => {
              const type = f.attributes.count_type;
              if (!acc[type]) acc[type] = 0;
              acc[type]++;
              return acc;
            }, {} as Record<string, number>);
            
            console.log(`  🚲 Bike records: ${countsByType.bike || 0}`);
            console.log(`  👟 Ped records: ${countsByType.ped || 0}`);
            
            const totalCounts = aadvCountsResult.features.reduce((sum, f) => sum + (f.attributes.counts || 0), 0);
            const avgCount = totalCounts / aadvCountsResult.features.length;
            console.log(`  📈 Total counts: ${totalCounts}, Avg: ${avgCount.toFixed(2)}`);
            
            if (avgCount === 0) {
              console.log(`  ❌ ISSUE: All count values are zero - site filtered out`);
            }
          } else {
            console.log(`  ❌ ISSUE: No records match AADV count_type filter`);
          }
        }
      }

      // Step 5: Summary and recommendations
      console.log('\n💡 Step 5: Analysis Summary & Recommendations...');
      
      const discrepancyPercentage = ((onlyInSparkline.length / sparklineActiveSites.length) * 100).toFixed(1);
      console.log(`📊 Discrepancy: ${onlyInSparkline.length}/${sparklineActiveSites.length} sites (${discrepancyPercentage}%) missing from AADV`);

      if (onlyInSparkline.length > sparklineActiveSites.length * 0.5) {
        console.warn('🚨 MAJOR ISSUE: >50% of sites missing from AADV calculation');
        console.warn('Likely causes:');
        console.warn('  1. Count type filtering too restrictive (bike AND ped required vs either)');
        console.warn('  2. Enhanced calculation failing for most sites');
        console.warn('  3. Zero count values being filtered out');
        console.warn('  4. NBPD/Santa Cruz factor application issues');
      }

      // Make comparison data available
      (window as any).sparklineAADVComparison = {
        sparklineActiveSites,
        aadvActiveSites,
        commonSites,
        onlyInSparkline,
        onlyInAADV,
        discrepancyPercentage: parseFloat(discrepancyPercentage)
      };

      console.log('\n✅ Comparison data saved to window.sparklineAADVComparison');

    } catch (error) {
      console.error('❌ Error in Sparkline vs AADV comparison:', error);
    }

    console.groupEnd();
  }

  /**
   * Debug method to investigate missing count sites issue
   * Call from browser console: AADVHistogramDataService.debugMissingCountSites(selectedGeometry, dateRange)
   */
  static async debugMissingCountSites(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<void> {
    if (!selectedGeometry) {
      console.error('❌ No geometry provided for debugging');
      return;
    }

    console.group('🔍 DEBUG: Missing Count Sites Investigation');
    console.log('🎯 Objective: Identify why AADV Distribution shows fewer sites than expected');
    console.log('📅 Date Range:', dateRange.startDate.toISOString().split('T')[0], 'to', dateRange.endDate.toISOString().split('T')[0]);
    console.log('🚲 Filters: Bicyclist =', showBicyclist, ', Pedestrian =', showPedestrian);

    try {
      // Step 1: Compare with working component
      console.log('\n🔄 Step 1: Comparing with HighestVolume component...');
      const comparison = await this.compareWithHighestVolumeComponent(
        selectedGeometry,
        dateRange,
        showBicyclist,
        showPedestrian
      );

      // Step 2: Analyze the differences
      console.log('\n📊 Step 2: Analysis of differences...');
      if (comparison.comparison.onlyInHighestVolume.length > 0) {
        console.log('🔍 Sites that appear in HighestVolume but NOT in AADV Histogram:');
        for (const siteId of comparison.comparison.onlyInHighestVolume) {
          const hvSite = comparison.highestVolumeSites.find(s => s.siteId === siteId);
          console.log(`  Site ${siteId} (${hvSite?.siteName || 'Unknown'}): AADV = ${hvSite?.totalAADV?.toFixed(2) || 'N/A'}`);
        }
        console.log('💡 These sites may be filtered out during AADV Histogram processing');
      }

      // Step 3: Raw data validation
      console.log('\n🔄 Step 3: Raw data validation...');
      const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });

      // Get all sites in polygon
      const sitesQuery = sitesLayer.createQuery();
      sitesQuery.geometry = selectedGeometry;
      sitesQuery.spatialRelationship = "intersects";
      sitesQuery.outFields = ["id", "name"];
      sitesQuery.returnGeometry = false;
      const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
      
      console.log(`📍 Total sites in polygon: ${sitesResult.features.length}`);

      // Check raw count data availability for each site
      const siteIds = sitesResult.features.map(f => f.attributes.id);
      const countTypeConditions = [];
      if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
      if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
      
      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];
      
      for (const siteId of siteIds.slice(0, 10)) { // Check first 10 sites to avoid overwhelming output
        const whereClause = `site_id = ${siteId} AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDateStr}' AND timestamp <= DATE '${endDateStr}'`;
        
        const countsQuery = countsLayer.createQuery();
        countsQuery.where = whereClause;
        countsQuery.outFields = ["site_id", "timestamp", "count_type", "counts"];
        countsQuery.returnGeometry = false;
        
        const countsResult = await countsLayer.queryFeatures(countsQuery);
        const siteName = sitesResult.features.find(f => f.attributes.id === siteId)?.attributes.name || `Site ${siteId}`;
        
        console.log(`  Site ${siteId} (${siteName}): ${countsResult.features.length} raw count records`);
        
        if (countsResult.features.length > 0) {
          const totalCounts = countsResult.features.reduce((sum, f) => sum + (f.attributes.counts || 0), 0);
          const avgCount = totalCounts / countsResult.features.length;
          console.log(`    Total counts: ${totalCounts}, Avg per record: ${avgCount.toFixed(2)}`);
        }
      }

      // Step 4: Recommendations
      console.log('\n💡 Step 4: Debugging Recommendations:');
      console.log('1. Check the console logs above for detailed processing steps');
      console.log('2. Look for sites that have raw count data but zero AADV results');
      console.log('3. Check for enhanced calculation warnings or errors');
      console.log('4. Verify that factor files (Santa Cruz, NBPD) are loading correctly');
      console.log('5. Consider expanding the date range if data is sparse');
      console.log('6. Check if certain count types (bike/ped) are causing issues');

      // Make data available for further analysis
      (window as any).aadvDebugData = {
        comparison,
        sitesInPolygon: sitesResult.features.length,
        dateRange,
        filters: { showBicyclist, showPedestrian }
      };
      
      console.log('\n✅ Debug data saved to window.aadvDebugData for further analysis');

    } catch (error) {
      console.error('❌ Error during debugging:', error);
    }

    console.groupEnd();
  }

  /**
   * Investigate NBPD factor coverage issues
   * Call from browser console to analyze missing hourly factors
   */
  static async investigateNBPDFactorCoverage(): Promise<void> {
    console.group('🔍 NBPD Factor Coverage Investigation');
    
    try {
      // Load NBPD factors
      const response = await fetch("/factors/nbpd_factors_moderate_2009.json");
      if (!response.ok) {
        console.error('❌ Failed to load NBPD factors');
        return;
      }
      
      const nbpdData = await response.json();
      const nbpdProfile = nbpdData['NBPD_PATH_moderate_2009'];
      
      if (!nbpdProfile) {
        console.error('❌ NBPD profile not found');
        return;
      }

      console.log('📊 NBPD Factor Structure Analysis:');
      console.log('Available months:', Object.keys(nbpdProfile.months || {}));
      console.log('Available day types:', Object.keys(nbpdProfile.hours || {}));
      
      // Analyze hourly factor coverage
      const months = Object.keys(nbpdProfile.hours || {});
      const dayTypes = ['weekday', 'weekend']; // NBPD uses weekday/weekend, not individual days
      const hours = Array.from({length: 24}, (_, i) => i);
      
      let totalSlots = 0;
      let missingSlots = 0;
      const missingFactors: string[] = [];
      
      for (const month of months) {
        for (const dayType of dayTypes) {
          for (const hour of hours) {
            totalSlots++;
            const factor = nbpdProfile.hours?.[month]?.[dayType]?.[hour];
            if (factor === undefined || factor === null) {
              missingSlots++;
              missingFactors.push(`month=${month}, dayType=${dayType}, hour=${hour}`);
            }
          }
        }
      }
      
      console.log(`📈 Coverage Analysis:`);
      console.log(`  Total factor slots: ${totalSlots}`);
      console.log(`  Missing factors: ${missingSlots}`);
      console.log(`  Coverage: ${((totalSlots - missingSlots) / totalSlots * 100).toFixed(1)}%`);
      
      if (missingFactors.length > 0) {
        console.warn('⚠️ Missing NBPD factors (first 10):');
        missingFactors.slice(0, 10).forEach(factor => {
          console.warn(`  - ${factor}`);
        });
        if (missingFactors.length > 10) {
          console.warn(`  ... and ${missingFactors.length - 10} more`);
        }
      }
      
      // Recommendations
      console.log('\n💡 Recommendations:');
      if (missingSlots > 0) {
        console.log('1. 🔧 Update NBPD factor file to include missing hour/day/month combinations');
        console.log('2. 🔄 Consider using fallback factors for missing slots');
        console.log('3. 📊 Review if current factor coverage matches expected data patterns');
        console.log('4. ⚙️ Consider implementing interpolation for missing factors');
      } else {
        console.log('✅ NBPD factor coverage appears complete');
      }
      
      // Make factor data available for analysis
      (window as any).nbpdFactorAnalysis = {
        profile: nbpdProfile,
        missingFactors,
        coverage: (totalSlots - missingSlots) / totalSlots * 100
      };
      
      console.log('\n✅ Factor analysis saved to window.nbpdFactorAnalysis');
      
    } catch (error) {
      console.error('❌ Error investigating NBPD factors:', error);
    }
    
    console.groupEnd();
  }

  /**
   * Quick test to see if NBPD factor issues are causing the 350 vs 32 discrepancy
   * This bypasses enhanced calculation to test raw data availability
   */
  static async quickTestWithoutEnhancedCalculation(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<void> {
    if (!selectedGeometry) {
      console.error('❌ No geometry provided');
      return;
    }

    console.group('🚀 QUICK TEST: Raw Data vs Enhanced Calculation');
    console.log('🎯 Testing if NBPD factor issues cause the site count discrepancy');

    try {
      const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });

      // Step 1: Get all sites in polygon
      const sitesQuery = sitesLayer.createQuery();
      sitesQuery.geometry = selectedGeometry;
      sitesQuery.spatialRelationship = "intersects";
      sitesQuery.outFields = ["id", "name"];
      sitesQuery.returnGeometry = false;

      const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
      console.log(`📍 Total sites in polygon: ${sitesResult.features.length}`);

      // Step 2: Get raw count data (same as AADV histogram)
      const siteIds = sitesResult.features.map(f => f.attributes.id);
      const countTypeConditions = [];
      if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
      if (showPedestrian) countTypeConditions.push("count_type = 'ped'");

      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];
      
      const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDateStr}' AND timestamp <= DATE '${endDateStr}'`;

      const countsQuery = countsLayer.createQuery();
      countsQuery.where = whereClause;
      countsQuery.outFields = ["site_id", "timestamp", "count_type", "counts"];
      countsQuery.returnGeometry = false;

      const countsResults = await countsLayer.queryFeatures(countsQuery);
      console.log(`📊 Total raw count records: ${countsResults.features.length}`);

      // Step 3: Simple aggregation without enhanced calculation
      const sitesWithData = countsResults.features.reduce((acc, feature) => {
        const siteId = feature.attributes.site_id;
        const counts = feature.attributes.counts || 0;
        
        if (!acc[siteId]) {
          acc[siteId] = { records: 0, totalCounts: 0, nonZeroCounts: 0 };
        }
        
        acc[siteId].records++;
        acc[siteId].totalCounts += counts;
        if (counts > 0) acc[siteId].nonZeroCounts++;
        
        return acc;
      }, {} as Record<number, { records: number; totalCounts: number; nonZeroCounts: number }>);

      const sitesWithAnyData = Object.keys(sitesWithData).length;
      const sitesWithNonZeroData = Object.values(sitesWithData).filter(data => data.nonZeroCounts > 0).length;
      
      console.log(`✅ Sites with ANY count records: ${sitesWithAnyData}`);
      console.log(`✅ Sites with NON-ZERO counts: ${sitesWithNonZeroData}`);

      // Step 4: Compare with enhanced calculation results
      console.log('\n🔄 Running enhanced calculation for comparison...');
      const enhancedResults = await this.getAADVDataFromEnhancedCalculation(
        selectedGeometry,
        dateRange,
        showBicyclist,
        showPedestrian
      );

      console.log(`📈 Sites surviving enhanced calculation: ${enhancedResults.length}`);

      // Step 5: Analysis
      console.log('\n📊 Analysis:');
      console.log(`📍 Sites in polygon: ${sitesResult.features.length}`);
      console.log(`📊 Sites with raw data: ${sitesWithAnyData} (${((sitesWithAnyData/sitesResult.features.length)*100).toFixed(1)}%)`);
      console.log(`✅ Sites with non-zero data: ${sitesWithNonZeroData} (${((sitesWithNonZeroData/sitesResult.features.length)*100).toFixed(1)}%)`);
      console.log(`📈 Sites with AADV results: ${enhancedResults.length} (${((enhancedResults.length/sitesResult.features.length)*100).toFixed(1)}%)`);

      const rawToEnhancedLoss = sitesWithNonZeroData - enhancedResults.length;
      const rawToEnhancedLossPercent = sitesWithNonZeroData > 0 ? ((rawToEnhancedLoss / sitesWithNonZeroData) * 100).toFixed(1) : '0';

      console.log(`\n🔍 Site Loss Analysis:`);
      console.log(`❌ Lost in enhanced calculation: ${rawToEnhancedLoss} sites (${rawToEnhancedLossPercent}%)`);

      if (rawToEnhancedLoss > sitesWithNonZeroData * 0.5) {
        console.warn('🚨 MAJOR ISSUE: Enhanced calculation is filtering out >50% of sites with data');
        console.warn('💡 Likely causes:');
        console.warn('  1. NBPD factor coverage gaps causing calculation failures');
        console.warn('  2. Enhanced calculation requiring too much data per site');
        console.warn('  3. Factor application producing zero/invalid results');
        console.warn('\n🔧 Recommendations:');
        console.warn('  1. Run investigateNBPDFactors() to check factor coverage');
        console.warn('  2. Consider fallback calculation for sites with missing factors');
        console.warn('  3. Review enhanced calculation requirements');
      } else {
        console.log('✅ Enhanced calculation loss is within acceptable range');
      }

      // Make data available for analysis
      (window as any).quickTestResults = {
        totalSites: sitesResult.features.length,
        sitesWithData: sitesWithAnyData,
        sitesWithNonZeroData,
        sitesWithAADV: enhancedResults.length,
        enhancedCalculationLoss: rawToEnhancedLoss,
        enhancedCalculationLossPercent: parseFloat(rawToEnhancedLossPercent)
      };

      console.log('\n✅ Results saved to window.quickTestResults');

    } catch (error) {
      console.error('❌ Error in quick test:', error);
    }

    console.groupEnd();
  }

  /**
   * Compare AADV approach with working Sparkline approach
   */
  static async compareWithSparklineApproach(selectedGeometry: Polygon, dateRange: { startDate: Date; endDate: Date }) {
    console.log('🔍 COMPARING AADV vs SPARKLINE APPROACHES');
    
    try {
      // Import VolumeChartDataService dynamically to avoid circular imports
      const { VolumeChartDataService } = await import('./VolumeChartDataService');
      
      // Test Sparkline approach
      const sitesLayer = new FeatureLayer({ url: this.SITES_URL });
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
      const aadtTable = new FeatureLayer({ url: this.AADT_URL });
      
      const volumeService = new VolumeChartDataService(sitesLayer, countsLayer, aadtTable);
      
      const sparklineResult = await volumeService.getTimelineSparklineData(
        null as any, // mapView not needed for this comparison
        { showBicyclist: true, showPedestrian: true },
        { start: dateRange.startDate, end: dateRange.endDate },
        selectedGeometry
      );
      
      console.log(`📊 SPARKLINE APPROACH: Found ${sparklineResult.sites.length} sites`);
      console.log(`  Site IDs: ${sparklineResult.sites.slice(0, 10).map(s => s.id).join(', ')}...`);
      
      // Test AADV approach
      const aadvResult = await this.getAADVDataFromEnhancedCalculation(
        selectedGeometry,
        dateRange,
        true,
        true
      );
      
      console.log(`📊 AADV APPROACH: Found ${aadvResult.length} sites`);
      console.log(`  Site IDs: ${aadvResult.slice(0, 10).map(s => s.siteId).join(', ')}...`);
      
      // Compare approaches
      const sparklineSiteIds = sparklineResult.sites.map(s => parseInt(s.id));
      const aadvSiteIds = aadvResult.map(s => s.siteId);
      const overlap = sparklineSiteIds.filter(id => aadvSiteIds.includes(id));
      
      console.log(`🔍 COMPARISON RESULTS:`);
      console.log(`  Sparkline sites: ${sparklineSiteIds.length}`);
      console.log(`  AADV sites: ${aadvSiteIds.length}`);
      console.log(`  Overlap: ${overlap.length}`);
      console.log(`  🚨 DISCREPANCY: ${Math.abs(sparklineSiteIds.length - aadvSiteIds.length)} sites difference`);
      
      if (sparklineSiteIds.length > aadvSiteIds.length) {
        const missingSites = sparklineSiteIds.filter(id => !aadvSiteIds.includes(id));
        console.log(`  Missing from AADV: ${missingSites.slice(0, 10).join(', ')}...`);
      }
      
      return {
        sparkline: sparklineResult,
        aadv: aadvResult,
        overlap: overlap.length
      };
      
    } catch (error) {
      console.error('❌ Comparison failed:', error);
      return null;
    }
  }
}
