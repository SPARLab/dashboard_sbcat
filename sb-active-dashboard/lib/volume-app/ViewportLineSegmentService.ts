/**
 * Viewport Line Segment Service
 * Performance-focused implementation for line segment visualization using GraphicsLayer
 * Only renders line segments within the current viewport to prevent memory crashes
 */

import Extent from "@arcgis/core/geometry/Extent";
import Geometry from "@arcgis/core/geometry/Geometry";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import Polyline from "@arcgis/core/geometry/Polyline";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import MapView from "@arcgis/core/views/MapView";
import { getVolumeLevelColor } from "../../ui/theme/volumeLevelColors";

interface VolumeLineConfig {
  modelCountsBy: 'cost-benefit' | 'strava-bias';
  selectedYear: number;
  countType: 'bike' | 'ped';
  showBicyclist: boolean;
  showPedestrian: boolean;
}

interface LineSegmentData {
  edgeuid: number;
  geometry: Polyline;
  streetname?: string;
  aadt?: number;
  volumeLevel: 'low' | 'medium' | 'high';
}

const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";

export class ViewportLineSegmentService {
  private geometryLayer: FeatureLayer;
  private bikeGraphicsLayer: GraphicsLayer;
  private pedGraphicsLayer: GraphicsLayer;
  
  // Separate caching per count type for better performance
  private bikeCache: {
    currentExtent: Extent | null;
    preloadExtent: Extent | null;
    isLoading: boolean;
    loadingPromise: Promise<void> | null;
  } = {
    currentExtent: null,
    preloadExtent: null,
    isLoading: false,
    loadingPromise: null
  };
  
  private pedCache: {
    currentExtent: Extent | null;
    preloadExtent: Extent | null;
    isLoading: boolean;
    loadingPromise: Promise<void> | null;
  } = {
    currentExtent: null,
    preloadExtent: null,
    isLoading: false,
    loadingPromise: null
  };

  constructor() {
    // Initialize geometry layer (Layer 0: StravaNetwork)
    this.geometryLayer = new FeatureLayer({
      url: `${BASE_URL}/0`,
      title: "Line Segment Geometry",
      visible: false, // Hidden - used only for querying
      outFields: ["edgeuid", "streetname"]
    });

    // Create graphics layers for rendering
    this.bikeGraphicsLayer = new GraphicsLayer({
      title: "Bike Line Segments",
      visible: false,
      listMode: "hide" // Don't show in layer list
    });

    this.pedGraphicsLayer = new GraphicsLayer({
      title: "Pedestrian Line Segments", 
      visible: false,
      listMode: "hide" // Don't show in layer list
    });
  }

  /**
   * Get the layers that need to be added to the map
   */
  getLayers(): [FeatureLayer, GraphicsLayer, GraphicsLayer] {
    return [this.geometryLayer, this.bikeGraphicsLayer, this.pedGraphicsLayer];
  }

  /**
   * Get the graphics layers for visibility control
   */
  getGraphicsLayers(): { bike: GraphicsLayer; ped: GraphicsLayer } {
    return {
      bike: this.bikeGraphicsLayer,
      ped: this.pedGraphicsLayer
    };
  }

  /**
   * Query line segments within the specified extent
   */
  private async queryLinesInViewport(extent: Extent): Promise<__esri.Graphic[]> {
    const query = this.geometryLayer.createQuery();
    query.geometry = extent;
    query.spatialRelationship = "intersects";
    query.returnGeometry = true;
    query.outFields = ["edgeuid", "streetname"];
    query.where = "edgeuid IS NOT NULL AND edgeuid > 0";

    const result = await this.geometryLayer.queryFeatures(query);
    return result.features;
  }

