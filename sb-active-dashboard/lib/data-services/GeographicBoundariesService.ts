/**
 * Geographic Boundaries Service - High-Performance Edition
 * This version uses a dedicated GraphicsLayer for highlighting, which is the most
 * performant method for complex, interactive feature layers.
 */
import Polygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import MapView from "@arcgis/core/views/MapView";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

const BOUNDARY_LAYER_URLS = {
  CITIES: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/25", // Incorporated Places
  SERVICE_AREAS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/26", // Census Designated Places
  COUNTIES: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1", // Counties
  CENSUS_TRACTS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0" // Census Tracts
};

interface GeographicLevel {
  id: 'city' | 'county' | 'census-tract' | 'hexagons' | 'custom' | 'city-service-area';
  name: string;
}

export class GeographicBoundariesService {
  private cityLayer: FeatureLayer;
  private serviceAreaLayer: FeatureLayer;
  private countyLayer: FeatureLayer;
  private censusTractLayer: FeatureLayer;
  private highlightLayer: GraphicsLayer;
  
  private mapView: MapView | null = null;
  
  // --- Enhanced State Management ---
  private hoveredGraphic: Graphic | null = null;
  private selectedGraphic: Graphic | null = null;
  private interactivityHandlers: __esri.Handle[] = [];
  private domHandlers: { element: HTMLElement, type: string, handler: EventListener }[] = [];
  private hitTestInProgress = false;
  private isMouseOverMap = false;
  private hoverCleanupTimeout: number | null = null;
  private lastScreenPosition: { x: number, y: number } | null = null;
  private lastClientPosition: { x: number, y: number } | null = null;
  
  // --- New State Tracking ---
  private isMapReady = false;
  private isInteractivityActive = false;
  private currentGeographicLevel: GeographicLevel['id'] | null = null;
  private layerRecreationPending = false;
  private initializationPromise: Promise<void> | null = null;
  private isInteractivityFullyReady = false; // New flag to track when interactivity is truly ready
  
  private abortController: AbortController | null = null;
  
  private selectedFeature: { objectId: number, layer: FeatureLayer } | null = null;
  
  // Selection change callback - supports both legacy and new format
  private onSelectionChange: ((data: { geometry: Polygon | null; areaName?: string | null } | Polygon | null) => void) | null = null;

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
        minScale: 0, // No minimum scale limit - visible at all zoom levels
        maxScale: 0, // No maximum scale limit - visible at all zoom levels
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
    this.countyLayer = createBoundaryLayer(BOUNDARY_LAYER_URLS.COUNTIES, "Counties");
    this.censusTractLayer = createBoundaryLayer(BOUNDARY_LAYER_URLS.CENSUS_TRACTS, "Census Tracts");

