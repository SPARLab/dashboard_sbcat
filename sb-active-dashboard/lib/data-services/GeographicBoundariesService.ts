/**
 * Geographic Boundaries Service
 * Handles region, city, census tract, and other geographic boundary layers
 */
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import Point from "@arcgis/core/geometry/Point";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";

const BOUNDARY_LAYER_URLS = {
  CITIES: "https://carto.nationalmap.gov/arcgis/rest/services/govunits/MapServer/24",
  // Other URLs are omitted for brevity but would be here in a real app
};

interface GeographicLevel {
  id: 'county' | 'city' | 'census-tract' | 'hexagons' | 'custom';
  name: string;
  layer?: FeatureLayer;
}

interface SelectedArea {
  id: string;
  name: string;
  geometry: __esri.Geometry;
  level: string;
}

export class GeographicBoundariesService {
  private cityLayer: FeatureLayer | null = null;
  // Other layer properties omitted for brevity
  
  private currentLevel: GeographicLevel['id'] = 'city';
  private selectedArea: SelectedArea | null = null;
  private mapView: MapView | null = null;
  
  // --- New High-Performance Interactivity State ---
  private cityLayerRenderer: UniqueValueRenderer | null = null;
  private selectedFeatureId: number | string | null = null;
  private hoveredFeatureId: number | string | null = null;
  private interactivityHandlers: __esri.Handle[] = [];
  private hitTestInProgress = false;
  // ---

  private defaultSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
  });

  private selectedSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [30, 144, 255, 1], width: 3 })
  });
  
  private hoverSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [255, 255, 0, 1], width: 3 })
  });

  constructor() {
    this.initializeLayers();
  }

  private initializeLayers() {
    try {
      if (BOUNDARY_LAYER_URLS.CITIES) {
        this.cityLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.CITIES,
          title: "Cities & Towns",
          visible: false,
          popupEnabled: false,
          outFields: ["OBJECTID", "NAME", "NAMELSAD"],
          // Initial renderer is simple; it will be replaced by the interactive one.
          renderer: new SimpleRenderer({ symbol: this.defaultSymbol })
        });
      }
      console.log("Geographic Boundaries Service: Boundary layers initialized successfully");
    } catch (error) {
      console.error("Geographic Boundaries Service: Error initializing layers:", error);
    }
  }

  getBoundaryLayers(): FeatureLayer[] {
    const layers: FeatureLayer[] = [];
    if (this.cityLayer) layers.push(this.cityLayer);
    return layers;
  }
  
  async switchGeographicLevel(level: GeographicLevel['id'], mapView: MapView) {
    this.currentLevel = level;
    this.hideAllBoundaryLayers();
    this.mapView = mapView;

    if (level === 'city' && this.cityLayer) {
        this.cityLayer.visible = true;
        this.setupCityInteractivity(mapView);
        // Additional logic for default selection can be added here
    }
  }
  
  private hideAllBoundaryLayers() {
    this.cleanupInteractivity();
    if (this.cityLayer) this.cityLayer.visible = false;
  }
  
  private setupCityInteractivity(mapView: MapView) {
    if (!this.cityLayer) return;
    this.cleanupInteractivity();

    // Create the renderer ONCE. This is the key to performance.
    this.cityLayerRenderer = new UniqueValueRenderer({
        field: "OBJECTID",
        defaultSymbol: this.defaultSymbol,
        uniqueValueInfos: [],
    });
    this.cityLayer.renderer = this.cityLayerRenderer;

    const pointerMoveHandler = mapView.on("pointer-move", (event) => {
        if (this.hitTestInProgress) return;
        this.hitTestInProgress = true;

        mapView.hitTest(event, { include: [this.cityLayer!] })
            .then(response => {
                const newHoveredFeature = response.results.length > 0 ? response.results[0].graphic : null;
                const newHoveredId = newHoveredFeature?.attributes.OBJECTID || null;

                if (this.hoveredFeatureId !== newHoveredId) {
                    this.hoveredFeatureId = newHoveredId;
                    this.updateRenderer();
                }
                mapView.container.style.cursor = newHoveredId ? "pointer" : "default";
                this.hitTestInProgress = false;
            })
            .catch(err => {
                if (err.name !== "AbortError") console.error("hitTest failed:", err);
                this.hitTestInProgress = false;
            });
    });

    const clickHandler = mapView.on("click", (event) => {
        if (this.hoveredFeatureId) {
            this.selectedFeatureId = this.hoveredFeatureId;
            this.hoveredFeatureId = null; // Clear hover on selection
            this.updateRenderer();
        } else {
            // Fallback for clicks without a prior hover
            mapView.hitTest(event, { include: [this.cityLayer!] }).then((hit) => {
                if (hit.results.length > 0) {
                    this.selectedFeatureId = hit.results[0].graphic.attributes.OBJECTID;
                    this.hoveredFeatureId = null;
                    this.updateRenderer();
                }
            });
        }
    });

    this.interactivityHandlers = [pointerMoveHandler, clickHandler];
  }

  private cleanupInteractivity() {
    this.interactivityHandlers.forEach(handler => handler.remove());
    this.interactivityHandlers = [];
    this.selectedFeatureId = null;
    this.hoveredFeatureId = null;
    
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }
    // Reset to a simple renderer when not interactive
    if (this.cityLayer) {
        this.cityLayer.renderer = new SimpleRenderer({ symbol: this.defaultSymbol });
    }
  }
  
  /**
   * Updates the renderer by modifying its uniqueValueInfos and then assigning
   * a clone of itself back to the layer to trigger a redraw. This is much
   * faster than creating a new renderer from scratch on each interaction.
   */
  private updateRenderer() {
    if (!this.cityLayer || !this.cityLayerRenderer) return;

    const infos: any[] = [];
    
    // Selected features get styled first.
    if (this.selectedFeatureId) {
      infos.push({
        value: this.selectedFeatureId,
        symbol: this.selectedSymbol,
      });
    }

    // Hovered features are styled only if they are not also selected.
    if (this.hoveredFeatureId && this.hoveredFeatureId !== this.selectedFeatureId) {
      infos.push({
        value: this.hoveredFeatureId,
        symbol: this.hoverSymbol,
      });
    }

    // Mutate the existing renderer's properties.
    this.cityLayerRenderer.uniqueValueInfos = infos;
    
    // Assign a clone to the layer to trigger a fast redraw.
    this.cityLayer.renderer = this.cityLayerRenderer.clone();
  }
}
