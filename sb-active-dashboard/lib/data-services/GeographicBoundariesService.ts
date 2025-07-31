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
  private hitTestInProgress = false;
  
  // Track selected feature and highlight
  private selectedFeatureId: number | null = null;

  private hoverSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0], // Transparent fill
    outline: new SimpleLineSymbol({ color: [255, 255, 0, 1], width: 4 })
  });

  private selectionSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0], // Transparent fill
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
        listMode: "hide" // Hide this layer from the layer list widget
    });
  }

  getBoundaryLayers(): (FeatureLayer | GraphicsLayer)[] {
    return [this.cityLayer, this.serviceAreaLayer, this.highlightLayer];
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
      mapView.hitTest(event, { include: layers }).then(response => {
          const graphic = response.results.length > 0 && response.results[0].type === "graphic"
              ? response.results[0].graphic as Graphic
              : null;
          this.handleSelection(graphic);
      });
    });

    this.interactivityHandlers = [pointerMoveHandler, clickHandler];
  }
  
  private handleHover(newlyHovered: Graphic | null) {
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }

    if (this.hoveredGraphic) {
      this.highlightLayer.remove(this.hoveredGraphic);
      this.hoveredGraphic = null;
    }
    
    const isSelected = newlyHovered?.attributes.OBJECTID === this.selectedFeatureId;
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
      // Clear any temporary hover graphics
      if (this.hoveredGraphic) {
        this.highlightLayer.remove(this.hoveredGraphic);
        this.hoveredGraphic = null;
      }

      const clickedId = clickedGraphic?.attributes.OBJECTID;

      // Deselect if clicking the same feature or clicking off features
      if (!clickedGraphic || this.selectedFeatureId === clickedId) {
          this.clearSelection();
          return;
      }

      // A new feature is selected
      this.clearSelection(); // Clear previous selection first
      this.selectedFeatureId = clickedId;

      if (clickedGraphic) {
        this.selectedGraphic = new Graphic({
            geometry: clickedGraphic.geometry,
            attributes: clickedGraphic.attributes,
            symbol: this.selectionSymbol
        });
        this.highlightLayer.add(this.selectedGraphic);
      }
  }

  private clearSelection() {
    if (this.selectedGraphic) {
      this.highlightLayer.remove(this.selectedGraphic);
      this.selectedGraphic = null;
    }
    this.selectedFeatureId = null;
  }

  private cleanupInteractivity() {
    this.interactivityHandlers.forEach(handler => handler.remove());
    this.interactivityHandlers = [];
    
    this.clearSelection();
    this.highlightLayer.removeAll();
    this.hoveredGraphic = null;
    
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }
  }
}