import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const filteredValues = values.filter(val => val > 0); // Remove zero/null values
  if (filteredValues.length === 0) return 0;
  
  const sorted = filteredValues.sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

interface AADTFeature {
  objectId: number;
  name: string;
  locality: string;
  all_aadt: number;
  weekday_aadt: number;
  weekend_aadt: number;
}

interface SiteAADTData {
  siteId: number;
  siteName: string;
  pedestrianWeekdayAADT: number[];
  pedestrianWeekendAADT: number[];
  bikeWeekdayAADT: number[];
  bikeWeekendAADT: number[];
}

interface SpatialQueryResult {
  aadtFeatures: AADTFeature[];
  totalCount: number;
  averageAADT: number;
  totalAADT: number;
  medianPedestrianWeekdayAADT: number;
  medianPedestrianWeekendAADT: number;
  medianBikeWeekdayAADT: number;
  medianBikeWeekendAADT: number;
}

/**
 * Query AADT count sites that fall within the selected polygon
 */
export async function queryAADTWithinPolygon(
  aadtLayer: FeatureLayer, 
  selectedPolygon: Polygon
): Promise<SpatialQueryResult> {
  try {
    // Create a spatial query
    const query = aadtLayer.createQuery();
    query.geometry = selectedPolygon;
    query.spatialRelationship = "intersects";
    query.outFields = ["objectid"];
    query.returnGeometry = false;

    const results = await aadtLayer.queryFeatures(query);
    
    const aadtFeatures: AADTFeature[] = results.features.map(feature => ({
      objectId: feature.attributes.objectid,
      name: "Unknown",
      all_aadt: 0,
      weekday_aadt: 0,
      weekend_aadt: 0,
    }));

    const totalAADT = aadtFeatures.reduce((sum, feature) => sum + feature.all_aadt, 0);
    const averageAADT = aadtFeatures.length > 0 ? totalAADT / aadtFeatures.length : 0;

    return {
      aadtFeatures,
      totalCount: aadtFeatures.length,
      averageAADT: Math.round(averageAADT * 100) / 100,
      totalAADT: Math.round(totalAADT * 100) / 100,
      medianPedestrianWeekdayAADT: 0,
      medianPedestrianWeekendAADT: 0,
      medianBikeWeekdayAADT: 0,
      medianBikeWeekendAADT: 0,
    };
  } catch (error) {
    console.error("Error querying AADT features within polygon:", error);
    return {
      aadtFeatures: [],
      totalCount: 0,
      averageAADT: 0,
      totalAADT: 0,
      medianPedestrianWeekdayAADT: 0,
      medianPedestrianWeekendAADT: 0,
      medianBikeWeekdayAADT: 0,
      medianBikeWeekendAADT: 0,
    };
  }
}

/**
 * Query count sites with median AADT calculations for volume app
 * Uses the three-table structure: Sites (geometry), AADT (aggregated data)
 */
