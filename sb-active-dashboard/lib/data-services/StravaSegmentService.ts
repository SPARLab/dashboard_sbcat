/**
 * Strava Segment Service
 * Handles querying the Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes
 * FeatureServer to get individual line segment geometries for highlighting
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";

export class StravaSegmentService {
  private networkLayer: FeatureLayer | null = null;

  constructor() {
    this.initializeLayer();
  }

  private initializeLayer() {
    // Layer 0: Network (for geometry)
    this.networkLayer = new FeatureLayer({
      url: `${BASE_URL}/0`,
      title: "Strava Segment Network (Query Only)",
      visible: false, // Never add to map, query only
      outFields: ["*"]
    });
  }

  /**
   * Get segment geometry by strava_id
   * Uses 'id' field in the Segment Network layer
   */
  async getSegmentByStravaId(stravaId: number): Promise<__esri.Graphic | null> {
    if (!this.networkLayer || !stravaId) {
      return null;
    }

    try {
      // Query using 'id' field (confirmed field name in Segment Network layer)
      const query = this.networkLayer.createQuery();
      query.where = `id = ${stravaId}`;
      query.outFields = ["*"];
      query.returnGeometry = true;

      const result = await this.networkLayer.queryFeatures(query);
      
      if (result.features.length > 0) {
        return result.features[0];
      }

      console.warn(`No segment found for id: ${stravaId}`);
      return null;

    } catch (error) {
      console.error('Error querying segment geometry:', error);
      return null;
    }
  }

  /**
   * Get multiple segments by an array of strava_ids
   */
  async getSegmentsByStravaIds(stravaIds: number[]): Promise<__esri.Graphic[]> {
    if (!this.networkLayer || !stravaIds.length) {
      return [];
    }

    try {
      const uniqueIds = Array.from(new Set(stravaIds)); // Remove duplicates
      
      // Query using 'id' field (confirmed field name in Segment Network layer)
      const query = this.networkLayer.createQuery();
      query.where = `id IN (${uniqueIds.join(',')})`;
      query.outFields = ["*"];
      query.returnGeometry = true;

      const result = await this.networkLayer.queryFeatures(query);
      return result.features;

    } catch (error) {
      console.error('Error querying multiple segment geometries:', error);
      return [];
    }
  }
}