    this.highlightLayer = new GraphicsLayer({
        title: "Boundary Highlights",
        listMode: "hide"
    });
  }

  getBoundaryLayers(): (FeatureLayer | GraphicsLayer)[] {
    return [this.cityLayer, this.serviceAreaLayer, this.countyLayer, this.censusTractLayer, this.highlightLayer];
  }
  
  setSelectionChangeCallback(callback: (data: { geometry: Polygon | null; areaName?: string | null } | Polygon | null) => void) {
    this.onSelectionChange = callback;
  }

  /**
   * Enhanced method to wait for map to be fully ready before setting up interactivity
   */
  private async waitForMapReady(mapView: MapView): Promise<void> {
    if (this.isMapReady && mapView.stationary) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Wait for both the view to be ready and stationary, plus a small delay for rendering
      const checkReady = () => {
        if (mapView.ready && mapView.stationary) {
          // Add a small delay to ensure layers are fully rendered
          setTimeout(() => {
            this.isMapReady = true;
            console.log('[DEBUG] Map is fully ready and stationary, layers should be rendered');
            resolve();
          }, 100); // 100ms delay to ensure rendering is complete
        } else {
          // Use requestAnimationFrame for smooth checking
          requestAnimationFrame(checkReady);
        }
      };
      
      checkReady();
    });
  }

  /**
   * Completely recreate the highlight layer to fix rendering corruption
   */
  private recreateHighlightLayer(mapView: MapView): void {
    console.log('[DEBUG] Recreating highlight layer to fix rendering corruption...');
    
    // Remove the old layer from the map
    if (this.highlightLayer && mapView.map) {
      const layers = mapView.map.layers;
      if (layers.includes(this.highlightLayer)) {
        mapView.map.remove(this.highlightLayer);
        console.log('[DEBUG] Removed old highlight layer from map');
      }
    }
    
    // Clear all references
    this.hoveredGraphic = null;
    this.selectedGraphic = null;
    
    // Create a brand new GraphicsLayer
    this.highlightLayer = new GraphicsLayer({
      title: "Boundary Highlights",
      listMode: "hide"
    });
    
    // Add the new layer to the map
    if (mapView.map) {
      mapView.map.add(this.highlightLayer);
      
      // Verify the layer was added successfully
      if (mapView.map.layers.includes(this.highlightLayer)) {
        console.log('[DEBUG] Highlight layer recreated and added to map successfully');
      } else {
        console.error('[DEBUG] Failed to add recreated highlight layer to map');
      }
    }
  }
  
  async switchGeographicLevel(level: GeographicLevel['id'], mapView: MapView) {
    // Store the current level for potential recreation
    this.currentGeographicLevel = level;
    
    // If we're switching from custom mode, we need to recreate the highlight layer
    if (this.layerRecreationPending) {
      this.recreateHighlightLayer(mapView);
      this.layerRecreationPending = false;
    }
    
    this.hideAllBoundaryLayers();
    this.mapView = mapView;

    // Wait for map to be fully ready before setting up interactivity
    await this.waitForMapReady(mapView);

    const layers: FeatureLayer[] = [];
    if (level === 'city' || level === 'city-service-area') {
      this.cityLayer.visible = true;
      layers.push(this.cityLayer);
    }
    if (level === 'city-service-area') {
      this.serviceAreaLayer.visible = true;
      layers.push(this.serviceAreaLayer);
    }
    if (level === 'county') {
      this.countyLayer.visible = true;
      layers.push(this.countyLayer);
    }
    if (level === 'census-tract') {
      this.censusTractLayer.visible = true;
      layers.push(this.censusTractLayer);
    }

    if (layers.length > 0) {
      this.setupInteractivity(mapView, layers);
    }
  }
  
  private hideAllBoundaryLayers() {
    this.cleanupInteractivity();
    this.cityLayer.visible = false;
    this.serviceAreaLayer.visible = false;
    this.countyLayer.visible = false;
    this.censusTractLayer.visible = false;
  }
  
  /**
   * Mark that layer recreation is needed after SketchViewModel usage
   */
  public markLayerRecreationNeeded(): void {
    this.layerRecreationPending = true;
    console.log('[DEBUG] Marked highlight layer for recreation after SketchViewModel usage');
  }
  
  private setupInteractivity(mapView: MapView, layers: FeatureLayer[]) {
    // Clean up any existing interactivity
    this.cleanupInteractivity();

    console.log('[DEBUG] Setting up interactivity with layers:', layers.map(l => l.title));

    // ALWAYS recreate the highlight layer to ensure it's not corrupted
    console.log('[DEBUG] Recreating highlight layer for fresh start');
    this.recreateHighlightLayer(mapView);

    // Verify layers are visible and properly configured
    layers.forEach(layer => {
      console.log(`[DEBUG] Layer ${layer.title}: visible=${layer.visible}, loaded=${layer.loaded}`);
      if (!layer.visible) {
        console.warn(`[DEBUG] Warning: Layer ${layer.title} is not visible!`);
      }
      if (!layer.loaded) {
        console.warn(`[DEBUG] Warning: Layer ${layer.title} is not loaded!`);
      }
    });

    // Additional check: ensure all layers are ready for interaction
    const allLayersReady = layers.every(layer => layer.visible && layer.loaded);
    if (!allLayersReady) {
      console.warn('[DEBUG] Not all layers are ready for interaction, waiting...');
      // Wait a bit more for layers to be ready
      setTimeout(() => {
        console.log('[DEBUG] Retrying interactivity setup after delay');
        this.setupInteractivity(mapView, layers);
      }, 200);
      return;
    }

    // Set up mouse event handlers first, but don't process events yet
    if (mapView.container) {
        const mouseEnterHandler = () => { 
            this.isMouseOverMap = true;
            this.clearHoverCleanupTimeout();
            console.log('[DEBUG] Mouse entered map');
        };
        const mouseLeaveHandler = () => {
            this.isMouseOverMap = false;
            // Use debounced cleanup to prevent flicker from race conditions
            this.scheduleHoverCleanup();
            console.log('[DEBUG] Mouse left map');
        };
        
        // CRITICAL FIX: Add DOM-level mouse move handler to always capture position
        const mouseMoveHandler = (event: Event) => {
            const mouseEvent = event as MouseEvent;
            this.lastClientPosition = { x: mouseEvent.clientX, y: mouseEvent.clientY };
            
            // Convert client coordinates to map coordinates
            const point = this.mapView?.toMap({ x: mouseEvent.clientX, y: mouseEvent.clientY });
            if (point) {
                const rectLocal = mapView.container!.getBoundingClientRect();
            this.lastScreenPosition = { x: mouseEvent.clientX - rectLocal.left, y: mouseEvent.clientY - rectLocal.top };
            }

            console.log(`[DEBUG] DOM mouse move captured: client=(${mouseEvent.clientX}, ${mouseEvent.clientY}), screen=(${this.lastScreenPosition?.x}, ${this.lastScreenPosition?.y})`);
        };
        
        mapView.container.addEventListener("mouseenter", mouseEnterHandler);
        mapView.container.addEventListener("mouseleave", mouseLeaveHandler);
        mapView.container.addEventListener("mousemove", mouseMoveHandler);
        
        // CRITICAL FIX: Check if mouse is already over the map when handlers are attached
        const rect = mapView.container.getBoundingClientRect();
        const currentMouseX = this.lastClientPosition?.x || 0;
        const currentMouseY = this.lastClientPosition?.y || 0;
        const isMouseAlreadyOver = currentMouseX >= rect.left && currentMouseX <= rect.right && 
                                  currentMouseY >= rect.top && currentMouseY <= rect.bottom;
        
        if (isMouseAlreadyOver && !this.isMouseOverMap) {
            console.log('[DEBUG] Mouse is already over map when handlers attached, triggering enter logic');
            this.isMouseOverMap = true;
        }
        
        this.domHandlers = [
            { element: mapView.container, type: 'mouseenter', handler: mouseEnterHandler },
            { element: mapView.container, type: 'mouseleave', handler: mouseLeaveHandler },
            { element: mapView.container, type: 'mousemove', handler: mouseMoveHandler }
        ];
    }

    // Set up pointer move handler with readiness check
    const pointerMoveHandler = mapView.on("pointer-move", (event) => {
        // ALWAYS capture the pointer position for re-processing logic
        this.lastScreenPosition = { x: event.x, y: event.y };
        
        // Also update client position from the native event
        if (event.native) {
            const nativeEvent = event.native as MouseEvent;
            this.lastClientPosition = { x: nativeEvent.clientX, y: nativeEvent.clientY };
        }
        
        // Only process hover logic if interactivity is fully ready
        if (!this.isInteractivityFullyReady) {
            console.log('[DEBUG] Captured pointer position but ignoring hover - interactivity not fully ready');
            return;
        }

        // Clear any pending hover cleanup since we have fresh mouse movement
        this.clearHoverCleanupTimeout();
        
        if (!this.isMouseOverMap || this.hitTestInProgress) return;
        
        // Additional boundary check: ensure pointer is actually within map container
        if (!this.isPointerWithinMapBounds(event)) {
            this.scheduleHoverCleanup();
            return;
        }
        
        this.hitTestInProgress = true;
        console.log('[DEBUG] Starting hit test with layers:', layers.map(l => l.title));

        mapView.hitTest(event, { include: layers })
            .then(response => {
                console.log('[DEBUG] Hit test response:', response.results.length, 'results');
                
                // Double-check we're still over the map when the async operation completes
                if (!this.isMouseOverMap) {
                    this.hitTestInProgress = false;
                    this.scheduleHoverCleanup();
                    return;
                }
                
                const graphic = response.results.length > 0 && response.results[0].type === "graphic" 
                    ? response.results[0].graphic 
                    : null;
                
                if (graphic) {
                  console.log('[DEBUG] Hit test found graphic:', graphic.attributes);
                } else {
                  console.log('[DEBUG] Hit test found no graphics');
                }
                
                this.handleHover(graphic);
                this.hitTestInProgress = false;
            })
            .catch(err => {
                console.error('[DEBUG] Hit test failed:', err);
                if (err.name !== "AbortError") console.error("hitTest failed:", err);
                this.hitTestInProgress = false;
            });
    });

    const clickHandler = mapView.on("click", (event) => {
      // Only process clicks if interactivity is fully ready
      if (!this.isInteractivityFullyReady) {
        console.log('[DEBUG] Ignoring click - interactivity not fully ready');
        return;
      }

      mapView.hitTest(event, { include: layers }).then(response => {
          const graphic = response.results.length > 0 && response.results[0].type === "graphic"
              ? response.results[0].graphic as Graphic
              : null;
          
          if (graphic) {
            console.log('[DEBUG] Click found graphic:', graphic.attributes);
          }
          
          this.handleSelection(graphic);
      });
    });

    // Enhanced stationary handling with proper state management
    const stationaryHandle = reactiveUtils.when(
        () => mapView.stationary,
        () => {
          this.isMapReady = true;
          this.refreshHighlight();
        },
        { initial: true }
    );

    this.interactivityHandlers = [pointerMoveHandler, clickHandler, stationaryHandle];
    this.isInteractivityActive = true;
    
    // Mark interactivity as fully ready after layer recreation is complete
    setTimeout(() => {
      this.isInteractivityFullyReady = true;
      console.log('[DEBUG] Interactivity is now fully ready for mouse events');
      
      // Additional check: verify layers are still visible and queryable
      layers.forEach(layer => {
        console.log(`[DEBUG] Layer ${layer.title} ready state: visible=${layer.visible}, loaded=${layer.loaded}, opacity=${layer.opacity}`);
      });
      
      // Test if layers are queryable
      if (layers.length > 0) {
        const testQuery = layers[0].createQuery();
        testQuery.where = "1=1";
        testQuery.outFields = ["OBJECTID"];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layers[0].queryFeatures(testQuery as any).then(result => {
          console.log(`[DEBUG] Test query on ${layers[0].title}: ${result.features.length} features found`);
        }).catch(err => {
          console.error(`[DEBUG] Test query failed on ${layers[0].title}:`, err);
        });
      }
      
      // CRITICAL FIX: Force immediate mouse position check
      // First, trigger a synthetic mouse move to capture current position
      if (mapView.container) {
        const rect = mapView.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Dispatch a synthetic mouse move event to force position capture
        const mouseMoveEvent = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY
        });
        
        console.log('[DEBUG] Dispatching synthetic mouse move to force position capture');
        mapView.container.dispatchEvent(mouseMoveEvent);
      }
      
      // Now check mouse position after a delay
      setTimeout(() => {
        // CRITICAL FIX: Check if mouse is currently over the map and trigger hover processing
        if (mapView.container) {
          const rect = mapView.container.getBoundingClientRect();
          
          // Check both client position and screen position
          const hasClientPosition = this.lastClientPosition !== null;
          const hasScreenPosition = this.lastScreenPosition !== null;
          
          console.log(`[DEBUG] Position check - hasClientPosition: ${hasClientPosition}, hasScreenPosition: ${hasScreenPosition}`);
          console.log(`[DEBUG] lastClientPosition:`, this.lastClientPosition);
          console.log(`[DEBUG] lastScreenPosition:`, this.lastScreenPosition);
          console.log(`[DEBUG] isMouseOverMap: ${this.isMouseOverMap}`);
          
          // If we have any position data, check if it's within bounds
          if (this.lastClientPosition) {
            const currentMouseX = this.lastClientPosition.x;
            const currentMouseY = this.lastClientPosition.y;
            
            const isMouseInBounds = currentMouseX >= rect.left && currentMouseX <= rect.right && 
                                   currentMouseY >= rect.top && currentMouseY <= rect.bottom;
            
            console.log(`[DEBUG] Checking mouse position: clientX=${currentMouseX}, clientY=${currentMouseY}, inBounds=${isMouseInBounds}`);
            console.log(`[DEBUG] Map bounds: left=${rect.left}, right=${rect.right}, top=${rect.top}, bottom=${rect.bottom}`);
            
            if (isMouseInBounds && !this.isMouseOverMap) {
              console.log('[DEBUG] Mouse is in bounds but not tracked as over map, updating state');
              this.isMouseOverMap = true;
            }
          } else if (this.lastScreenPosition && !this.isMouseOverMap) {
            // If we only have screen position, assume mouse is over map
            console.log('[DEBUG] Have screen position but no client position, assuming mouse is over map');
            this.isMouseOverMap = true;
          }
          
          // ADDITIONAL FIX: If still no mouse tracking, force it on
          if (!this.isMouseOverMap && !hasClientPosition && !hasScreenPosition) {
            console.log('[DEBUG] No mouse position captured at all, forcing mouse over state');
            this.isMouseOverMap = true;
            
            // Try to get mouse position from PointerEvent if available
            if (window.PointerEvent) {
              console.log('[DEBUG] Attempting to capture position via PointerEvent');
            }
          }
        }
        
        // CRITICAL FIX: If mouse is currently over the map, re-process the current position
        if (this.isMouseOverMap && this.lastScreenPosition) {
          console.log('[DEBUG] Mouse is over map, re-processing current screen position for immediate hover effects');
          console.log('[DEBUG] Screen position for hit test:', this.lastScreenPosition);
          
          // Create a synthetic event to re-trigger the hover logic
          const syntheticEvent = {
            x: this.lastScreenPosition.x,
            y: this.lastScreenPosition.y
          };
          
          // Use setTimeout to ensure this happens after the current execution cycle
          setTimeout(() => {
            if (this.isMouseOverMap && !this.hitTestInProgress) {
              console.log('[DEBUG] Re-processing hover for current mouse position');
              this.hitTestInProgress = true;
              
              mapView.hitTest(syntheticEvent, { include: layers })
                .then(response => {
                  console.log('[DEBUG] Re-process hit test response:', response.results.length, 'results');
                  
                  if (!this.isMouseOverMap) {
                    this.hitTestInProgress = false;
                    this.scheduleHoverCleanup();
                    return;
                  }
                  
                  const graphic = response.results.length > 0 && response.results[0].type === "graphic" 
                    ? response.results[0].graphic 
                    : null;
                  
                  if (graphic) {
                    console.log('[DEBUG] Re-process hit test found graphic:', graphic.attributes);
                  } else {
                    console.log('[DEBUG] Re-process hit test found no graphics');
                  }
                  
                  this.handleHover(graphic);
                  this.hitTestInProgress = false;
                })
                .catch(err => {
                  console.error('[DEBUG] Re-process hit test failed:', err);
                  this.hitTestInProgress = false;
                });
            }
          }, 50); // Small delay to ensure everything is settled
        } else {
          console.log('[DEBUG] Cannot re-process hover - isMouseOverMap:', this.isMouseOverMap, 'lastScreenPosition:', this.lastScreenPosition);
        }
      }, 300); // Increased delay to ensure DOM events have time to fire
    }, 200); // Increased delay to ensure layer recreation is complete
    
    console.log('[DEBUG] Interactivity setup completed successfully');
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

  private isPointerWithinMapBounds(event: __esri.ViewPointerMoveEvent): boolean {
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
      console.log('[DEBUG] Removing existing hover graphic');
      this.highlightLayer.remove(this.hoveredGraphic);
      this.hoveredGraphic = null;
    }
    
    const isSelected = newlyHovered?.attributes.OBJECTID === this.selectedFeature?.objectId;
    if (newlyHovered && !isSelected) {
        console.log('[DEBUG] Creating new hover graphic for:', newlyHovered.attributes);
         
        this.hoveredGraphic = new Graphic({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            geometry: newlyHovered.geometry as any,
            attributes: newlyHovered.attributes,
            symbol: this.hoverSymbol
        });
        
        console.log('[DEBUG] Adding hover graphic to highlight layer. Layer graphics count:', this.highlightLayer.graphics.length);
        this.highlightLayer.add(this.hoveredGraphic);
        console.log('[DEBUG] After adding hover graphic. Layer graphics count:', this.highlightLayer.graphics.length);
        
        if (this.mapView?.container) {
          this.mapView.container.style.cursor = "pointer";
        }
    } else if (!newlyHovered) {
        console.log('[DEBUG] No hover graphic to show');
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geometry: clickedGraphic.geometry as any,
        symbol: this.selectionSymbol,
        attributes: clickedGraphic.attributes
    });
    this.highlightLayer.add(this.selectedGraphic);

    this.refreshHighlight();
    
    // Notify about the new selection with area name
    if (this.onSelectionChange && clickedGraphic.geometry) {
      const areaName = clickedGraphic.attributes.NAME || null;
      this.onSelectionChange({
        geometry: clickedGraphic.geometry as Polygon,
        areaName: areaName
      });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { features } = await layer.queryFeatures(query as any, { signal });
        if (features.length > 0) {
            if (this.selectedGraphic) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.selectedGraphic.geometry = features[0].geometry as any;
            } else {
                 
                this.selectedGraphic = new Graphic({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    geometry: features[0].geometry as any,
                    symbol: this.selectionSymbol,
                    attributes: features[0].attributes
                });
                this.highlightLayer.add(this.selectedGraphic);
            }
        }
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
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

  public getInteractivityHandlers(): __esri.Handle[] {
    return this.interactivityHandlers;
  }

  public cleanupInteractivity() {
    this.interactivityHandlers.forEach(handler => handler.remove());
    this.interactivityHandlers = [];

    this.domHandlers.forEach(({ element, type, handler }) => element.removeEventListener(type, handler));
    this.domHandlers = [];
    
    this.clearHoverCleanupTimeout();
    this.clearSelection();
    this.highlightLayer.removeAll();
    this.hoveredGraphic = null;
    this.selectedFeature = null;
    this.lastScreenPosition = null;
    this.lastClientPosition = null;
    this.isInteractivityActive = false;
    this.isInteractivityFullyReady = false; // Reset the readiness flag
    
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }
  }

  public resetHighlightLayer(mapView: MapView | null) {
    if (mapView && mapView.map) {
      // Remove the old layer if it exists
      if (this.highlightLayer) {
        mapView.map.remove(this.highlightLayer);
      }
      
      // Create a brand new GraphicsLayer
      this.highlightLayer = new GraphicsLayer({
        title: "Boundary Highlights",
        listMode: "hide"
      });
      
      // Add the new layer to the map
      mapView.map.add(this.highlightLayer);
      
      console.log('[DEBUG] Highlight layer has been completely reset.');
    }
  }
}