export async function queryVolumeCountSitesWithinPolygon(
  sitesLayer: FeatureLayer,
  aadtTable: FeatureLayer,
  selectedPolygon: Polygon
): Promise<SpatialQueryResult> {
  try {
    // First, query the Sites layer for sites within the polygon
    const sitesQuery = sitesLayer.createQuery();
    sitesQuery.geometry = selectedPolygon;
    sitesQuery.spatialRelationship = "intersects";
    sitesQuery.outFields = ["id", "name"];
    sitesQuery.returnGeometry = false;

    const sitesResults = await sitesLayer.queryFeatures(sitesQuery);
    
    if (sitesResults.features.length === 0) {
      return {
        aadtFeatures: [],
        totalCount: 0,
        averageAADT: 0,
        totalAADT: 0,
        medianPedestrianWeekdayAADT: 0,
        medianPedestrianWeekendAADT: 0,
        medianBikeWeekdayAADT: 0,
        medianBikeWeekendAADT: 0,
      };
    }

    // Get the site IDs
    const siteIds = sitesResults.features.map(feature => feature.attributes.id);
    
    // Query the AADT table for these site IDs
    const aadtQuery = aadtTable.createQuery();
    aadtQuery.where = `site_id IN (${siteIds.join(',')})`;
    aadtQuery.outFields = ["site_id", "count_type", "all_aadt", "weekday_aadt", "weekend_aadt"];
    aadtQuery.returnGeometry = false;

    const aadtResults = await aadtTable.queryFeatures(aadtQuery);
    
    // Organize data by site and count type
    const pedestrianWeekdayAADTs: number[] = [];
    const pedestrianWeekendAADTs: number[] = [];
    const bikeWeekdayAADTs: number[] = [];
    const bikeWeekendAADTs: number[] = [];
    const allAADTs: number[] = [];

    aadtResults.features.forEach(feature => {
      const attrs = feature.attributes;
      const countType = attrs.count_type;
      const weekdayAADT = attrs.weekday_aadt || 0;
      const weekendAADT = attrs.weekend_aadt || 0;
      const allAADT = attrs.all_aadt || 0;

      if (countType === 'ped') {
        if (weekdayAADT > 0) pedestrianWeekdayAADTs.push(weekdayAADT);
        if (weekendAADT > 0) pedestrianWeekendAADTs.push(weekendAADT);
      } else if (countType === 'bike') {
        if (weekdayAADT > 0) bikeWeekdayAADTs.push(weekdayAADT);
        if (weekendAADT > 0) bikeWeekendAADTs.push(weekendAADT);
      }
      
      if (allAADT > 0) allAADTs.push(allAADT);
    });

    // Calculate medians
    const medianPedestrianWeekdayAADT = Math.round(calculateMedian(pedestrianWeekdayAADTs) * 100) / 100;
    const medianPedestrianWeekendAADT = Math.round(calculateMedian(pedestrianWeekendAADTs) * 100) / 100;
    const medianBikeWeekdayAADT = Math.round(calculateMedian(bikeWeekdayAADTs) * 100) / 100;
    const medianBikeWeekendAADT = Math.round(calculateMedian(bikeWeekendAADTs) * 100) / 100;

    const totalAADT = allAADTs.reduce((sum, val) => sum + val, 0);
    const averageAADT = allAADTs.length > 0 ? totalAADT / allAADTs.length : 0;

    // Create legacy aadtFeatures for compatibility (using site data)
    const aadtFeatures: AADTFeature[] = sitesResults.features.map(feature => ({
      objectId: feature.attributes.id,
      name: feature.attributes.name || "Unknown",
      locality: "Unknown", // Not available in this query
      all_aadt: 0, // Would need aggregation to calculate
      weekday_aadt: 0,
      weekend_aadt: 0,
    }));

    return {
      aadtFeatures,
      totalCount: sitesResults.features.length,
      averageAADT: Math.round(averageAADT * 100) / 100,
      totalAADT: Math.round(totalAADT * 100) / 100,
      medianPedestrianWeekdayAADT,
      medianPedestrianWeekendAADT,
      medianBikeWeekdayAADT,
      medianBikeWeekendAADT,
    };
  } catch (error) {
    console.error("Error querying volume count sites within polygon:", error);
    return {
      aadtFeatures: [],
      totalCount: 0,
      averageAADT: 0,
      totalAADT: 0,
      medianPedestrianWeekdayAADT: 0,
      medianPedestrianWeekendAADT: 0,
      medianBikeWeekdayAADT: 0,
      medianBikeWeekendAADT: 0,
    };
  }
}

/**
 * Check if any features from a layer intersect with the selected polygon
 * This is useful for modeled volume layers
 */
export async function checkLayerIntersection(
  layer: FeatureLayer | VectorTileLayer,
  selectedPolygon: Polygon
): Promise<boolean> {
  try {
    if (layer instanceof FeatureLayer) {
      const query = layer.createQuery();
      query.geometry = selectedPolygon;
      query.spatialRelationship = "intersects";
      query.returnGeometry = false;
      query.returnCountOnly = true;

      const result = await layer.queryFeatureCount(query);
      return result > 0;
    }
    
    // For VectorTileLayer, we'll assume intersection for now
    // as spatial queries are more complex with vector tiles
    return true;
  } catch (error) {
    console.error("Error checking layer intersection:", error);
    return false;
  }
}

/**
 * Get a summary description of the selected area
 */
export function getSelectedAreaDescription(
  selectedPolygon: Polygon,
  aadtResult: SpatialQueryResult
): string {
  const area = geometryEngine.geodesicArea(selectedPolygon, "square-miles");
  const areaRounded = Math.round(area * 100) / 100;
  
  if (aadtResult.totalCount === 0) {
    return `Selected area (${areaRounded} sq mi) contains no count sites.`;
  }
  
  return `Selected area (${areaRounded} sq mi) contains ${aadtResult.totalCount} count site${aadtResult.totalCount === 1 ? '' : 's'} with an average AADT of ${aadtResult.averageAADT}.`;
}