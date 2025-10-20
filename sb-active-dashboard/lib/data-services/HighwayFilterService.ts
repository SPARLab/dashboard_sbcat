/**
 * Highway Filter Service
 * Handles querying, buffering, and filtering incidents based on Caltrans highway proximity
 */

import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import MapView from "@arcgis/core/views/MapView";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { EnrichedSafetyIncident } from "../safety-app/types";

const CALTRANS_HIGHWAYS_URL = 
  "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/SB_CaltransHighways_Real/FeatureServer/0";

export interface HighwayBufferResult {
  combinedBuffer: Polygon | null;
  highwaysByRoute: Map<string, Polygon>;
  queryTime: number;
}

export interface HighwayFilterResult {
  onHighway: EnrichedSafetyIncident[];
  offHighway: EnrichedSafetyIncident[];
  totalFiltered: number;
}

export class HighwayFilterService {
  private static highwayLayer: FeatureLayer | null = null;
  private static bufferCache = new Map<string, HighwayBufferResult>();
  private static visualizationLayer: GraphicsLayer | null = null;

  /**
   * Initialize the highway layer
   */
  private static getHighwayLayer(): FeatureLayer {
    if (!this.highwayLayer || this.highwayLayer.destroyed) {
      this.highwayLayer = new FeatureLayer({
        url: CALTRANS_HIGHWAYS_URL,
        title: "Caltrans Highways",
        outFields: ["*"]
      });
    }
    return this.highwayLayer;
  }

  /**
   * Query highway segments that intersect with a polygon
   */
  static async queryHighwaysInPolygon(
    polygon: Polygon | Polyline
  ): Promise<__esri.Graphic[]> {
    const startTime = performance.now();
    const layer = this.getHighwayLayer();

    const query = layer.createQuery();
    query.geometry = polygon;
    query.spatialRelationship = "intersects";
    query.returnGeometry = true;
    query.outFields = ["route", "fullname", "rttyp", "linearid"];

    try {
      const result = await layer.queryFeatures(query);
      const queryTime = performance.now() - startTime;
      console.log(`🛣️ [Highway Query] Found ${result.features.length} highway segments in ${queryTime.toFixed(1)}ms`);
      return result.features;
    } catch (error) {
      console.error("Failed to query highways:", error);
      return [];
    }
  }

  /**
   * Create highway buffers grouped by route
   * Use for Scenario A: Selectable individual highways
   */
  static async createHighwayBuffersByRoute(
    polygon: Polygon | Polyline,
    bufferDistance = 75
  ): Promise<HighwayBufferResult> {
    const startTime = performance.now();
    
    // Query highway segments
    const highways = await this.queryHighwaysInPolygon(polygon);
    
    if (highways.length === 0) {
      return {
        combinedBuffer: null,
        highwaysByRoute: new Map(),
        queryTime: performance.now() - startTime
      };
    }

    // Group by route number
    const routeGroups = new Map<string, Polyline[]>();
    highways.forEach(feature => {
      const route = feature.attributes.route || "Unknown";
      if (!routeGroups.has(route)) {
        routeGroups.set(route, []);
      }
      routeGroups.get(route)!.push(feature.geometry as Polyline);
    });

    console.log(`🛣️ [Highway Buffering] Processing ${routeGroups.size} distinct routes`);

    // Buffer and union within each route
    const highwaysByRoute = new Map<string, Polygon>();
    const allBuffers: Polygon[] = [];

    routeGroups.forEach((geometries, route) => {
      try {
        // Buffer each segment in this route
        const buffers = geometries.map(geom => 
          geometryEngine.buffer(geom, bufferDistance, "feet") as Polygon
        );

        // Union all segments within this route
        const routeBuffer = geometries.length === 1 
          ? buffers[0]
          : geometryEngine.union(buffers) as Polygon;

        highwaysByRoute.set(route, routeBuffer);
        allBuffers.push(routeBuffer);

        console.log(`  ✓ ${route}: ${geometries.length} segments buffered`);
      } catch (error) {
        console.error(`Failed to buffer route ${route}:`, error);
      }
    });

    // Create combined buffer for Scenario B
    const combinedBuffer = allBuffers.length > 1
      ? geometryEngine.union(allBuffers) as Polygon
      : allBuffers[0];

    const totalTime = performance.now() - startTime;
    console.log(`🛣️ [Highway Buffering] Complete in ${totalTime.toFixed(1)}ms`);

    return {
      combinedBuffer,
      highwaysByRoute,
      queryTime: totalTime
    };
  }

