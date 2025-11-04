/**
 * Count site processing utilities
 * Used by: SummaryStatistics, HighestVolume charts
 */

import { AggregationUtilService } from "../shared/aggregation";
import { SpatialUtilService } from "../shared/spatial";
import { processAndRankSites, type RawSiteRecord, type SiteMetadata } from "./site-ranking";
import { EnhancedAADVCalculationService, RawCountRecord as EnhancedRawCountRecord, EnhancedAADVConfig, EnhancedAADVResult, EnhancedAADVWithWeekdayWeekendResult } from "../../../src/lib/enhanced-aadv-calculations";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

export class CountSiteProcessingService {
  private static readonly COUNTS_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1";
  private static readonly SITES_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0";

  /**
   * Query all features in parallel using pagination to handle large result sets
   * Copied from AADVHistogramDataService to ensure consistent behavior
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
          
          // For bike/ped breakdown, we need to calculate based on the count types in the original data
          // Since SiteYear only has combined AADV, we'll need to estimate the breakdown
          let bikeAADV = 0;
          let pedAADV = 0;
          
          // If both modes are enabled, we can't separate them from the combined AADV
          // So we'll use the total for both (this is a limitation of the current data structure)
          if (filters.showBicyclist && filters.showPedestrian) {
            // When both are enabled, we can't separate them, so we use total for both
            // This is not ideal but matches the current data structure limitation
            bikeAADV = totalAADV / 2; // Rough estimate
            pedAADV = totalAADV / 2; // Rough estimate
          } else if (filters.showBicyclist) {
            bikeAADV = totalAADV;
            pedAADV = 0;
          } else if (filters.showPedestrian) {
            bikeAADV = 0;
            pedAADV = totalAADV;
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
        const finalResults = siteAADVResults
          .sort((a, b) => b.totalAADV - a.totalAADV)
          .slice(0, limit);
          
        // If we expected multiple sites but only got results for some, use fallback for missing sites
        if (siteIds.length > 1 && finalResults.length < siteIds.length) {
          // Get the missing site IDs
          const processedSiteIds = finalResults.map(r => r.siteId);
          const missingSiteIds = siteIds.filter(id => !processedSiteIds.includes(id));
          
          // Use fallback for missing sites
          try {
            const aadtQuery = aadtLayer.createQuery();
            aadtQuery.where = `site_id IN (${missingSiteIds.join(',')})`;
            aadtQuery.outFields = ["site_id", "count_type", "all_aadt"];
            aadtQuery.returnGeometry = false;
            
            const aadtResults = await aadtLayer.queryFeatures(aadtQuery);
            
            // Group AADT data by site
            const aadtBySite: Record<number, { bike: number; ped: number }> = {};
            
            aadtResults.features.forEach(feature => {
              const attrs = feature.attributes;
              const siteId = attrs.site_id;
              const countType = attrs.count_type;
              const aadt = attrs.all_aadt || 0;
              
              if (!aadtBySite[siteId]) {
                aadtBySite[siteId] = { bike: 0, ped: 0 };
              }
              
              if (countType === 'bike') {
                aadtBySite[siteId].bike = aadt;
              } else if (countType === 'ped') {
                aadtBySite[siteId].ped = aadt;
              }
            });
            
            // Add fallback results for missing sites
            for (const siteId of missingSiteIds) {
              const aadtData = aadtBySite[siteId];
              const metadata = siteMetadata[siteId];
              
              if (!aadtData) {
                continue;
              }
              
              let bikeAADV = 0;
              let pedAADV = 0;
              
              if (filters.showBicyclist) {
                bikeAADV = aadtData.bike;
              }
              if (filters.showPedestrian) {
                pedAADV = aadtData.ped;
              }
              
              const totalAADV = bikeAADV + pedAADV;
              
              if (totalAADV > 0) {
                finalResults.push({
                  siteId,
                  siteName: metadata?.name || `Site ${siteId}`,
                  bikeAADV,
                  pedAADV,
                  totalAADV
                });
              }
            }
            
            // Re-sort and limit the combined results
            const combinedResults = finalResults
              .sort((a, b) => b.totalAADV - a.totalAADV)
              .slice(0, limit);
              
            return combinedResults;
            
          } catch (fallbackError) {
            console.warn('Fallback supplement failed:', fallbackError);
            return finalResults;
          }
        }
        
        return finalResults;
          
      } catch (enhancedError) {
        console.warn('Enhanced AADV calculation failed, falling back to AADT table data:', enhancedError);
        
        // Fallback: Use existing AADT table data
        try {
          const aadtQuery = aadtLayer.createQuery();
          aadtQuery.where = `site_id IN (${siteIds.join(',')})`;
          aadtQuery.outFields = ["site_id", "count_type", "all_aadt"];
          aadtQuery.returnGeometry = false;
          
          const aadtResults = await aadtLayer.queryFeatures(aadtQuery);
          
          if (aadtResults.features.length === 0) {
            return [];
          }
          
          // Group AADT data by site
          const aadtBySite: Record<number, { bike: number; ped: number }> = {};
          
          aadtResults.features.forEach(feature => {
            const attrs = feature.attributes;
            const siteId = attrs.site_id;
            const countType = attrs.count_type;
            const aadt = attrs.all_aadt || 0;
            
            if (!aadtBySite[siteId]) {
              aadtBySite[siteId] = { bike: 0, ped: 0 };
            }
            
            if (countType === 'bike') {
              aadtBySite[siteId].bike = aadt;
            } else if (countType === 'ped') {
              aadtBySite[siteId].ped = aadt;
            }
          });
          
          // Build results using AADT data
          const fallbackResults: Array<{
            siteId: number;
            siteName: string;
            bikeAADV: number;
            pedAADV: number;
            totalAADV: number;
          }> = [];
          
          for (const siteId of siteIds) {
            const aadtData = aadtBySite[siteId];
            const metadata = siteMetadata[siteId];
            
            if (!aadtData) continue;
            
            let bikeAADV = 0;
            let pedAADV = 0;
            
            if (filters.showBicyclist) {
              bikeAADV = aadtData.bike;
            }
            if (filters.showPedestrian) {
              pedAADV = aadtData.ped;
            }
            
            const totalAADV = bikeAADV + pedAADV;
            
            if (totalAADV > 0) {
              fallbackResults.push({
                siteId,
                siteName: metadata?.name || `Site ${siteId}`,
                bikeAADV,
                pedAADV,
                totalAADV
              });
            }
          }
          
          // Sort by total AADV (highest first) and limit results
          const fallbackFinalResults = fallbackResults
            .sort((a, b) => b.totalAADV - a.totalAADV)
            .slice(0, limit);
            
          return fallbackFinalResults;
            
        } catch (fallbackError) {
          console.error('Fallback AADT calculation also failed:', fallbackError);
          return [];
        }
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

  /**
   * Get enhanced AADV summary statistics for count sites using the new calculation method
   * Used by: VolumeRightSidebar -> SummaryStatistics (updated version)
   */
  static async getEnhancedAADVSummaryStatistics(
    sitesLayer: __esri.FeatureLayer,
    selectedGeometry: __esri.Geometry | null,
    dateRange: { startDate: Date; endDate: Date },
    filters: { showBicyclist: boolean; showPedestrian: boolean }
  ): Promise<{
    totalCount: number;
    medianPedestrianWeekdayAADV?: number;
    medianPedestrianWeekendAADV?: number;
    medianBikeWeekdayAADV?: number;
    medianBikeWeekendAADV?: number;
  }> {
    try {
      if (!selectedGeometry) {
        return {
          totalCount: 0,
          medianPedestrianWeekdayAADV: 0,
          medianPedestrianWeekendAADV: 0,
          medianBikeWeekdayAADV: 0,
          medianBikeWeekendAADV: 0,
        };
      }

      // Get sites within the selected geometry
      const sitesQuery = sitesLayer.createQuery();
      sitesQuery.geometry = selectedGeometry;
      sitesQuery.spatialRelationship = "intersects";
      sitesQuery.outFields = ["id", "name"];
      sitesQuery.returnGeometry = false;

      const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
      
      if (sitesResult.features.length === 0) {
        return {
          totalCount: 0,
          medianPedestrianWeekdayAADV: 0,
          medianPedestrianWeekendAADV: 0,
          medianBikeWeekdayAADV: 0,
          medianBikeWeekendAADV: 0,
        };
      }

      const siteIds = sitesResult.features.map(f => f.attributes.id);

      // Get raw count data for enhanced AADV calculation
      const countsLayer = new FeatureLayer({ url: this.COUNTS_URL });
      
      // Build count type filter
      const countTypeConditions = [];
      if (filters.showBicyclist) countTypeConditions.push("count_type = 'bike'");
      if (filters.showPedestrian) countTypeConditions.push("count_type = 'ped'");
      
      if (countTypeConditions.length === 0) {
        return {
          totalCount: sitesResult.features.length,
          medianPedestrianWeekdayAADV: 0,
          medianPedestrianWeekendAADV: 0,
          medianBikeWeekdayAADV: 0,
          medianBikeWeekendAADV: 0,
        };
      }

      // Format dates for query
      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];
      
      const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')}) AND timestamp >= DATE '${startDateStr}' AND timestamp <= DATE '${endDateStr}'`;

      const countsQuery = countsLayer.createQuery();
      countsQuery.where = whereClause;
      countsQuery.outFields = ["site_id", "timestamp", "count_type", "counts"];
      countsQuery.returnGeometry = false;

      // Use pagination to handle large result sets (like AADVHistogramDataService)
      const countsResultFeatures = await this.queryAllFeaturesInParallel(countsLayer, countsQuery);
      
      if (countsResultFeatures.length === 0) {
        return {
          totalCount: sitesResult.features.length,
          medianPedestrianWeekdayAADV: 0,
          medianPedestrianWeekendAADV: 0,
          medianBikeWeekdayAADV: 0,
          medianBikeWeekendAADV: 0,
        };
      }

      // Convert to EnhancedRawCountRecord format
      const rawCountData: EnhancedRawCountRecord[] = countsResultFeatures.map(feature => ({
        site_id: feature.attributes.site_id,
        timestamp: feature.attributes.timestamp,
        counts: feature.attributes.counts || 0,
        count_type: feature.attributes.count_type as 'bike' | 'ped'
      }));

      // Use enhanced AADV calculation service with weekday/weekend breakdown
      const enhancedConfig: EnhancedAADVConfig = {
        showBicyclist: filters.showBicyclist,
        showPedestrian: filters.showPedestrian
      };

      const aadvResults = await EnhancedAADVCalculationService.calculateEnhancedAADVWithWeekdayWeekend(
        rawCountData, 
        enhancedConfig
      );

      // Group results by site and calculate medians
      const bikeWeekdayAADVs: number[] = [];
      const bikeWeekendAADVs: number[] = [];
      const pedWeekdayAADVs: number[] = [];
      const pedWeekendAADVs: number[] = [];

      // Group AADV results by site
      const aadvBySite = aadvResults.reduce((acc, result) => {
        const siteId = parseInt(result.siteId);
        if (!acc[siteId]) {
          acc[siteId] = [];
        }
        acc[siteId].push(result);
        return acc;
      }, {} as Record<number, EnhancedAADVWithWeekdayWeekendResult[]>);

      // Calculate AADV values for each site and collect for median calculation
      Object.entries(aadvBySite).forEach(([siteIdStr, siteResults]) => {
        // Calculate average AADV across all years for this site
        const bikeResults = siteResults.filter(r => r.countType === 'bike');
        const pedResults = siteResults.filter(r => r.countType === 'ped');

        if (bikeResults.length > 0) {
          const avgBikeWeekdayAADV = bikeResults.reduce((sum, r) => sum + r.weekdayAADV, 0) / bikeResults.length;
          const avgBikeWeekendAADV = bikeResults.reduce((sum, r) => sum + r.weekendAADV, 0) / bikeResults.length;
          bikeWeekdayAADVs.push(avgBikeWeekdayAADV);
          if (avgBikeWeekendAADV > 0) { // Only include sites with weekend data
            bikeWeekendAADVs.push(avgBikeWeekendAADV);
          }
        }

        if (pedResults.length > 0) {
          const avgPedWeekdayAADV = pedResults.reduce((sum, r) => sum + r.weekdayAADV, 0) / pedResults.length;
          const avgPedWeekendAADV = pedResults.reduce((sum, r) => sum + r.weekendAADV, 0) / pedResults.length;
          pedWeekdayAADVs.push(avgPedWeekdayAADV);
          if (avgPedWeekendAADV > 0) { // Only include sites with weekend data
            pedWeekendAADVs.push(avgPedWeekendAADV);
          }
        }
      });

      // Calculate medians
      const calculateMedian = (values: number[]): number => {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
      };

      const finalResults = {
        totalCount: sitesResult.features.length,
        medianPedestrianWeekdayAADV: Math.round(calculateMedian(pedWeekdayAADVs) * 100) / 100,
        medianPedestrianWeekendAADV: Math.round(calculateMedian(pedWeekendAADVs) * 100) / 100,
        medianBikeWeekdayAADV: Math.round(calculateMedian(bikeWeekdayAADVs) * 100) / 100,
        medianBikeWeekendAADV: Math.round(calculateMedian(bikeWeekendAADVs) * 100) / 100,
      };

      return finalResults;
    } catch (error) {
      console.error('Error calculating enhanced AADV summary statistics:', error);
      return {
        totalCount: 0,
        medianPedestrianWeekdayAADV: 0,
        medianPedestrianWeekendAADV: 0,
        medianBikeWeekdayAADV: 0,
        medianBikeWeekendAADV: 0,
      };
    }
  }
}