  /**
   * Query volume data for the given edge IDs
   */
  private async queryVolumeData(edgeIds: number[], config: VolumeLineConfig): Promise<Map<string, number>> {
    if (edgeIds.length === 0) return new Map();

    try {
      // Use Layer 4 (combined data table) like the existing ModeledVolumeDataService
      const dataLayer = new FeatureLayer({
        url: `${BASE_URL}/4`,
        outFields: ["network_id", "aadt", "year", "count_type"]
      });

      const networkIdClauses = edgeIds.map(id => `network_id = 'edge_${id}'`);
      const whereClause = [
        `(${networkIdClauses.join(' OR ')})`,
        `year = ${config.selectedYear}`,
        `count_type = '${config.countType}'`,
        "aadt IS NOT NULL AND aadt > 0"
      ].join(" AND ");

      const query = dataLayer.createQuery();
      query.where = whereClause;
      query.outFields = ["network_id", "aadt"];
      query.returnGeometry = false;

      const result = await dataLayer.queryFeatures(query);
      
      const volumeMap = new Map<string, number>();
      result.features.forEach(feature => {
        const networkId = feature.attributes.network_id;
        const aadt = feature.attributes.aadt;
        if (networkId && aadt != null) {
          volumeMap.set(networkId, aadt);
        }
      });

      return volumeMap;
    } catch (error) {
      console.warn(`⚠️ Failed to query volume data for ${config.countType}:`, error);
      return new Map(); // Return empty map on error
    }
  }

  /**
   * Determine volume level based on AADT value
   */
  private getVolumeLevel(aadt: number): 'low' | 'medium' | 'high' {
    if (aadt < 50) return 'low';
    if (aadt < 200) return 'medium';
    return 'high';
  }

  /**
   * Create a styled line symbol based on volume level
   */
  private createVolumeLineSymbol(volumeLevel: 'low' | 'medium' | 'high'): SimpleLineSymbol {
    const color = getVolumeLevelColor(volumeLevel);
    const width = volumeLevel === 'high' ? 4 : volumeLevel === 'medium' ? 3 : 2;

    return new SimpleLineSymbol({
      color: color,
      width: width,
      style: "solid",
      cap: "round",
      join: "round"
    });
  }

