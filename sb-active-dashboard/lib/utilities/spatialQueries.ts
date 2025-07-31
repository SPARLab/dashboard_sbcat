import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

interface AADTFeature {
  objectId: number;
  name: string;
  locality: string;
  all_aadt: number;
  weekday_aadt: number;
  weekend_aadt: number;
}

interface SpatialQueryResult {
  aadtFeatures: AADTFeature[];
  totalCount: number;
  averageAADT: number;
  totalAADT: number;
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
    query.outFields = ["OBJECTID", "name", "locality", "all_aadt", "weekday_aadt", "weekend_aadt"];
    query.returnGeometry = false;

    const results = await aadtLayer.queryFeatures(query);
    
    const aadtFeatures: AADTFeature[] = results.features.map(feature => ({
      objectId: feature.attributes.OBJECTID,
      name: feature.attributes.name || "Unknown",
      locality: feature.attributes.locality || "Unknown",
      all_aadt: feature.attributes.all_aadt || 0,
      weekday_aadt: feature.attributes.weekday_aadt || 0,
      weekend_aadt: feature.attributes.weekend_aadt || 0,
    }));

    const totalAADT = aadtFeatures.reduce((sum, feature) => sum + feature.all_aadt, 0);
    const averageAADT = aadtFeatures.length > 0 ? totalAADT / aadtFeatures.length : 0;

    return {
      aadtFeatures,
      totalCount: aadtFeatures.length,
      averageAADT: Math.round(averageAADT * 100) / 100,
      totalAADT: Math.round(totalAADT * 100) / 100,
    };
  } catch (error) {
    console.error("Error querying AADT features within polygon:", error);
    return {
      aadtFeatures: [],
      totalCount: 0,
      averageAADT: 0,
      totalAADT: 0,
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