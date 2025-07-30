/**
 * Spatial utilities for extent queries and geographic operations
 */

import MapView from "@arcgis/core/views/MapView";
import Geometry from "@arcgis/core/geometry/Geometry";
import Point from "@arcgis/core/geometry/Point";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

export class SpatialUtilService {
  /**
   * Get site IDs within current map extent
   */
  static async getSiteIdsInExtent(
    sitesLayer: FeatureLayer,
    mapView: MapView
  ): Promise<number[]> {
    const sitesQuery = sitesLayer.createQuery();
    sitesQuery.geometry = mapView.extent;
    sitesQuery.spatialRelationship = "intersects";
    sitesQuery.outFields = ["id"];
    sitesQuery.returnGeometry = false;

    const results = await sitesLayer.queryFeatures(sitesQuery);
    return results.features.map(f => f.attributes.id);
  }

  /**
   * Build spatial WHERE clause from site IDs
   */
  static buildSpatialWhereClause(siteIds: number[]): string {
    if (siteIds.length === 0) return "1=0";
    return `site_id IN (${siteIds.join(',')})`;
  }

  /**
   * Get default region based on map camera position (smart geographic selection)
   */
  static async getRegionForMapCenter(
    mapCenter: Point,
    geographicLevel: 'county' | 'city' | 'census-tract',
    regionLayer: FeatureLayer
  ): Promise<Geometry | null> {
    const query = regionLayer.createQuery();
    query.geometry = mapCenter;
    query.spatialRelationship = "contains";
    query.returnGeometry = true;
    query.outFields = ["*"];

    const results = await regionLayer.queryFeatures(query);
    return results.features.length > 0 ? results.features[0].geometry : null;
  }

  /**
   * Get fallback default regions (Santa Barbara County/City)
   */
  static async getFallbackDefaultRegion(
    geographicLevel: 'county' | 'city' | 'census-tract',
    regionLayer: FeatureLayer
  ): Promise<Geometry | null> {
    const defaultNames = {
      'county': 'Santa Barbara',
      'city': 'Santa Barbara',
      'census-tract': null // No default for census tracts
    };

    const defaultName = defaultNames[geographicLevel];
    if (!defaultName) return null;

    const query = regionLayer.createQuery();
    query.where = `name LIKE '%${defaultName}%'`;
    query.returnGeometry = true;
    query.outFields = ["*"];

    const results = await regionLayer.queryFeatures(query);
    return results.features.length > 0 ? results.features[0].geometry : null;
  }

  /**
   * Check if geometries intersect (for spatial filtering)
   */
  static async getIntersectingFeatures(
    layer: FeatureLayer,
    geometry: Geometry,
    outFields: string[] = ["*"]
  ): Promise<any[]> {
    const query = layer.createQuery();
    query.geometry = geometry;
    query.spatialRelationship = "intersects";
    query.outFields = outFields;
    query.returnGeometry = true;

    const results = await layer.queryFeatures(query);
    return results.features.map(f => ({ ...f.attributes, geometry: f.geometry }));
  }

  /**
   * Calculate extent/bounds for a set of geometries
   */
  static calculateExtentForGeometries(geometries: Geometry[]): __esri.Extent | null {
    // TODO: Implement extent calculation
    return null;
  }

  /**
   * Buffer a geometry by distance (for spatial tolerance)
   */
  static bufferGeometry(geometry: Geometry, distance: number, unit: string): Geometry {
    // TODO: Implement geometry buffering
    return geometry;
  }
}