  /**
   * Create graphics from line segment data
   */
  private createVolumeGraphics(lineData: LineSegmentData[]): Graphic[] {
    return lineData.map(line => {
      const symbol = this.createVolumeLineSymbol(line.volumeLevel);
      
      return new Graphic({
        geometry: line.geometry,
        symbol: symbol,
        attributes: {
          edgeuid: line.edgeuid,
          streetName: line.streetname || 'Unknown Street',
          aadt: line.aadt || 0,
          volumeLevel: line.volumeLevel
        },
        popupTemplate: {
          title: "Street Segment: {streetName}",
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "streetName", label: "Street Name" },
                { fieldName: "aadt", label: "Daily Volume (AADT)" },
                { fieldName: "volumeLevel", label: "Volume Level" }
              ]
            }
          ]
        }
      });
    });
  }

  /**
   * Process line segments and join with volume data
   */
  private async processLineSegments(
    lineFeatures: __esri.Graphic[], 
    config: VolumeLineConfig
  ): Promise<LineSegmentData[]> {
    const edgeIds = lineFeatures
      .map(f => f.attributes.edgeuid)
      .filter(id => id != null);

    const volumeData = await this.queryVolumeData(edgeIds, config);
    
    // If no volume data available, still create graphics with default styling
    const hasVolumeData = volumeData.size > 0;
    if (!hasVolumeData) {
      console.log(`ℹ️ No volume data available for ${config.countType}, using default styling`);
    }

    return lineFeatures.map(feature => {
      const edgeuid = feature.attributes.edgeuid;
      const networkId = `edge_${edgeuid}`;
      const aadt = volumeData.get(networkId) || 0;
      const volumeLevel = hasVolumeData ? this.getVolumeLevel(aadt) : 'medium'; // Default to medium if no data

      return {
        edgeuid,
        geometry: feature.geometry as Polyline,
        streetname: feature.attributes.streetname,
        aadt,
        volumeLevel
      };
    });
  }

  /**
   * Update graphics layer with new line segments
   */
  private updateGraphicsLayer(graphics: Graphic[], layer: GraphicsLayer): void {
    // Clear existing graphics
    layer.removeAll();
    
    // Add new graphics
    if (graphics.length > 0) {
      layer.addMany(graphics);
      console.log(`✅ Added ${graphics.length} line segment graphics to ${layer.title}`);
    }
  }

  /**
   * Calculate preload extent (larger area for background loading)
   */
  private calculatePreloadExtent(currentExtent: Extent, zoomLevel: number): Extent {
    // At zoom 16, preload a zoom 13 equivalent area
    const expansionFactor = zoomLevel >= 16 ? 8 : 4; // 2^3 = 8 for 3 zoom levels difference
    
    const centerX = (currentExtent.xmin + currentExtent.xmax) / 2;
    const centerY = (currentExtent.ymin + currentExtent.ymax) / 2;
    const width = (currentExtent.xmax - currentExtent.xmin) * expansionFactor;
    const height = (currentExtent.ymax - currentExtent.ymin) * expansionFactor;

    return new Extent({
      xmin: centerX - width / 2,
      ymin: centerY - height / 2,
      xmax: centerX + width / 2,
      ymax: centerY + height / 2,
      spatialReference: currentExtent.spatialReference
    });
  }

  /**
   * Load line segments for the current viewport
   */
  async loadViewportLineSegments(
    mapView: MapView, 
    config: VolumeLineConfig, 
    usePreloadExtent: boolean = false
  ): Promise<void> {
    const cache = this.getCache(config.countType);
    
    // Prevent concurrent loading for this count type
    if (cache.isLoading) {
      return cache.loadingPromise || Promise.resolve();
    }

    cache.isLoading = true;
    
    cache.loadingPromise = (async () => {
      try {
        const targetExtent = usePreloadExtent && cache.preloadExtent 
          ? cache.preloadExtent 
          : mapView.extent;

        console.log(`🔄 Loading line segments for ${config.countType} (extent: ${usePreloadExtent ? 'preload' : 'viewport'})`);

        // Query line segments in viewport
        const lineFeatures = await this.queryLinesInViewport(targetExtent);
        
        if (lineFeatures.length === 0) {
          console.log(`ℹ️ No line segments found in current extent for ${config.countType}`);
          return;
        }

        console.log(`📍 Found ${lineFeatures.length} line segments in extent`);

        // Process line segments with volume data (with fallback handling)
        const lineData = await this.processLineSegments(lineFeatures, config);
        
        if (lineData.length === 0) {
          console.log(`⚠️ No processable line data for ${config.countType}`);
          return;
        }
        
        // Create graphics
        const graphics = this.createVolumeGraphics(lineData);
        
        // Update appropriate graphics layer
        const targetLayer = config.countType === 'bike' 
          ? this.bikeGraphicsLayer 
          : this.pedGraphicsLayer;
          
        this.updateGraphicsLayer(graphics, targetLayer);

        // Update extent tracking for this count type
        if (usePreloadExtent) {
          cache.preloadExtent = targetExtent.clone();
        } else {
          cache.currentExtent = targetExtent.clone();
        }

      } catch (error) {
        console.error(`❌ Error loading line segments for ${config.countType}:`, error);
      } finally {
        cache.isLoading = false;
        cache.loadingPromise = null;
      }
    })();

    return cache.loadingPromise;
  }

  /**
   * Preload line segments for a larger area (background loading)
   */
  async preloadViewportData(mapView: MapView, config: VolumeLineConfig): Promise<void> {
    const cache = this.getCache(config.countType);
    
    // Calculate preload extent
    cache.preloadExtent = this.calculatePreloadExtent(mapView.extent, mapView.zoom);
    
    // Load with preload extent
    return this.loadViewportLineSegments(mapView, config, true);
  }

  /**
   * Get cache for specific count type
   */
  private getCache(countType: 'bike' | 'ped') {
    return countType === 'bike' ? this.bikeCache : this.pedCache;
  }

  /**
   * Check if extent has changed significantly enough to warrant reloading
   */
  private hasExtentChangedSignificantly(newExtent: Extent, countType: 'bike' | 'ped', usePreloadExtent: boolean = false): boolean {
    const cache = this.getCache(countType);
    const referenceExtent = usePreloadExtent ? cache.preloadExtent : cache.currentExtent;
    
    if (!referenceExtent) return true;

    // Calculate overlap percentage
    const intersection = geometryEngine.intersect(referenceExtent, newExtent) as Extent;
    if (!intersection) return true;

    const referenceArea = (referenceExtent.xmax - referenceExtent.xmin) * 
                         (referenceExtent.ymax - referenceExtent.ymin);
    const intersectionArea = (intersection.xmax - intersection.xmin) * 
                            (intersection.ymax - intersection.ymin);
    
    const overlapPercentage = intersectionArea / referenceArea;
    
    // Reload if less than 70% overlap
    return overlapPercentage < 0.7;
  }

  /**
   * Update line segments based on map view changes
   */
  async updateForViewChange(mapView: MapView, config: VolumeLineConfig): Promise<void> {
    // Only update if extent has changed significantly
    if (!this.hasExtentChangedSignificantly(mapView.extent, config.countType, false)) {
      return;
    }

    return this.loadViewportLineSegments(mapView, config);
  }

  /**
   * Set visibility of graphics layers
   */
  setVisibility(showBicyclist: boolean, showPedestrian: boolean): void {
    this.bikeGraphicsLayer.visible = showBicyclist;
    this.pedGraphicsLayer.visible = showPedestrian;
  }

  /**
   * Clear all graphics from both layers
   */
  clearAllGraphics(): void {
    this.bikeGraphicsLayer.removeAll();
    this.pedGraphicsLayer.removeAll();
    
    // Reset both caches
    this.bikeCache.currentExtent = null;
    this.bikeCache.preloadExtent = null;
    this.bikeCache.isLoading = false;
    this.bikeCache.loadingPromise = null;
    
    this.pedCache.currentExtent = null;
    this.pedCache.preloadExtent = null;
    this.pedCache.isLoading = false;
    this.pedCache.loadingPromise = null;
    
    console.log("🧹 Cleared all line segment graphics and caches");
  }

  /**
   * SMART LOADING: Handle zoom-based preloading and display
   * Preload at zoom 13, display at zoom 16
   */
  async handleSmartZoomLoading(
    mapView: MapView, 
    config: VolumeLineConfig, 
    zoomLevel: number
  ): Promise<void> {
    const cache = this.getCache(config.countType);
    
    // ZOOM 13+: Start preloading in background
    if (zoomLevel >= 13 && zoomLevel < 16) {
      if (!cache.preloadExtent || this.hasExtentChangedSignificantly(mapView.extent, config.countType, false)) {
        console.log(`🎯 SMART PRELOAD: Starting background load for ${config.countType} at zoom ${zoomLevel}`);
        await this.preloadViewportData(mapView, config);
      } else {
        console.log(`📦 SMART PRELOAD: Using cached preload data for ${config.countType}`);
      }
    }
    
    // ZOOM 16+: Display preloaded data instantly
    if (zoomLevel >= 16) {
      // Check if we can use preloaded data (extent overlap with preload extent)
      if (cache.preloadExtent && !this.hasExtentChangedSignificantly(mapView.extent, config.countType, true)) {
        console.log(`⚡ SMART DISPLAY: Using preloaded data for ${config.countType} at zoom ${zoomLevel}`);
        // Data is already loaded and displayed from preload
        return;
      } 
      // Check if we can use current viewport data (extent overlap with current extent)
      else if (cache.currentExtent && !this.hasExtentChangedSignificantly(mapView.extent, config.countType, false)) {
        console.log(`📦 SMART DISPLAY: Using cached viewport data for ${config.countType} at zoom ${zoomLevel}`);
        return;
      }
      else {
        // Load for current viewport if no suitable cached data
        console.log(`🔄 SMART DISPLAY: Loading current viewport for ${config.countType} at zoom ${zoomLevel}`);
        await this.loadViewportLineSegments(mapView, config);
      }
    }
  }

  /**
   * Check if line segments should be shown based on zoom level
   */
  static shouldShowLineSegments(zoomLevel: number): boolean {
    return zoomLevel >= 16;
  }

  /**
   * Check if we should start preloading based on zoom level
   */
  static shouldPreloadLineSegments(zoomLevel: number): boolean {
    return zoomLevel >= 13;
  }

  /**
   * Get zoom threshold for line segment display
   */
  static getZoomThreshold(): number {
    return 16;
  }

  /**
   * Get zoom threshold for preloading
   */
  static getPreloadThreshold(): number {
    return 13;
  }
}
