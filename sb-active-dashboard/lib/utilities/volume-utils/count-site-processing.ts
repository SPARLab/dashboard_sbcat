/**
 * Count site processing utilities
 * Used by: SummaryStatistics, HighestVolume charts
 */

import { AggregationUtilService } from "../shared/aggregation";
import { SpatialUtilService } from "../shared/spatial";
import { processAndRankSites, type RawSiteRecord, type SiteMetadata } from "./site-ranking";
import { EnhancedAADVCalculationService, RawCountRecord as EnhancedRawCountRecord, EnhancedAADVConfig, EnhancedAADVResult } from "../../../src/lib/enhanced-aadv-calculations";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

export class CountSiteProcessingService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";
  /**
   * Get summary statistics for count sites in current view
   * Used by: VolumeRightSidebar -> SummaryStatistics
   */
  static async getSummaryStatistics(
    sitesLayer: __esri.FeatureLayer,
    aadtLayer: __esri.FeatureLayer,
    mapView: __esri.MapView,
    filters: any,
    selectedGeometry?: __esri.Geometry | null
  ): Promise<{
    totalSites: number;
    bikeSites: number;
    pedSites: number;
    avgDailyVolume: number;
    totalDailyVolume: number;
  }> {
    // Get sites in current extent or selected geometry
    const siteIds = await SpatialUtilService.getSiteIdsInExtent(sitesLayer, mapView, selectedGeometry);
    
    if (siteIds.length === 0) {
      return {
        totalSites: 0,
        bikeSites: 0,
        pedSites: 0,
        avgDailyVolume: 0,
        totalDailyVolume: 0
      };
    }

    // Query AADT data for these sites
    const spatialWhere = SpatialUtilService.buildSpatialWhereClause(siteIds);
    const query = aadtLayer.createQuery();
    query.where = spatialWhere;
    query.outFields = ["site_id", "count_type", "all_aadt"];
    query.returnGeometry = false;

    const results = await aadtLayer.queryFeatures(query);
    
    // Process results
    const siteData = AggregationUtilService.groupByField(
      results.features.map(f => f.attributes), 
      'site_id'
    );

    let bikeSites = 0;
    let pedSites = 0;
    let totalVolume = 0;

    Object.values(siteData).forEach((siteRecords: any[]) => {
      const hasBike = siteRecords.some(r => r.count_type === 'bike');
      const hasPed = siteRecords.some(r => r.count_type === 'ped');
      
      if (hasBike) bikeSites++;
      if (hasPed) pedSites++;
      
      // Sum AADT values for this site
      const siteVolume = siteRecords.reduce((sum, r) => sum + (r.all_aadt || 0), 0);
      totalVolume += siteVolume;
    });

    return {
      totalSites: siteIds.length,
      bikeSites,
      pedSites,
      avgDailyVolume: totalVolume / siteIds.length,
      totalDailyVolume: totalVolume
    };
  }

  /**
   * Get highest volume sites for ranking display using enhanced AADV calculation
   * Used by: VolumeRightSidebar -> HighestVolume
   */
  static async getHighestVolumeSites(
    sitesLayer: __esri.FeatureLayer,
    aadtLayer: __esri.FeatureLayer,
    mapView: __esri.MapView,
    filters: any,
    dateRange: { startDate: Date; endDate: Date },
    limit: number = 10,
    selectedGeometry?: __esri.Geometry | null
  ): Promise<Array<{
    siteId: number;
    siteName: string;
    bikeAADV: number;
    pedAADV: number;
    totalAADV: number;
  }>> {
    try {
      // Get sites in current extent or selected geometry
      const siteIds = await SpatialUtilService.getSiteIdsInExtent(
        sitesLayer,
        mapView,
        selectedGeometry
      );
      
      if (siteIds.length === 0) {
        return [];
      }

      // Get site metadata  
      const sitesQuery = sitesLayer.createQuery();
      sitesQuery.where = `id IN (${siteIds.join(',')})`;
      sitesQuery.outFields = ["id", "name"];
      sitesQuery.returnGeometry = false;

      const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
      
      const siteMetadata = sitesResult.features.reduce((acc, f) => {
        acc[f.attributes.id] = f.attributes;
        return acc;
      }, {} as any);

      // Get raw count data for enhanced AADV calculation
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
      
      // Build count type filter
      const countTypeConditions = [];
      if (filters.showBicyclist) countTypeConditions.push("count_type = 'bike'");
      if (filters.showPedestrian) countTypeConditions.push("count_type = 'ped'");
      
      if (countTypeConditions.length === 0) {
        return [];
      }

      // Format dates for query
      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];
      
      const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDateStr}' AND timestamp < DATE '${endDateStr}'`;

      const countsQuery = countsLayer.createQuery();
      countsQuery.where = whereClause;
      countsQuery.outFields = ["site_id", "timestamp", "count_type", "counts"];
      countsQuery.returnGeometry = false;

      const countsResults = await countsLayer.queryFeatures(countsQuery);
      
      if (countsResults.features.length === 0) {
        return [];
      }

      // Convert to enhanced calculation format
      const rawCountRecords: EnhancedRawCountRecord[] = countsResults.features.map(feature => {
        const attrs = feature.attributes;
        return {
          site_id: attrs.site_id,
          timestamp: attrs.timestamp,
          counts: attrs.counts || 0,
          count_type: attrs.count_type as 'bike' | 'ped'
        };
      });

      // Configure enhanced AADV calculation
      const config: EnhancedAADVConfig = {
        showBicyclist: filters.showBicyclist,
        showPedestrian: filters.showPedestrian,
        nbpdProfileKey: 'NBPD_PATH_moderate_2009', // Use NBPD profile for enhanced expansion
        santaCruzProfileKey: 'SantaCruz_citywide_v1' // Use Santa Cruz factors for normalization
      };

      try {
        // Calculate enhanced AADV for all records
        const aadvResults = await EnhancedAADVCalculationService.calculateEnhancedAADV(
          rawCountRecords,
          config
        );

        // Group results by site and aggregate
        const siteAADVResults: Array<{
          siteId: number;
          siteName: string;
          bikeAADV: number;
          pedAADV: number;
          totalAADV: number;
        }> = [];

        // Group results by site
        const resultsBySite: Record<number, EnhancedAADVResult[]> = {};
        aadvResults.forEach(result => {
          const siteId = parseInt(result.siteYear.siteId);
          if (!resultsBySite[siteId]) {
            resultsBySite[siteId] = [];
          }
          resultsBySite[siteId].push(result);
        });

        // Process each site
        for (const siteId of siteIds) {
          const siteResults = resultsBySite[siteId] || [];
          const metadata = siteMetadata[siteId];
          
          if (siteResults.length === 0) {
            continue;
          }

          // Calculate average AADV across all years for this site
          const totalAADV = siteResults.reduce((sum, result) => sum + result.siteYear.aadv, 0) / siteResults.length;
          
          // For bike/ped breakdown, we need to calculate separately
          let bikeAADV = 0;
          let pedAADV = 0;
          
          if (filters.showBicyclist) {
            const bikeResults = siteResults.filter(r => r.siteYear.bikeAADV !== undefined);
            bikeAADV = bikeResults.length > 0 ? 
              bikeResults.reduce((sum, result) => sum + (result.siteYear.bikeAADV || 0), 0) / bikeResults.length : 0;
          }
          
          if (filters.showPedestrian) {
            const pedResults = siteResults.filter(r => r.siteYear.pedAADV !== undefined);
            pedAADV = pedResults.length > 0 ? 
              pedResults.reduce((sum, result) => sum + (result.siteYear.pedAADV || 0), 0) / pedResults.length : 0;
          }

          if (totalAADV > 0) {
            siteAADVResults.push({
              siteId,
              siteName: metadata?.name || `Site ${siteId}`,
              bikeAADV,
              pedAADV,
              totalAADV
            });
          }
        }

        // Sort by total AADV (highest first) and limit results
        return siteAADVResults
          .sort((a, b) => b.totalAADV - a.totalAADV)
          .slice(0, limit);
          
      } catch (enhancedError) {
        console.warn('Enhanced AADV calculation failed, falling back to empty results:', enhancedError);
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error in getHighestVolumeSites:', error);
      throw error;
    }
  }

  /**
   * Get site data completeness metrics
   * Used by: CompletenessMetrics component
   */
  static async getCompletenessMetrics(
    sitesLayer: __esri.FeatureLayer,
    countsLayer: __esri.FeatureLayer,
    mapView: __esri.MapView,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    sitesWithData: number;
    sitesWithoutData: number;
    dataCompleteness: number;
    avgDataDensity: number;
  }> {
    // TODO: Implement completeness analysis
    return {
      sitesWithData: 0,
      sitesWithoutData: 0,
      dataCompleteness: 0,
      avgDataDensity: 0
    };
  }
}