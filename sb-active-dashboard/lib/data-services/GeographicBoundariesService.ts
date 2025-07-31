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
  private selectedGraphic: Graphic | null = null;
  private hoveredGraphic: Graphic | null = null;
  private interactivityHandlers: __esri.Handle[] = [];
  private hitTestInProgress = false;

  private selectedSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0], // Transparent fill
    outline: new SimpleLineSymbol({ color: [30, 144, 255, 1], width: 3 })
  });
  
  private hoverSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0], // Transparent fill
    outline: new SimpleLineSymbol({ color: [255, 255, 0, 1], width: 3 })
  });

  constructor() {
    this.cityLayer = new FeatureLayer({
      url: BOUNDARY_LAYER_URLS.CITIES,
      title: "Cities & Towns",
      visible: false,
      popupEnabled: false,
      outFields: ["OBJECTID", "NAME", "NAMELSAD"],
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          color: [0, 0, 0, 0],
          outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
        })
      })
    });

    this.serviceAreaLayer = new FeatureLayer({
        url: BOUNDARY_LAYER_URLS.SERVICE_AREAS,
        title: "Census Designated Places",
        visible: false,
        popupEnabled: false,
        outFields: ["OBJECTID", "NAME", "NAMELSAD"],
        renderer: new SimpleRenderer({
            symbol: new SimpleFillSymbol({
                color: [0, 0, 0, 0],
                outline: new SimpleLineSymbol({ color: [70, 130, 180, 0.8], width: 2 })
            })
        })
    });

    this.highlightLayer = new GraphicsLayer({
        title: "Boundary Highlights",
        listMode: "hide" // Hide this layer from the layer list widget
    });
  }

  /**
   * Returns all layers managed by the service. The calling component
   * is responsible for adding them to the map.
   */
  getBoundaryLayers(): (FeatureLayer | GraphicsLayer)[] {
    return [this.cityLayer, this.serviceAreaLayer, this.highlightLayer];
  }
  
  async switchGeographicLevel(level: GeographicLevel['id'], mapView: MapView) {
    this.hideAllBoundaryLayers();
    this.mapView = mapView;

    if (level === 'city') {
        this.cityLayer.visible = true;
        this.setupCityInteractivity(mapView, [this.cityLayer]);
    } else if (level === 'city-service-area') {
        this.cityLayer.visible = true;
        this.serviceAreaLayer.visible = true;
        this.setupCityInteractivity(mapView, [this.cityLayer, this.serviceAreaLayer]);
    }
  }
  
  private hideAllBoundaryLayers() {
    this.cleanupInteractivity();
    if (this.cityLayer) {
      this.cityLayer.visible = false;
    }
    if (this.serviceAreaLayer) {
        this.serviceAreaLayer.visible = false;
    }
  }
  
  private setupCityInteractivity(mapView: MapView, layers: FeatureLayer[]) {
    this.cleanupInteractivity();

    const pointerMoveHandler = mapView.on("pointer-move", (event) => {
        if (this.hitTestInProgress) return;
        this.hitTestInProgress = true;

        mapView.hitTest(event, { include: layers })
            .then(response => {
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
        if (this.hoveredGraphic) {
            this.handleSelection(this.hoveredGraphic);
        } else {
            mapView.hitTest(event, { include: layers }).then(response => {
                if (response.results.length > 0 && response.results[0].type === "graphic") {
                    this.handleSelection(response.results[0].graphic);
                }
            });
        }
    });

    this.interactivityHandlers = [pointerMoveHandler, clickHandler];
  }
  
  private handleHover(newlyHovered: Graphic | null) {
      const isSameHover = this.hoveredGraphic?.attributes.OBJECTID === newlyHovered?.attributes.OBJECTID;
      if (isSameHover) return;
      
      if (this.hoveredGraphic) {
          this.highlightLayer.remove(this.hoveredGraphic);
          this.hoveredGraphic = null;
      }
      
      if (this.mapView && this.mapView.container) {
        this.mapView.container.style.cursor = "default";
      }
      
      const isSelected = newlyHovered?.attributes.OBJECTID === this.selectedGraphic?.attributes.OBJECTID;
      if (newlyHovered && !isSelected) {
          this.hoveredGraphic = new Graphic({
              geometry: newlyHovered.geometry,
              attributes: newlyHovered.attributes,
              symbol: this.hoverSymbol
          });
          this.highlightLayer.add(this.hoveredGraphic);
          if (this.mapView && this.mapView.container) {
            this.mapView.container.style.cursor = "pointer";
          }
      }
  }
  
  private handleSelection(clickedGraphic: Graphic) {
      const clickedId = clickedGraphic.attributes.OBJECTID;
      const graphicsToRemove = [];

      // Consolidate graphics to be removed
      if (this.hoveredGraphic) {
          graphicsToRemove.push(this.hoveredGraphic);
          this.hoveredGraphic = null;
      }
      if (this.selectedGraphic) {
          graphicsToRemove.push(this.selectedGraphic);
      }
      
      // Perform a single, batched removal
      if (graphicsToRemove.length > 0) {
          this.highlightLayer.removeMany(graphicsToRemove);
      }

      // If the clicked graphic was not the one selected, or if nothing was selected,
      // create and add the new selection graphic.
      if (!this.selectedGraphic || this.selectedGraphic.attributes.OBJECTID !== clickedId) {
          this.selectedGraphic = new Graphic({
              geometry: clickedGraphic.geometry,
              attributes: clickedGraphic.attributes,
              symbol: this.selectedSymbol
          });
          this.highlightLayer.add(this.selectedGraphic);
      } else {
          // The user clicked the currently selected graphic, so we are deselecting it.
          this.selectedGraphic = null;
      }
  }

  private cleanupInteractivity() {
    this.interactivityHandlers.forEach(handler => handler.remove());
    this.interactivityHandlers = [];
    this.highlightLayer.removeAll();
    this.selectedGraphic = null;
    this.hoveredGraphic = null;
    
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }
  }
}
