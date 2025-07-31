/**
 * Geographic Boundaries Service - High-Performance Edition
 * This version uses a dedicated GraphicsLayer for highlighting, which is the most
 * performant method for complex, interactive feature layers.
 */
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import MapView from "@arcgis/core/views/MapView";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import Polygon from "@arcgis/core/geometry/Polygon";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

const BOUNDARY_LAYER_URLS = {
  CITIES: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/25", // Incorporated Places
  SERVICE_AREAS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/26" // Census Designated Places
};

interface GeographicLevel {
  id: 'city' | 'county' | 'census-tract' | 'hexagons' | 'custom' | 'city-service-area';
  name: string;
}

export class GeographicBoundariesService {
  private cityLayer: FeatureLayer;
  private serviceAreaLayer: FeatureLayer;
  private highlightLayer: GraphicsLayer;
  
  private mapView: MapView | null = null;
  
  // --- Interactivity State ---
  private hoveredGraphic: Graphic | null = null;
  private selectedGraphic: Graphic | null = null;
  private interactivityHandlers: __esri.Handle[] = [];
  private domHandlers: { element: HTMLElement, type: string, handler: EventListener }[] = [];
  private hitTestInProgress = false;
  private isMouseOverMap = false;
  private hoverCleanupTimeout: number | null = null;
  private lastPointerPosition: { x: number, y: number } | null = null;
  
  private abortController: AbortController | null = null;
  
  private selectedFeature: { objectId: number, layer: FeatureLayer } | null = null;
  
  // Selection change callback
  private onSelectionChange: ((geometry: Polygon | null) => void) | null = null;