  /**
   * Create a single combined highway buffer
   * Use for Scenario B: Exclude all highway incidents
   */
  static async createCombinedHighwayBuffer(
    polygon: Polygon | Polyline,
    bufferDistance = 75
  ): Promise<Polygon | null> {
    const result = await this.createHighwayBuffersByRoute(polygon, bufferDistance);
    return result.combinedBuffer;
  }

  /**
   * Filter incidents into "on highway" and "off highway" groups
   */
  static filterIncidentsByHighway(
    incidents: EnrichedSafetyIncident[],
    highwayBuffer: Polygon
  ): HighwayFilterResult {
    const startTime = performance.now();

    const onHighway: EnrichedSafetyIncident[] = [];
    const offHighway: EnrichedSafetyIncident[] = [];

    incidents.forEach(incident => {
      if (!incident.geometry) {
        // No geometry - can't determine location, assume off-highway
        offHighway.push(incident);
        return;
      }

      try {
        const isOnHighway = geometryEngine.contains(highwayBuffer, incident.geometry);
        if (isOnHighway) {
          onHighway.push(incident);
        } else {
          offHighway.push(incident);
        }
      } catch (error) {
        console.warn("Failed to check incident geometry:", error);
        offHighway.push(incident); // Default to off-highway if check fails
      }
    });

    const filterTime = performance.now() - startTime;
    console.log(
      `🛣️ [Highway Filter] Filtered ${incidents.length} incidents in ${filterTime.toFixed(1)}ms\n` +
      `   On Highway: ${onHighway.length} | Off Highway: ${offHighway.length}`
    );

    return {
      onHighway,
      offHighway,
      totalFiltered: onHighway.length
    };
  }

  /**
   * Complete workflow: Query highways, buffer, and filter incidents
   * This is the main entry point for the "Exclude Highway Incidents" toggle
   */
  static async filterIncidentsExcludingHighways(
    incidents: EnrichedSafetyIncident[],
    selectedPolygon: Polygon | Polyline,
    bufferDistance = 75
  ): Promise<EnrichedSafetyIncident[]> {
    try {
      // Create combined highway buffer
      const highwayBuffer = await this.createCombinedHighwayBuffer(
        selectedPolygon,
        bufferDistance
      );

      if (!highwayBuffer) {
        console.log("🛣️ [Highway Filter] No highways found in area, returning all incidents");
        return incidents;
      }

      // Filter incidents
      const result = this.filterIncidentsByHighway(incidents, highwayBuffer);
      return result.offHighway;
    } catch (error) {
      console.error("Failed to filter incidents by highway:", error);
      // On error, return all incidents (fail safe)
      return incidents;
    }
  }

  /**
   * Visualize the highway buffer on the map
   */
  static async showHighwayBuffer(
    mapView: MapView,
    selectedPolygon: Polygon | Polyline,
    bufferDistance = 75
  ): Promise<void> {
    try {
      // Create visualization layer if it doesn't exist
      if (!this.visualizationLayer) {
        this.visualizationLayer = new GraphicsLayer({
          id: "highway-buffer-visualization",
          title: "Highway Buffer (Excluded Areas)",
          listMode: "hide"
        });
      }

      // Clear existing graphics
      this.visualizationLayer.removeAll();

      // Add to map if not already added
      if (!mapView.map.layers.includes(this.visualizationLayer)) {
        mapView.map.add(this.visualizationLayer);
      }

      // Create highway buffer
      const highwayBuffer = await this.createCombinedHighwayBuffer(
        selectedPolygon,
        bufferDistance
      );

      if (!highwayBuffer) {
        console.log('🛣️ [Highway Visualization] No highways in this area to display');
        return;
      }

      // Create visualization graphic with semi-transparent red fill
      const bufferGraphic = new Graphic({
        geometry: highwayBuffer,
        symbol: new SimpleFillSymbol({
          color: [255, 100, 100, 0.3], // Semi-transparent red
          outline: new SimpleLineSymbol({
            color: [255, 0, 0, 0.8], // Solid red outline
            width: 2,
            style: "dash"
          })
        })
      });

      this.visualizationLayer.add(bufferGraphic);
      console.log('🛣️ [Highway Visualization] Highway buffer displayed on map');
    } catch (error) {
      console.error('Failed to visualize highway buffer:', error);
    }
  }

  /**
   * Hide the highway buffer visualization
   */
  static hideHighwayBuffer(mapView: MapView): void {
    if (this.visualizationLayer) {
      this.visualizationLayer.removeAll();
      
      if (mapView.map.layers.includes(this.visualizationLayer)) {
        mapView.map.remove(this.visualizationLayer);
      }
      
      console.log('🛣️ [Highway Visualization] Highway buffer removed from map');
    }
  }

  /**
   * Clear the buffer cache (call when polygon changes)
   */
  static clearCache(): void {
    this.bufferCache.clear();
  }
}

