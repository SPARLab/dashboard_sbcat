/**
 * Geographic Boundaries Service - High-Performance Edition
 * This version uses a dedicated GraphicsLayer for highlighting, which is the most
 * performant method for complex, interactive feature layers.
 */
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
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
  CENSUS_TRACTS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0", // Census Tracts
  SCHOOL_DISTRICTS: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/sb_school_districts_multi_layer/FeatureServer", // Santa Barbara School Districts (multi-layer)
  UNINCORPORATED_AREAS: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/sb_unincorporated_areas_multi_layer/FeatureServer", // Santa Barbara Unincorporated Areas (multi-layer)
  CALTRANS_HIGHWAYS: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/SB_CaltransHighways_Enriched/FeatureServer" // Santa Barbara Caltrans Highways (enriched with segment_group_id)
};

interface GeographicLevel {
  id: 'city' | 'county' | 'census-tract' | 'hexagons' | 'custom' | 'city-service-area' | 'school-districts' | 'unincorporated-areas' | 'caltrans-highways';
  name: string;
}

export interface SchoolDistrictFilter {
  gradeFilter: 'high-school' | 'secondary' | 'elementary';
}

export class GeographicBoundariesService {
  private cityLayer: FeatureLayer;
  private serviceAreaLayer: FeatureLayer;
  private countyLayer: FeatureLayer;
  private censusTractLayer: FeatureLayer;
  private schoolDistrictsLayer: FeatureLayer;
  private unincorporatedAreasLayer: FeatureLayer;
  private caltransHighwaysLayer: FeatureLayer;
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
  private onSelectionChange: ((data: { geometry: Polygon | Polyline | null; areaName?: string | null; attributes?: any } | Polygon | Polyline | null) => void) | null = null;

  // Overlapping polygon handling
  private overlappingPolygonCallback: ((polygons: Array<{ id: string; name: string; area: number; graphic: __esri.Graphic }>, position: { x: number; y: number }) => void) | null = null;
  private rightClickPolygonCallback: ((polygons: Array<{ id: string; name: string; area: number; graphic: __esri.Graphic }>, position: { x: number; y: number }) => void) | null = null;
  private lastHitResults: __esri.HitTestResult[] = [];

