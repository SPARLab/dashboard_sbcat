/**
 * Strava Segment Highlight Service
 * Handles highlighting incidents associated with a Strava segment
 */

import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import { StravaSegmentService } from "../data-services/StravaSegmentService";

export class StravaSegmentHighlightService {
  private highlightLayer: GraphicsLayer | null = null;
  private stravaService: StravaSegmentService;
  private mapView: __esri.MapView | null = null;
  private currentStravaId: number | null = null;

  constructor() {
    this.stravaService = new StravaSegmentService();
  }

  /**
   * Initialize the service with the map view
   */
  initialize(mapView: __esri.MapView): void {
    this.mapView = mapView;

    // Create highlight layer if it doesn't exist
    if (!this.highlightLayer) {
      this.highlightLayer = new GraphicsLayer({
        id: "safety-strava-segment-click-highlight",
        title: "Strava Segment Click Highlight",
        listMode: "hide"
      });
      mapView.map.add(this.highlightLayer);
    }
  }

  /**
   * Highlight a Strava segment and its associated incidents
   */
  async highlightSegmentAndIncidents(
    stravaId: number,
    incidentsLayer: __esri.FeatureLayer,
    jitteredIncidentsLayer: __esri.FeatureLayer
  ): Promise<void> {
    if (!this.highlightLayer || !this.mapView) {
      console.warn('StravaSegmentHighlightService not initialized');
      return;
    }

    // Store current strava_id
    this.currentStravaId = stravaId;

    // Clear previous highlights
    this.clearHighlights();

    console.log(`🔵 Highlighting segment ${stravaId} and its incidents`);

    try {
      // 1. Highlight the Strava segment line
      const segmentFeature = await this.stravaService.getSegmentByStravaId(stravaId);
      
      if (segmentFeature && segmentFeature.geometry) {
        // Create yellow halo line (wider, behind the main line)
        const haloSymbol = new SimpleLineSymbol({
          color: [255, 255, 0, 0.8], // Yellow halo
          width: 8,
          style: "solid"
        });

        // Create highlight line symbol (blue for clicked segments)
        const lineSymbol = new SimpleLineSymbol({
          color: [30, 144, 255, 1], // Dodger blue for clicked segments
          width: 4,
          style: "solid"
        });

        // Add halo first (so it appears behind)
        const haloGraphic = new Graphic({
          geometry: segmentFeature.geometry,
          symbol: haloSymbol
        });
        this.highlightLayer.add(haloGraphic);

        // Add main line on top
        const lineGraphic = new Graphic({
          geometry: segmentFeature.geometry,
          symbol: lineSymbol
        });
        this.highlightLayer.add(lineGraphic);

        // Zoom to the segment
        await this.mapView.goTo({
          target: segmentFeature.geometry,
          zoom: Math.max(this.mapView.zoom, 14) // Ensure at least zoom level 14
        });
      }

      // 2. Highlight associated incidents with blue outline
      await this.highlightIncidentsByStravaId(stravaId, incidentsLayer, jitteredIncidentsLayer);

    } catch (error) {
      console.error('Error highlighting segment and incidents:', error);
    }
  }

  /**
   * Highlight incidents that have the given strava_id
   */
  private async highlightIncidentsByStravaId(
    stravaId: number,
    incidentsLayer: __esri.FeatureLayer,
    jitteredIncidentsLayer: __esri.FeatureLayer
  ): Promise<void> {
    if (!this.highlightLayer) {
      console.error('❌ Highlight layer not initialized');
      return;
    }

    try {
      console.log(`🔍 Querying incidents with strava_id = ${stravaId}`);
      
      // Query the original layer to get incidents with this strava_id
      const query = incidentsLayer.createQuery();
      query.where = `strava_id = ${stravaId}`;
      query.outFields = ["OBJECTID", "id", "strava_id"];
      query.returnGeometry = false;

      const result = await incidentsLayer.queryFeatures(query);
      const incidentIds = result.features.map(f => f.attributes.id);

      console.log(`📊 Query result: ${incidentIds.length} incidents found`);
      console.log(`   Incident IDs:`, incidentIds);
      
      if (incidentIds.length === 0) {
        console.warn(`⚠️ No incidents found for segment ${stravaId}`);
        return;
      }

      console.log(`✅ Found ${incidentIds.length} incidents for segment ${stravaId}`);

      // Query the jittered layer using incident IDs (not OBJECTIDs)
      // The jittered layer is a client-side layer with different OBJECTIDs
      console.log(`🔍 Querying jittered layer using WHERE clause with incident IDs`);
      
      const jitteredQuery = jitteredIncidentsLayer.createQuery();
      // Use WHERE clause with incident IDs instead of objectIds
      jitteredQuery.where = `id IN (${incidentIds.join(',')})`;
      jitteredQuery.outFields = ["*"];
      jitteredQuery.returnGeometry = true;

      const jitteredResult = await jitteredIncidentsLayer.queryFeatures(jitteredQuery);
      
      console.log(`📊 Jittered layer returned ${jitteredResult.features.length} features`);

      // Create blue highlight symbols for incidents - making them more prominent
      // First add a larger outer halo for better visibility
      const outerHaloSymbol = new SimpleMarkerSymbol({
        style: "circle",
        color: [30, 144, 255, 0.2], // Very light blue outer halo
        size: 24,
        outline: {
          color: [30, 144, 255, 0.5], // Semi-transparent blue
          width: 2
        }
      });

      // Then add the main highlight circle
      const incidentHaloSymbol = new SimpleMarkerSymbol({
        style: "circle",
        color: [30, 144, 255, 0.4], // Light blue fill
        size: 16,
        outline: {
          color: [30, 144, 255, 1], // Dodger blue outline
          width: 4
        }
      });

      // Add incident highlights with double-ring effect
      console.log(`🎨 Creating blue highlight graphics for ${jitteredResult.features.length} incidents`);
      
      let addedGraphicsCount = 0;
      jitteredResult.features.forEach((feature, index) => {
        if (!feature.geometry) {
          console.warn(`⚠️ Feature ${index} has no geometry`);
          return;
        }
        
        // Add outer halo first
        const outerHaloGraphic = new Graphic({
          geometry: feature.geometry,
          symbol: outerHaloSymbol
        });
        this.highlightLayer?.add(outerHaloGraphic);

        // Add main highlight on top
        const incidentGraphic = new Graphic({
          geometry: feature.geometry,
          symbol: incidentHaloSymbol
        });
        this.highlightLayer?.add(incidentGraphic);
        addedGraphicsCount += 2; // outer + inner
      });

      console.log(`✅ Added ${addedGraphicsCount} graphics to highlight layer (${jitteredResult.features.length} incidents x 2)`);
      console.log(`📍 Highlight layer now has ${this.highlightLayer.graphics.length} total graphics`);

    } catch (error) {
      console.error('Error highlighting incidents:', error);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    if (this.highlightLayer) {
      this.highlightLayer.removeAll();
    }
    this.currentStravaId = null;
  }

  /**
   * Get the currently highlighted strava_id
   */
  getCurrentStravaId(): number | null {
    return this.currentStravaId;
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    if (this.highlightLayer && this.mapView?.map) {
      this.mapView.map.remove(this.highlightLayer);
    }
    this.highlightLayer = null;
    this.mapView = null;
    this.currentStravaId = null;
  }
}

