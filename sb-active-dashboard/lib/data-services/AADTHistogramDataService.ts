import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";

/**
 * Interface for AADT data per count site
 */
export interface SiteAADTData {
  siteId: number;
  siteName: string;
  aadt: number;
  bikeAADT: number;
  pedAADT: number;
}

/**
 * Interface for histogram bin data
 */
export interface HistogramBinData {
  binLabel: string;
  binMin: number;
  binMax: number;
  count: number;
  sites: SiteAADTData[];
}

/**
 * Interface for AADT histogram result
 */
export interface AADTHistogramResult {
  bins: HistogramBinData[];
  totalSites: number;
  minAADT: number;
  maxAADT: number;
  meanAADT: number;
  medianAADT: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Service for calculating AADT histograms for count sites
 */
export class AADTHistogramDataService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";
  private static readonly AADT_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2";

  /**
   * Query AADT histogram data for selected area using pre-calculated AADT values
   */
  static async queryAADTHistogram(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true,
    numberOfBins: number = 10
  ): Promise<AADTHistogramResult> {
    try {
      if (!selectedGeometry) {
        return this.getEmptyResult();
      }

      // Get AADT data using the same pattern as existing components
      const siteAADTs = await this.getAADTDataFromTables(selectedGeometry, showBicyclist, showPedestrian);

      // Filter out sites with no data
      const validSiteAADTs = siteAADTs.filter(site => site.aadt > 0);

      if (validSiteAADTs.length === 0) {
        return this.getEmptyResult();
      }

      // Create histogram bins
      const bins = this.createHistogramBins(validSiteAADTs, numberOfBins);

      // Calculate statistics
      const aadtValues = validSiteAADTs.map(site => site.aadt);
      const minAADT = Math.min(...aadtValues);
      const maxAADT = Math.max(...aadtValues);
      const meanAADT = aadtValues.reduce((sum, val) => sum + val, 0) / aadtValues.length;
      const sortedAADTs = [...aadtValues].sort((a, b) => a - b);
      const medianAADT = sortedAADTs[Math.floor(sortedAADTs.length / 2)];

      return {
        bins,
        totalSites: validSiteAADTs.length,
        minAADT,
        maxAADT,
        meanAADT,
        medianAADT,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying AADT histogram data:', error);
      return {
        bins: [],
        totalSites: 0,
        minAADT: 0,
        maxAADT: 0,
        meanAADT: 0,
        medianAADT: 0,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get AADT data from Sites and AADT tables using pre-calculated values
   * This follows the same pattern as queryVolumeCountSitesWithinPolygon
   */
  private static async getAADTDataFromTables(
    selectedGeometry: Polygon,
    showBicyclist: boolean,
    showPedestrian: boolean
  ): Promise<SiteAADTData[]> {
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
    
    // Query the AADT table for these site IDs
    const aadtLayer = new FeatureLayer({ url: this.AADT_URL });
    const aadtQuery = aadtLayer.createQuery();
    aadtQuery.where = `site_id IN (${siteIds.join(',')})`;
    aadtQuery.outFields = ["site_id", "count_type", "all_aadt"];
    aadtQuery.returnGeometry = false;

    const aadtResults = await aadtLayer.queryFeatures(aadtQuery);
    
    // Group AADT records by site ID
    const aadtBySite = aadtResults.features.reduce((acc, feature) => {
      const siteId = feature.attributes.site_id;
      if (!acc[siteId]) {
        acc[siteId] = [];
      }
      acc[siteId].push(feature.attributes);
      return acc;
    }, {} as Record<number, any[]>);

    // Process each site's AADT data
    const siteAADTs: SiteAADTData[] = [];
    
    for (const siteId of siteIds) {
      const siteRecords = aadtBySite[siteId] || [];
      const metadata = siteMetadata[siteId];
      
      let bikeAADT = 0;
      let pedAADT = 0;
      
      // Extract AADT values based on count type and user filters
      siteRecords.forEach(record => {
        const countType = record.count_type;
        const aadt = record.all_aadt || 0;
        
        if (countType === 'bike' && showBicyclist) {
          bikeAADT = aadt;
        } else if (countType === 'ped' && showPedestrian) {
          pedAADT = aadt;
        }
      });
      
      const totalAADT = bikeAADT + pedAADT;
      
      // Only include sites that have data for the selected count types
      if (totalAADT > 0) {
        siteAADTs.push({
          siteId,
          siteName: metadata?.name || `Site ${siteId}`,
          aadt: totalAADT,
          bikeAADT,
          pedAADT
        });
      }
    }

    return siteAADTs;
  }



  /**
   * Create histogram bins from AADT data
   */
  private static createHistogramBins(
    siteAADTs: SiteAADTData[],
    numberOfBins: number
  ): HistogramBinData[] {
    if (siteAADTs.length === 0) return [];

    const aadtValues = siteAADTs.map(site => site.aadt);
    const minAADT = Math.min(...aadtValues);
    const maxAADT = Math.max(...aadtValues);
    
    // Handle edge case where all values are the same
    if (minAADT === maxAADT) {
      return [{
        binLabel: `${minAADT}`,
        binMin: minAADT,
        binMax: maxAADT,
        count: siteAADTs.length,
        sites: siteAADTs
      }];
    }

    // Calculate bin width
    const range = maxAADT - minAADT;
    const binWidth = range / numberOfBins;

    // Create bins
    const bins: HistogramBinData[] = [];
    
    for (let i = 0; i < numberOfBins; i++) {
      const binMin = minAADT + (i * binWidth);
      const binMax = i === numberOfBins - 1 ? maxAADT : minAADT + ((i + 1) * binWidth);
      
      // Find sites that fall into this bin
      const sitesInBin = siteAADTs.filter(site => {
        return site.aadt >= binMin && (i === numberOfBins - 1 ? site.aadt <= binMax : site.aadt < binMax);
      });

      // Format bin label
      const binLabel = `${Math.round(binMin)}-${Math.round(binMax)}`;

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
  private static getEmptyResult(): AADTHistogramResult {
    return {
      bins: [],
      totalSites: 0,
      minAADT: 0,
      maxAADT: 0,
      meanAADT: 0,
      medianAADT: 0,
      isLoading: false,
      error: null
    };
  }

  /**
   * Get sites in a specific AADT range (for map highlighting)
   */
  static getSitesInAADTRange(
    histogramResult: AADTHistogramResult,
    binIndex: number
  ): SiteAADTData[] {
    if (!histogramResult.bins[binIndex]) {
      return [];
    }
    return histogramResult.bins[binIndex].sites;
  }

  /**
   * Get individual site data sorted by AADT for individual bar visualization
   */
  static async queryIndividualSiteAADT(
    selectedGeometry: Polygon | null,
    dateRange: { startDate: Date; endDate: Date },
    showBicyclist: boolean = true,
    showPedestrian: boolean = true
  ): Promise<{ sites: SiteAADTData[]; error: string | null }> {
    try {
      if (!selectedGeometry) {
        return { sites: [], error: null };
      }

      // Get AADT data using pre-calculated values
      const siteAADTs = await this.getAADTDataFromTables(selectedGeometry, showBicyclist, showPedestrian);

      // Filter out sites with no data and sort by AADT
      const validSiteAADTs = siteAADTs
        .filter(site => site.aadt > 0)
        .sort((a, b) => a.aadt - b.aadt); // Sort ascending for better visualization

      return { sites: validSiteAADTs, error: null };

    } catch (error) {
      console.error('Error querying individual site AADT data:', error);
      return { 
        sites: [], 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}
