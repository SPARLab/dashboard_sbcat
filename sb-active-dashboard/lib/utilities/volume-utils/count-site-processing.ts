/**
 * Count site processing utilities
 * Used by: SummaryStatistics, HighestVolume charts
 */

import { AggregationUtilService } from "../shared/aggregation";
import { SpatialUtilService } from "../shared/spatial";

export class CountSiteProcessingService {
  /**
   * Get summary statistics for count sites in current view
   * Used by: VolumeRightSidebar -> SummaryStatistics
   */
  static async getSummaryStatistics(
    sitesLayer: __esri.FeatureLayer,
    aadtLayer: __esri.FeatureLayer,
    mapView: __esri.MapView,
    filters: any
  ): Promise<{
    totalSites: number;
    bikeSites: number;
    pedSites: number;
    avgDailyVolume: number;
    totalDailyVolume: number;
  }> {
    // Get sites in current extent
    const siteIds = await SpatialUtilService.getSiteIdsInExtent(sitesLayer, mapView);
    
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
   * Get highest volume sites for ranking display
   * Used by: VolumeRightSidebar -> HighestVolume
   */
  static async getHighestVolumeSites(
    sitesLayer: __esri.FeatureLayer,
    aadtLayer: __esri.FeatureLayer,
    mapView: __esri.MapView,
    filters: any,
    limit: number = 10
  ): Promise<Array<{
    siteId: number;
    siteName: string;
    bikeAADT: number;
    pedAADT: number;
    totalAADT: number;
    locality: string;
  }>> {
    // Get sites in current extent
    const siteIds = await SpatialUtilService.getSiteIdsInExtent(sitesLayer, mapView);
    
    if (siteIds.length === 0) return [];

    // Get site metadata
    const sitesQuery = sitesLayer.createQuery();
    sitesQuery.where = `id IN (${siteIds.join(',')})`;
    sitesQuery.outFields = ["id", "name", "locality"];
    sitesQuery.returnGeometry = false;

    const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
    const siteMetadata = sitesResult.features.reduce((acc, f) => {
      acc[f.attributes.id] = f.attributes;
      return acc;
    }, {} as any);

    // Get AADT data
    const spatialWhere = SpatialUtilService.buildSpatialWhereClause(siteIds);
    const aadtQuery = aadtLayer.createQuery();
    aadtQuery.where = spatialWhere;
    aadtQuery.outFields = ["site_id", "count_type", "all_aadt"];
    aadtQuery.returnGeometry = false;

    const aadtResult = await aadtLayer.queryFeatures(aadtQuery);
    const aadtBySite = AggregationUtilService.groupByField(
      aadtResult.features.map(f => f.attributes),
      'site_id'
    );

    // Process and rank sites
    const rankedSites = Object.entries(aadtBySite).map(([siteId, records]: [string, any[]]) => {
      const bikeAADT = records.find(r => r.count_type === 'bike')?.all_aadt || 0;
      const pedAADT = records.find(r => r.count_type === 'ped')?.all_aadt || 0;
      const metadata = siteMetadata[siteId];

      return {
        siteId: parseInt(siteId),
        siteName: metadata?.name || `Site ${siteId}`,
        bikeAADT,
        pedAADT,
        totalAADT: bikeAADT + pedAADT,
        locality: metadata?.locality || 'Unknown'
      };
    }).sort((a, b) => b.totalAADT - a.totalAADT);

    return rankedSites.slice(0, limit);
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