  private hoverSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [255, 255, 0, 1], width: 4 })
  });

  private selectionSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [30, 144, 255, 1], width: 4 })
  });

  constructor() {
    const createBoundaryLayer = (url: string, title: string) => {
      return new FeatureLayer({
        url,
        title,
        visible: false,
        popupEnabled: false,
        outFields: ["OBJECTID", "NAME"],
        renderer: new SimpleRenderer({
          symbol: new SimpleFillSymbol({
            color: [0, 0, 0, 0],
            outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
          })
        })
      });
    };
    
    this.cityLayer = createBoundaryLayer(BOUNDARY_LAYER_URLS.CITIES, "Cities & Towns");
    this.serviceAreaLayer = createBoundaryLayer(BOUNDARY_LAYER_URLS.SERVICE_AREAS, "Census Designated Places");

    this.highlightLayer = new GraphicsLayer({
        title: "Boundary Highlights",
        listMode: "hide"
    });
  }

  getBoundaryLayers(): (FeatureLayer | GraphicsLayer)[] {
    return [this.cityLayer, this.serviceAreaLayer, this.highlightLayer];
  }
  
  setSelectionChangeCallback(callback: (geometry: Polygon | null) => void) {
    this.onSelectionChange = callback;
  }
  
  async switchGeographicLevel(level: GeographicLevel['id'], mapView: MapView) {
    this.hideAllBoundaryLayers();
    this.mapView = mapView;

    const layers: FeatureLayer[] = [];
    if (level === 'city' || level === 'city-service-area') {
      this.cityLayer.visible = true;
      layers.push(this.cityLayer);
    }
    if (level === 'city-service-area') {
      this.serviceAreaLayer.visible = true;
      layers.push(this.serviceAreaLayer);
    }

    if (layers.length > 0) {
      this.setupInteractivity(mapView, layers);
    }
  }
  
  private hideAllBoundaryLayers() {
    this.cleanupInteractivity();
    this.cityLayer.visible = false;
    this.serviceAreaLayer.visible = false;
  }
  
  
  private setupInteractivity(mapView: MapView, layers: FeatureLayer[]) {
    this.cleanupInteractivity();

    const pointerMoveHandler = mapView.on("pointer-move", (event) => {
        // Clear any pending hover cleanup since we have fresh mouse movement
        this.clearHoverCleanupTimeout();
        
        // Store the current pointer position for boundary checking
        this.lastPointerPosition = { x: event.x, y: event.y };
        
        if (!this.isMouseOverMap || this.hitTestInProgress) return;
        
        // Additional boundary check: ensure pointer is actually within map container
        if (!this.isPointerWithinMapBounds(event)) {
            this.scheduleHoverCleanup();
            return;
        }
        
        this.hitTestInProgress = true;

        mapView.hitTest(event, { include: layers })
            .then(response => {
                // Double-check we're still over the map when the async operation completes
                if (!this.isMouseOverMap) {
                    this.hitTestInProgress = false;
                    this.scheduleHoverCleanup();
                    return;
                }
                
                const graphic = response.results.length > 0 && response.results[0].type === "graphic" 
                    ? response.results[0].graphic 
                    : null;
                this.handleHover(graphic);
                this.hitTestInProgress = false;
            })
            .catch(err => {
                if (err.name !== "AbortError") console.error("hitTest failed:", err);
                this.hitTestInProgress = false;
            });
    });

    const clickHandler = mapView.on("click", (event) => {
      mapView.hitTest(event, { include: layers }).then(response => {
          const graphic = response.results.length > 0 && response.results[0].type === "graphic"
              ? response.results[0].graphic as Graphic
              : null;
          this.handleSelection(graphic);
      });
    });

    const stationaryHandle = reactiveUtils.when(
        () => mapView.stationary,
        () => this.refreshHighlight(),
        { initial: true }
    );

    if (mapView.container) {
        const mouseEnterHandler = () => { 
            this.isMouseOverMap = true;
            this.clearHoverCleanupTimeout();
        };
        const mouseLeaveHandler = () => {
            this.isMouseOverMap = false;
            // Use debounced cleanup to prevent flicker from race conditions
            this.scheduleHoverCleanup();
        };
        mapView.container.addEventListener("mouseenter", mouseEnterHandler);
        mapView.container.addEventListener("mouseleave", mouseLeaveHandler);
        this.domHandlers = [
            { element: mapView.container, type: 'mouseenter', handler: mouseEnterHandler },
            { element: mapView.container, type: 'mouseleave', handler: mouseLeaveHandler }
        ];
    }

    this.interactivityHandlers = [pointerMoveHandler, clickHandler, stationaryHandle];
  }
  
  private clearHoverCleanupTimeout() {
    if (this.hoverCleanupTimeout !== null) {
      clearTimeout(this.hoverCleanupTimeout);
      this.hoverCleanupTimeout = null;
    }
  }

  private scheduleHoverCleanup() {
    this.clearHoverCleanupTimeout();
    // Small delay to handle race conditions between mouseleave and pending pointer-move events
    this.hoverCleanupTimeout = window.setTimeout(() => {
      this.handleHover(null);
      this.hoverCleanupTimeout = null;
    }, 16); // One frame at 60fps - minimal but sufficient delay
  }

  private isPointerWithinMapBounds(event: any): boolean {
    if (!this.mapView?.container) return true;
    
    const rect = this.mapView.container.getBoundingClientRect();
    const { clientX, clientY } = event.native || event;
    
    return clientX >= rect.left && 
           clientX <= rect.right && 
           clientY >= rect.top && 
           clientY <= rect.bottom;
  }

  private handleHover(newlyHovered: Graphic | null) {
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }

    if (this.hoveredGraphic) {
      this.highlightLayer.remove(this.hoveredGraphic);
      this.hoveredGraphic = null;
    }
    
    const isSelected = newlyHovered?.attributes.OBJECTID === this.selectedFeature?.objectId;
    if (newlyHovered && !isSelected) {
        this.hoveredGraphic = new Graphic({
            geometry: newlyHovered.geometry,
            attributes: newlyHovered.attributes,
            symbol: this.hoverSymbol
        });
        this.highlightLayer.add(this.hoveredGraphic);
        if (this.mapView?.container) {
          this.mapView.container.style.cursor = "pointer";
        }
    }
  }
  
  private async handleSelection(clickedGraphic: Graphic | null) {
    if (this.hoveredGraphic) {
        this.highlightLayer.remove(this.hoveredGraphic);
        this.hoveredGraphic = null;
    }

    if (!clickedGraphic || clickedGraphic.attributes.OBJECTID === this.selectedFeature?.objectId) {
        this.clearSelection();
        this.selectedFeature = null;
        // Notify that selection was cleared
        if (this.onSelectionChange) {
          this.onSelectionChange(null);
        }
        return;
    }

    this.selectedFeature = {
        objectId: clickedGraphic.attributes.OBJECTID,
        layer: clickedGraphic.layer as FeatureLayer
    };

    this.clearSelection();
    
    // Optimistic update
    this.selectedGraphic = new Graphic({
        geometry: clickedGraphic.geometry,
        symbol: this.selectionSymbol,
        attributes: clickedGraphic.attributes
    });
    this.highlightLayer.add(this.selectedGraphic);

    this.refreshHighlight();
    
    // Notify about the new selection
    if (this.onSelectionChange && clickedGraphic.geometry) {
      this.onSelectionChange(clickedGraphic.geometry as Polygon);
    }
  }

  private async refreshHighlight() {
    if (this.abortController) {
      this.abortController.abort();
    }

    if (!this.selectedFeature) {
        this.clearSelection();
        return;
    }

    const { objectId, layer } = this.selectedFeature;
    const query = layer.createQuery();
    query.objectIds = [objectId];
    query.returnGeometry = true;

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
        const { features } = await layer.queryFeatures(query, { signal });
        if (features.length > 0) {
            if (this.selectedGraphic) {
                this.selectedGraphic.geometry = features[0].geometry;
            } else {
                this.selectedGraphic = new Graphic({
                    geometry: features[0].geometry,
                    symbol: this.selectionSymbol,
                    attributes: features[0].attributes
                });
                this.highlightLayer.add(this.selectedGraphic);
            }
        }
    } catch (error) {
        if ((error as any).name !== 'AbortError') {
            console.error("Failed to refresh highlight:", error);
        }
    } finally {
        this.abortController = null;
    }
  }

  private clearSelection() {
    if (this.selectedGraphic) {
      this.highlightLayer.remove(this.selectedGraphic);
      this.selectedGraphic = null;
    }
  }

  private cleanupInteractivity() {
    this.interactivityHandlers.forEach(handler => handler.remove());
    this.interactivityHandlers = [];

    this.domHandlers.forEach(({ element, type, handler }) => element.removeEventListener(type, handler));
    this.domHandlers = [];
    
    this.clearHoverCleanupTimeout();
    this.clearSelection();
    this.highlightLayer.removeAll();
    this.hoveredGraphic = null;
    this.selectedFeature = null;
    this.lastPointerPosition = null;
    
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }
  }
}