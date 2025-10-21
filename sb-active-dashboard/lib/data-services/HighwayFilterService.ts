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

// Updated to use enriched endpoint with segment_group_id for matching parallel lanes
const CALTRANS_HIGHWAYS_URL = 
  "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/SB_CaltransHighways_Enriched/FeatureServer/0";

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
    query.outFields = ["route", "route_name", "direction", "segment_group_id"];

      try {
        const result = await layer.queryFeatures(query);
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

      // Group by segment_group_id (parallel segments of the same highway)
      const segmentGroups = new Map<number, { name: string; geometries: Polyline[] }>();
      highways.forEach(feature => {
        const groupId = feature.attributes.segment_group_id;
        const routeName = feature.attributes.route_name || `Route ${feature.attributes.route}`;
        
        if (!segmentGroups.has(groupId)) {
          segmentGroups.set(groupId, { name: routeName, geometries: [] });
        }
        segmentGroups.get(groupId)!.geometries.push(feature.geometry as Polyline);
      });

      // Buffer and union within each segment group
      const highwaysByRoute = new Map<string, Polygon>();
      const allBuffers: Polygon[] = [];

      segmentGroups.forEach((group, groupId) => {
        try {
          // Buffer each segment in this group
          const buffers = group.geometries.map(geom => 
            geometryEngine.buffer(geom, bufferDistance, "feet") as Polygon
          );

          // Union all segments within this group (northbound + southbound)
          const groupBuffer = group.geometries.length === 1 
            ? buffers[0]
            : geometryEngine.union(buffers) as Polygon;

          highwaysByRoute.set(group.name, groupBuffer);
          allBuffers.push(groupBuffer);
        } catch (error) {
          console.error(`Failed to buffer segment group ${groupId}:`, error);
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
   * Query all segments with a given segment_group_id
   * NO spatial queries - just a simple attribute query!
   */
  static async querySegmentsByGroupId(
    segmentGroupId: number,
    routeName: string,
    direction: string
  ): Promise<Polyline[]> {
    try {
      const layer = this.getHighwayLayer();
      
      // Query for ALL segments with this segment_group_id (simple attribute query!)
      const groupQuery = layer.createQuery();
      groupQuery.where = `segment_group_id = ${segmentGroupId}`;
      groupQuery.returnGeometry = true;
      groupQuery.outFields = ["segment_group_id", "route_name", "direction"];
      
      const groupResult = await layer.queryFeatures(groupQuery);
      
      // ⚠️ Warning if multiple different highways share the same segment_group_id (backend data issue)
      const routeNames = new Set(groupResult.features.map(f => f.attributes.route_name));
      if (routeNames.size > 1) {
        console.warn(`⚠️ DATA ISSUE: segment_group_id=${segmentGroupId} contains multiple highways: ${Array.from(routeNames).join(', ')}`);
      }
      
      // Return all geometries with this segment_group_id
      const routeSegments = groupResult.features.map(f => f.geometry as Polyline);
      
      return routeSegments;
    } catch (error) {
      console.error('Failed to query highway segments by segment_group_id:', error);
      return [];
    }
  }

  /**
   * Visualize the highway buffer on the map
   * Overload 1: For polygon selections (shows all highways in polygon)
   * Overload 2: For highway line selections (shows specific highway by segment_group_id)
   */
  static async showHighwayBuffer(
    mapView: MapView,
    selectedGeometry: Polygon | Polyline | (Polygon & { attributes?: any }) | (Polyline & { attributes?: any }),
    segmentGroupId?: number,
    routeName?: string,
    direction?: string,
    bufferDistance = 75,
    colorMode: 'blue' | 'red' = 'blue' // Blue for selection, Red for exclusion
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

      let highwayBuffer: Polygon | null = null;

      // If a highway line is selected and we have attributes, buffer by segment_group_id
      if (selectedGeometry.type === 'polyline') {
        const attrs = (selectedGeometry as any).attributes;
        if (attrs && attrs.segment_group_id) {
          // Use attributes from the geometry object
          highwayBuffer = await this.bufferHighwayByGroupId(
            attrs.segment_group_id,
            attrs.route_name,
            attrs.direction,
            bufferDistance
          );
        } else if (segmentGroupId && routeName && direction) {
          // Use attributes passed as parameters
          highwayBuffer = await this.bufferHighwayByGroupId(
            segmentGroupId,
            routeName,
            direction,
            bufferDistance
          );
        } else {
          console.warn('⚠️ Cannot buffer highway - segment_group_id not available');
          return;
        }
      } else {
        // If a polygon is selected, query highways within it and create combined buffer
        highwayBuffer = await this.createCombinedHighwayBuffer(
          selectedGeometry as Polygon,
          bufferDistance
        );
      }

      if (!highwayBuffer) {
        console.log('🛣️ [Highway Visualization] No highway buffer created');
        return;
      }

      // Ensure the buffer has the same spatial reference as the map
      const mapSR = mapView.spatialReference;
      let displayBuffer = highwayBuffer;
      
      if (highwayBuffer.spatialReference.wkid !== mapSR.wkid) {
        console.log(`🛣️ [Highway Visualization] Projecting buffer from ${highwayBuffer.spatialReference.wkid} to ${mapSR.wkid}`);
        const projection = await import('@arcgis/core/geometry/projection');
        await projection.load();
        displayBuffer = projection.project(highwayBuffer, mapSR) as Polygon;
      }

      // Create visualization graphic with color based on context
      // Blue = selection/viewing, Red = exclusion/removal
      const fillColor = colorMode === 'red' 
        ? [255, 100, 100, 0.25]  // Semi-transparent red for exclusion
        : [100, 150, 255, 0.25]; // Semi-transparent blue for selection
      
      const outlineColor = colorMode === 'red'
        ? [255, 0, 0, 0.9]   // Solid red outline for exclusion
        : [0, 100, 255, 0.9]; // Solid blue outline for selection
      
      const bufferGraphic = new Graphic({
        geometry: displayBuffer,
        symbol: new SimpleFillSymbol({
          color: fillColor,
          outline: new SimpleLineSymbol({
            color: outlineColor,
            width: 2.5,
            style: "dash"
          })
        })
      });

      this.visualizationLayer.add(bufferGraphic);
      console.log('🛣️ [Highway Visualization] Buffer displayed on map');
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
    }
  }

  /**
   * Helper method: Buffer a highway by segment_group_id
   * This is used by spatial query hooks to ensure incidents near all lanes are found
   */
  static async bufferHighwayByGroupId(
    segmentGroupId: number,
    routeName: string,
    direction: string,
    bufferDistance = 75
  ): Promise<Polygon | null> {
    // Get all segments with this segment_group_id
    const routeSegments = await this.querySegmentsByGroupId(segmentGroupId, routeName, direction);
    
    if (routeSegments.length === 0) {
      console.warn(`No segments found for segment_group_id=${segmentGroupId}`);
      return null;
    }
    
    // Buffer each segment
    const buffers = routeSegments.map(segment => 
      geometryEngine.buffer(segment, bufferDistance, 'feet') as Polygon
    );
    
    // Union all buffers together
    const unionedBuffer = buffers.length > 1
      ? geometryEngine.union(buffers) as Polygon
      : buffers[0];
    
    return unionedBuffer;
  }

  /**
   * Clear the buffer cache (call when polygon changes)
   */
  static clearCache(): void {
    this.bufferCache.clear();
  }
}