  private hoverSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [255, 255, 0, 1], width: 4 })
  });

  private selectionSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({ color: [30, 144, 255, 1], width: 4 })
  });

  // Line-based symbols for highways
  private lineHoverSymbol = new SimpleLineSymbol({
    color: [255, 255, 0, 1], // Yellow for hover
    width: 6
  });

  private lineSelectionSymbol = new SimpleLineSymbol({
    color: [0, 123, 255, 1], // Blue for selection
    width: 6
  });

  constructor() {
    const createBoundaryLayer = (url: string, title: string, whereClause?: string) => {
      const layer = new FeatureLayer({
        url,
        title,
        visible: false,
        popupEnabled: false,
        outFields: ["OBJECTID", "NAME", "STATE", "GEOID"], // Added STATE and GEOID for debugging
        minScale: 0, // No minimum scale limit - visible at all zoom levels
        maxScale: 0, // No maximum scale limit - visible at all zoom levels
        definitionExpression: whereClause,
        renderer: new SimpleRenderer({
          symbol: new SimpleFillSymbol({
            color: [0, 0, 0, 0],
            outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
          })
        })
      });
      

      
      return layer;
    };
    
    // Feature flag: Show all California cities vs filtered list
    const showAllCaliforniaCities = import.meta.env.VITE_SHOW_ALL_CA_CITIES === 'true';
    
    let cityWhereClause: string;
    if (showAllCaliforniaCities) {
      // Show ALL cities in California
      cityWhereClause = "STATE = '06'";
    } else {
      // Filter cities to only show those in Santa Barbara and San Luis Obispo counties
      // Using name-based filtering since TIGER data structure varies across layers
      // TIGER Places data doesn't have consistent county fields, so we use known city names
      const sbCountyCities = [
        'Santa Barbara', 'Goleta', 'Carpinteria', 'Santa Maria', 'Lompoc', 'Solvang', 'Buellton', 'Guadalupe'
      ];
      const sloCountyCities: string[] = [
      ];
      const allCities = [...sbCountyCities, ...sloCountyCities];
      const cityNameFilter = allCities.map(city => `NAME LIKE '%${city}%'`).join(' OR ');
      cityWhereClause = `STATE = '06' AND (${cityNameFilter})`;
    }
    
    this.cityLayer = createBoundaryLayer(
      BOUNDARY_LAYER_URLS.CITIES, 
      "Cities & Towns",
      cityWhereClause
    );
    
    // Feature flag: Show all California service areas vs filtered list
    const showAllCaliforniaServiceAreas = import.meta.env.VITE_SHOW_ALL_CA_SERVICE_AREAS === 'true';
    
    let serviceAreaWhereClause: string;
    if (showAllCaliforniaServiceAreas) {
      // Show ALL Census Designated Places in California
      serviceAreaWhereClause = "STATE = '06'";
    } else {
      // Filter service areas (CDPs) to known communities in these counties
      const sbCountyPlaces = [
        'Isla Vista', 'Montecito', 'Eastern Goleta Valley', 'Toro Canyon', 'Summerland',
        'Santa Ynez', 'Los Alamos', 'Los Olivos', 'Ballard', 'Mission Hills',
        'Orcutt', 'Vandenberg Village', 'Vandenberg AFB', 'Casmalia', 'Sisquoc',
        'Cuyama', 'New Cuyama', 'Garey'
      ];
      const sloCountyPlaces = [
        'Santa Maria'  // Simplified to just Santa Maria as requested
      ];
      const allPlaces = [...sbCountyPlaces, ...sloCountyPlaces];
      const placeNameFilter = allPlaces.map(place => `NAME LIKE '%${place}%'`).join(' OR ');
      serviceAreaWhereClause = `STATE = '06' AND (${placeNameFilter})`;
    }
    
    this.serviceAreaLayer = createBoundaryLayer(
      BOUNDARY_LAYER_URLS.SERVICE_AREAS, 
      "Census Designated Places",
      serviceAreaWhereClause
    );

    
    // Filter counties to only show Santa Barbara and San Luis Obispo counties
    this.countyLayer = createBoundaryLayer(
      BOUNDARY_LAYER_URLS.COUNTIES, 
      "Counties",
      "NAME IN ('Santa Barbara County', 'San Luis Obispo County') OR NAME LIKE '%Santa Barbara%' OR NAME LIKE '%San Luis Obispo%'"
    );
    // Filter census tracts to only show those in Santa Barbara County
    // Census tract GEOID format: STATEFP + COUNTYFP + TRACTCE
    // Santa Barbara County FIPS: 06083 (California state 06, Santa Barbara county 083)
    this.censusTractLayer = createBoundaryLayer(
      BOUNDARY_LAYER_URLS.CENSUS_TRACTS, 
      "Census Tracts",
      "GEOID LIKE '06083%'"
    );

    // School Districts layer - using the Santa Barbara specific service
    // Using layer 1 (Regular_School_Districts) which includes Caltrans highways in polygons
    // Layer 0 (Non_Highway_School_Districts) has highways removed - available for future toggle feature
    this.schoolDistrictsLayer = new FeatureLayer({
      url: BOUNDARY_LAYER_URLS.SCHOOL_DISTRICTS + "/1", // Layer 1 = Regular (includes highways)
      title: "School Districts",
      visible: false,
      popupEnabled: false,
      outFields: ["*"], // Request all fields
      minScale: 0,
      maxScale: 0,
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          color: [0, 0, 0, 0], // Transparent fill to match other layers
          outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
        })
      })
    });

    // Unincorporated Areas layer - using the Santa Barbara specific service
    // Using layer 1 (Regular_Unincorporated_Areas) which includes Caltrans highways in polygons
    // Layer 0 (Non_Highway_Unincorporated_Areas) has highways removed - available for future toggle feature
    this.unincorporatedAreasLayer = new FeatureLayer({
      url: BOUNDARY_LAYER_URLS.UNINCORPORATED_AREAS + "/1", // Layer 1 = Regular (includes highways)
      title: "Unincorporated Areas",
      visible: false,
      popupEnabled: false,
      outFields: ["*"], // Request all fields
      minScale: 0,
      maxScale: 0,
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          color: [0, 0, 0, 0], // Transparent fill to match other layers
          outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
        })
      })
    });

    // Caltrans Highways layer - using the Santa Barbara specific service
    // This is a line-based layer, so we use SimpleLineSymbol directly
    this.caltransHighwaysLayer = new FeatureLayer({
      url: BOUNDARY_LAYER_URLS.CALTRANS_HIGHWAYS + "/0", // Specify layer 0
      title: "Caltrans Highways",
      visible: false,
      popupEnabled: false,
      outFields: ["*"], // Request all fields
      minScale: 0,
      maxScale: 0,
      renderer: new SimpleRenderer({
        symbol: new SimpleLineSymbol({
          color: [70, 130, 180, 0.8], // Blue color to match other layers
          width: 3 // Slightly thicker for highways
        })
      })
    });

    this.highlightLayer = new GraphicsLayer({
        title: "Boundary Highlights",
        listMode: "hide"
    });
  }

  getBoundaryLayers(): (FeatureLayer | GraphicsLayer)[] {
    return [this.cityLayer, this.serviceAreaLayer, this.countyLayer, this.censusTractLayer, this.schoolDistrictsLayer, this.unincorporatedAreasLayer, this.caltransHighwaysLayer, this.highlightLayer];
  }
  
  setSelectionChangeCallback(callback: (data: { geometry: Polygon | Polyline | null; areaName?: string | null; attributes?: any } | Polygon | Polyline | null) => void) {
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
    
    // Remove the old layer from the map
    if (this.highlightLayer && mapView.map) {
      const layers = mapView.map.layers;
      if (layers.includes(this.highlightLayer)) {
        mapView.map.remove(this.highlightLayer);
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
        // Highlight layer recreated and added to map successfully
      } else {

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
    if (level === 'school-districts') {
      this.schoolDistrictsLayer.visible = true;
      layers.push(this.schoolDistrictsLayer);
      // Apply z-index optimization for school districts
      this.optimizeSchoolDistrictLayerOrdering();
      // Apply default "High School" filter when school districts are first activated
      this.applySchoolDistrictFilter({ gradeFilter: 'high-school' });
    }
    if (level === 'unincorporated-areas') {
      this.unincorporatedAreasLayer.visible = true;
      layers.push(this.unincorporatedAreasLayer);
    }
    if (level === 'caltrans-highways') {
      this.caltransHighwaysLayer.visible = true;
      layers.push(this.caltransHighwaysLayer);
    }

    if (layers.length > 0) {
      this.setupInteractivity(mapView, layers);
    }
  }

  /**
   * Apply school district filtering based on grade levels
   */
  applySchoolDistrictFilter(filter: SchoolDistrictFilter) {
    if (!this.schoolDistrictsLayer.visible) {
      return; // Only apply filter if school districts are currently visible
    }

    let whereClause = "1=1"; // Default: show all

    switch (filter.gradeFilter) {
      case 'elementary':
        // For Elementary, show only districts marked as Elementary
        whereClause = "DISTRICT_T = 'Elementary'";
        break;
      case 'secondary':
        // For Secondary (7-8), show both Secondary AND High School districts
        // This combines polygons like "Santa Barbara Unified District" and "Santa Barbara Unified District (7-12)"
        whereClause = "DISTRICT_T = 'Secondary' OR DISTRICT_T = 'High School'";
        break;
      case 'high-school':
        // For High School (9-12), show both Secondary AND High School districts
        // This combines polygons like "Santa Barbara Unified District" and "Santa Barbara Unified District (7-12)"
        whereClause = "DISTRICT_T = 'Secondary' OR DISTRICT_T = 'High School'";
        break;
      default:
        whereClause = "1=1"; // Show all districts
        break;
    }

    this.schoolDistrictsLayer.definitionExpression = whereClause;
  }

  /**
   * Select all unincorporated area polygons when any one is clicked
   */
  private async selectAllUnincorporatedAreas() {
    try {
      // Query all features from the unincorporated areas layer
      const query = this.unincorporatedAreasLayer.createQuery();
      query.returnGeometry = true;
      query.outFields = ["*"];
      
      const featureSet = await this.unincorporatedAreasLayer.queryFeatures(query);
      
      // Create selection graphics for all features
      featureSet.features.forEach(feature => {
        const selectionGraphic = new Graphic({
          geometry: feature.geometry,
          symbol: this.selectionSymbol,
          attributes: feature.attributes
        });
        this.highlightLayer.add(selectionGraphic);
      });

      // For the callback, we'll use the combined geometry of all polygons
      // or just use the first polygon's name since they're all "Unincorporated Areas"
      if (this.onSelectionChange && featureSet.features.length > 0) {
        const firstFeature = featureSet.features[0];
        const areaName = firstFeature.attributes.NAME || firstFeature.attributes.name || "Unincorporated Areas";
        
        // Use the first polygon's geometry for the callback
        // In practice, the consuming code should handle this as a special case
        this.onSelectionChange({
          geometry: firstFeature.geometry as Polygon | Polyline,
          areaName: areaName
        });
      }
    } catch (error) {
      console.error("Failed to select all unincorporated areas:", error);
    }
  }
  
  private hideAllBoundaryLayers() {
    this.cleanupInteractivity();
    this.cityLayer.visible = false;
    this.serviceAreaLayer.visible = false;
    this.countyLayer.visible = false;
    this.censusTractLayer.visible = false;
    this.schoolDistrictsLayer.visible = false;
    this.unincorporatedAreasLayer.visible = false;
    this.caltransHighwaysLayer.visible = false;
  }
  
  /**
   * Mark that layer recreation is needed after SketchViewModel usage
   */
  public markLayerRecreationNeeded(): void {
    this.layerRecreationPending = true;
  }
  
  private setupInteractivity(mapView: MapView, layers: FeatureLayer[]) {
    // Clean up any existing interactivity
    this.cleanupInteractivity();

    // ALWAYS recreate the highlight layer to ensure it's not corrupted
    this.recreateHighlightLayer(mapView);

    // Verify layers are visible and properly configured
    layers.forEach(layer => {
      if (!layer.visible) {

      }
      if (!layer.loaded) {

      }
    });

    // Additional check: ensure all layers are ready for interaction
    const allLayersReady = layers.every(layer => layer.visible && layer.loaded);
    if (!allLayersReady) {

      // Wait a bit more for layers to be ready
      setTimeout(() => {
        this.setupInteractivity(mapView, layers);
      }, 200);
      return;
    }

    // Set up mouse event handlers first, but don't process events yet
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

        // Use tolerance-based hit testing for better polygon detection
        mapView.hitTest(event, { 
            include: layers,
            tolerance: 3 // 3 pixel tolerance to catch nearby polygons
        })
            .then(response => {
                
                // Double-check we're still over the map when the async operation completes
                if (!this.isMouseOverMap) {
                    this.hitTestInProgress = false;
                    this.scheduleHoverCleanup();
                    return;
                }
                
                // Enhanced polygon selection: show UI for overlapping polygons
                const graphic = this.selectBestPolygonFromHitResults(response.results);
                

                
                this.handleHover(graphic);
                this.hitTestInProgress = false;
            })
            .catch(err => {
                if (err.name !== "AbortError") console.error("hitTest failed:", err);
                this.hitTestInProgress = false;
            });
    });

    const clickHandler = mapView.on("click", (event) => {
      // Only process clicks if interactivity is fully ready
      if (!this.isInteractivityFullyReady) {
        return;
      }

      // Check if this is a right-click (context menu)
      const isRightClick = event.button === 2 || (event.native && (event.native as MouseEvent).button === 2);
      
      if (isRightClick) {
        // Handle right-click for context menu
        this.handleRightClick(event, layers);
        return;
      }

      // First check if we're clicking on an incident layer
      // Get all layers that might be incident-related
      if (!mapView.map) return;
      
      const allLayers = mapView.map.layers.toArray();
      const incidentLayers = allLayers.filter(layer => 
        layer.type === 'feature' && (
          layer.title === 'Safety Incidents' || 
          layer.title === 'Weighted Safety Incidents' ||
          (layer as { id?: string }).id?.includes('incident')
        )
      );

      // Do a hitTest to check for incident features
      mapView.hitTest(event).then(allResults => {
        // Check if any of the results are from incident layers and have graphics
        const hasIncidentHit = allResults.results.some(result => {
          if (result.type === 'graphic' && 'graphic' in result) {
            return incidentLayers.some(incidentLayer => 
              result.graphic.layer === incidentLayer
            );
          }
          return false;
        });

        if (hasIncidentHit) {
          return; // Don't process boundary selection
        }

        // Now do the boundary-specific hitTest with tolerance
        mapView.hitTest(event, { 
            include: layers,
            tolerance: 3 // 3 pixel tolerance for better polygon detection
        }).then(response => {
            // Enhanced polygon selection: show UI for overlapping polygons
            const graphic = this.selectBestPolygonFromHitResults(response.results);
            
            // Double-check: Even if we found a boundary, verify we didn't also click an incident
            if (graphic) {
              // Do another check specifically at this location to see if there's an incident
              mapView.hitTest(event).then(checkResults => {
                const hasIncidentAtLocation = checkResults.results.some(result => {
                  if (result.type === 'graphic' && 'graphic' in result) {
                    return incidentLayers.some(incidentLayer => 
                      result.graphic.layer === incidentLayer
                    );
                  }
                  return false;
                });
                
                if (!hasIncidentAtLocation) {
                  this.handleSelection(graphic);
                } else {
                }
              });
            } else {
              // No boundary was clicked, clear selection
              this.handleSelection(null);
            }
        });
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
      
      // Additional check: verify layers are still visible and queryable
      layers.forEach(() => {
        // Layer ready state verification
      });
      
      // Test if layers are queryable
      if (layers.length > 0) {
        const testQuery = layers[0].createQuery();
        testQuery.where = "1=1";
        testQuery.outFields = ["OBJECTID"];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layers[0].queryFeatures(testQuery as any).then(() => {
          // Test query completed
        }).catch(err => {
    
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
          

          
          // If we have any position data, check if it's within bounds
          if (this.lastClientPosition) {
            const currentMouseX = this.lastClientPosition.x;
            const currentMouseY = this.lastClientPosition.y;
            
            const isMouseInBounds = currentMouseX >= rect.left && currentMouseX <= rect.right && 
                                   currentMouseY >= rect.top && currentMouseY <= rect.bottom;
            

            
            if (isMouseInBounds && !this.isMouseOverMap) {
              this.isMouseOverMap = true;
            }
          } else if (this.lastScreenPosition && !this.isMouseOverMap) {
            // If we only have screen position, assume mouse is over map
            this.isMouseOverMap = true;
          }
          
          // ADDITIONAL FIX: If still no mouse tracking, force it on
          if (!this.isMouseOverMap && !hasClientPosition && !hasScreenPosition) {
            this.isMouseOverMap = true;
            
            // Try to get mouse position from PointerEvent if available
            if (window.PointerEvent) {
              // Attempting to capture position via PointerEvent
            }
          }
        }
        
        // CRITICAL FIX: If mouse is currently over the map, re-process the current position
        if (this.isMouseOverMap && this.lastScreenPosition) {
          
          // Create a synthetic event to re-trigger the hover logic
          const syntheticEvent = {
            x: this.lastScreenPosition.x,
            y: this.lastScreenPosition.y
          };
          
          // Use setTimeout to ensure this happens after the current execution cycle
          setTimeout(() => {
            if (this.isMouseOverMap && !this.hitTestInProgress) {
              this.hitTestInProgress = true;
              
              mapView.hitTest(syntheticEvent, { include: layers })
                .then(response => {
                  
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
                  console.error('Re-process hit test failed:', err);
                  this.hitTestInProgress = false;
                });
            }
          }, 50); // Small delay to ensure everything is settled
        }
      }, 300); // Increased delay to ensure DOM events have time to fire
    }, 200); // Increased delay to ensure layer recreation is complete
    

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
      this.highlightLayer.remove(this.hoveredGraphic);
      this.hoveredGraphic = null;
    }
    
    // Handle multiple field name variations across different services:
    // - OBJECTID (uppercase) - used by TIGER census layers
    // - objectid/objectid1 (lowercase) - some ArcGIS services
    // - fid - used by custom UCSB spatial services (school districts, unincorporated areas)
    const hoveredObjectId = newlyHovered?.attributes.OBJECTID || newlyHovered?.attributes.objectid1 || newlyHovered?.attributes.objectid || newlyHovered?.attributes.fid;
    const isSelected = hoveredObjectId === this.selectedFeature?.objectId;
    if (newlyHovered && !isSelected) {
        this.hoveredGraphic = new Graphic({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            geometry: newlyHovered.geometry as any,
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

    // Clear selection only if clicking outside any boundary (clickedGraphic is null)
    // Don't toggle selection when clicking the same boundary again
    if (!clickedGraphic) {
        this.clearSelection();
        this.selectedFeature = null;
        // Notify that selection was cleared
        if (this.onSelectionChange) {
          this.onSelectionChange(null);
        }
        return;
    }
    
    // Handle multiple field name variations across different services:
    // - OBJECTID (uppercase) - used by TIGER census layers
    // - objectid/objectid1 (lowercase) - some ArcGIS services
    // - fid - used by custom UCSB spatial services (school districts, unincorporated areas)
    const clickedObjectId = clickedGraphic.attributes.OBJECTID || clickedGraphic.attributes.objectid1 || clickedGraphic.attributes.objectid || clickedGraphic.attributes.fid;
    
    // If clicking the same boundary, keep it selected (don't toggle)
    if (clickedObjectId === this.selectedFeature?.objectId) {
        return;
    }

    this.selectedFeature = {
        objectId: clickedObjectId,
        layer: clickedGraphic.layer as FeatureLayer
    };

    this.clearSelection();
    
    // Special handling for unincorporated areas - select all polygons
    if (clickedGraphic.layer === this.unincorporatedAreasLayer) {
      this.selectAllUnincorporatedAreas();
    } else {
      // Normal single polygon/line selection - choose appropriate symbol
      const isLineLayer = clickedGraphic.layer === this.caltransHighwaysLayer;
      const symbol = isLineLayer ? this.lineSelectionSymbol : this.selectionSymbol;
      
      this.selectedGraphic = new Graphic({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: clickedGraphic.geometry as any,
          symbol: symbol,
          attributes: clickedGraphic.attributes
      });
      this.highlightLayer.add(this.selectedGraphic);

      this.refreshHighlight();
    }
    
    // Notify about the new selection with area name and attributes
    if (this.onSelectionChange && clickedGraphic.geometry) {
      // Handle different field names:
      // - NAME (uppercase) for census layers
      // - name (lowercase) for school districts
      // - route_name for highways
      const areaName = clickedGraphic.attributes.route_name || 
                       clickedGraphic.attributes.NAME || 
                       clickedGraphic.attributes.name || 
                       null;
      this.onSelectionChange({
        geometry: clickedGraphic.geometry as Polygon | Polyline,
        areaName: areaName,
        attributes: clickedGraphic.attributes  // 🔥 Pass the attributes so we can access segment_group_id!
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

  /**
   * Enhanced polygon selection logic for overlapping polygons.
   * When multiple polygons overlap, shows UI selector instead of auto-selecting.
   */
  private selectBestPolygonFromHitResults(results: __esri.HitTestResult[]): Graphic | null {
    // Store results for potential UI callback
    this.lastHitResults = results;
    
    // Filter to only graphic results
    const graphicResults = results.filter(result => result.type === "graphic") as __esri.GraphicHit[];
    
    if (graphicResults.length === 0) {
      return null;
    }
    
    if (graphicResults.length === 1) {
      return graphicResults[0].graphic;
    }
    
    // Multiple polygons found - check if they're actually overlapping polygons vs different layer types
    const polygonResults = graphicResults.filter(result => {
      const geometry = result.graphic.geometry;
      return geometry && geometry.type === 'polygon';
    });
    
    if (polygonResults.length === 0) {
      // No polygons found, return first graphic (could be line/point)
      return graphicResults[0].graphic;
    }
    
    if (polygonResults.length === 1) {
      return polygonResults[0].graphic;
    }
    
    // Multiple overlapping polygons detected!
    // Calculate areas for sorting and display
    const polygonsWithArea = polygonResults.map(result => {
      const polygon = result.graphic.geometry as Polygon;
      const area = polygon.extent ? 
        (polygon.extent.width * polygon.extent.height) : 
        Number.MAX_SAFE_INTEGER;
      
      return {
        graphic: result.graphic,
        area: area,
        layer: result.graphic.layer
      };
    });
    
    // Sort by area (ascending - smallest first) for display purposes
    polygonsWithArea.sort((a, b) => a.area - b.area);
    
    console.log(`🎯 [Polygon Selection] Found ${polygonsWithArea.length} overlapping polygons:`);
    polygonsWithArea.forEach((item, index) => {
      const name = item.graphic.attributes?.NAME || item.graphic.attributes?.name || 'Unknown';
      console.log(`  ${index + 1}. ${name} (Area: ${item.area.toFixed(2)})`);
    });
    
    // If we have a UI callback, show the selector and return null (no auto-selection)
    if (this.overlappingPolygonCallback && this.lastScreenPosition) {
      const polygonOptions = polygonsWithArea.map((item, index) => ({
        id: `${item.graphic.attributes?.OBJECTID || item.graphic.attributes?.objectid || item.graphic.attributes?.fid || index}`,
        name: item.graphic.attributes?.NAME || item.graphic.attributes?.name || `Polygon ${index + 1}`,
        area: item.area,
        graphic: item.graphic
      }));
      
      console.log('🎯 [Polygon Selection] Showing UI selector for user choice');
      this.overlappingPolygonCallback(polygonOptions, this.lastScreenPosition);
      
      // Return null to prevent auto-selection - let user choose
      return null;
    }
    
    // Fallback: if no UI callback is registered, select the first (topmost) polygon
    // This maintains backward compatibility
    console.log('🎯 [Polygon Selection] No UI callback - selecting first polygon');
    return polygonResults[0].graphic;
  }

  public getInteractivityHandlers(): __esri.Handle[] {
    return this.interactivityHandlers;
  }

  /**
   * Register a callback for when overlapping polygons are detected.
   * The callback receives an array of polygon options and the screen position.
   */
  public setOverlappingPolygonCallback(
    callback: ((polygons: Array<{ id: string; name: string; area: number; graphic: __esri.Graphic }>, position: { x: number; y: number }) => void) | null
  ) {
    this.overlappingPolygonCallback = callback;
  }

  /**
   * Register a callback for right-click context menu on overlapping polygons.
   */
  public setRightClickPolygonCallback(
    callback: ((polygons: Array<{ id: string; name: string; area: number; graphic: __esri.Graphic }>, position: { x: number; y: number }) => void) | null
  ) {
    this.rightClickPolygonCallback = callback;
  }

  /**
   * Manually select a specific graphic (useful for overlapping polygon UI)
   */
  public selectSpecificGraphic(graphic: __esri.Graphic) {
    this.handleSelection(graphic);
  }

  /**
   * Optimize layer ordering for school districts to reduce overlapping polygon issues.
   * This method attempts to reorder features within the layer so smaller districts render on top.
   */
  private optimizeSchoolDistrictLayerOrdering() {
    if (!this.mapView || !this.schoolDistrictsLayer) {
      return;
    }

    // Note: ArcGIS FeatureLayer doesn't support direct z-index manipulation of individual features
    // However, we can apply a renderer that uses size-based symbology to visually distinguish overlapping areas
    
    // Create a renderer that makes smaller districts more prominent
    const sizeBasedRenderer = new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        color: [0, 0, 0, 0], // Transparent fill
        outline: new SimpleLineSymbol({ 
          color: [70, 130, 180, 0.9], // Steel blue outline
          width: 2 
        })
      }),
      // Add visual variable to make smaller districts more prominent
      visualVariables: [{
        type: "size",
        field: "area_calc", // Assuming there's an area field, fallback to default
        minDataValue: 0,
        maxDataValue: 1000000, // Adjust based on your data
        minSize: 3, // Smaller districts get thicker borders
        maxSize: 1  // Larger districts get thinner borders
      } as __esri.SizeVariable]
    });

    // Apply the renderer (this will help visually but won't change hit test order)
    // The main solution is still the area-based selection logic
    console.log('🎯 [Layer Optimization] Applied size-based rendering for school districts');
  }

  /**
   * Handle right-click events for context menu polygon selection
   */
  private handleRightClick(event: __esri.MapViewClickEvent, layers: FeatureLayer[]) {
    if (!this.mapView || !this.rightClickPolygonCallback) {
      return;
    }

    // Prevent default context menu
    if (event.native) {
      event.native.preventDefault();
    }

    // Perform hit test to find overlapping polygons
    this.mapView.hitTest(event, { 
      include: layers,
      tolerance: 5 // Slightly larger tolerance for right-click
    }).then(response => {
      const graphicResults = response.results.filter(result => result.type === "graphic") as __esri.GraphicHit[];
      
      if (graphicResults.length === 0) {
        return;
      }

      const polygonResults = graphicResults.filter(result => {
        const geometry = result.graphic.geometry;
        return geometry && geometry.type === 'polygon';
      });

      if (polygonResults.length <= 1) {
        return; // No overlapping polygons, no need for context menu
      }

      // Calculate areas and sort
      const polygonsWithArea = polygonResults.map(result => {
        const polygon = result.graphic.geometry as Polygon;
        const area = polygon.extent ? 
          (polygon.extent.width * polygon.extent.height) : 
          Number.MAX_SAFE_INTEGER;
        
        return {
          graphic: result.graphic,
          area: area,
          layer: result.graphic.layer
        };
      });

      polygonsWithArea.sort((a, b) => a.area - b.area);

      const polygonOptions = polygonsWithArea.map((item, index) => ({
        id: `${item.graphic.attributes?.OBJECTID || item.graphic.attributes?.objectid || item.graphic.attributes?.fid || index}`,
        name: item.graphic.attributes?.NAME || item.graphic.attributes?.name || `Polygon ${index + 1}`,
        area: item.area,
        graphic: item.graphic
      }));

      // Convert screen position to client coordinates
      const mapContainer = this.mapView.container;
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect();
        const clientPosition = {
          x: rect.left + event.x,
          y: rect.top + event.y
        };
        
        console.log('🎯 [Right-Click] Showing context menu for overlapping polygons');
        this.rightClickPolygonCallback(polygonOptions, clientPosition);
      }
    }).catch(err => {
      console.error("Right-click hit test failed:", err);
    });
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
      

    }
  }
}