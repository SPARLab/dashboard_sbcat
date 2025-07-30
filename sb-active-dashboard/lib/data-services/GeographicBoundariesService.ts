/**
 * Geographic Boundaries Service
 * Handles region, city, census tract, and other geographic boundary layers
 * 
 * NOTE: This service requires actual ArcGIS boundary layers to function.
 * Currently these layers don't exist and need to be sourced/created.
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import Point from "@arcgis/core/geometry/Point";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";

// Working boundary layer URLs - tested and verified
const BOUNDARY_LAYER_URLS = {
  // County/regional boundaries - USGS National Map (reliable, no token required)
  COUNTIES: "https://carto.nationalmap.gov/arcgis/rest/services/govunits/MapServer/23",
  STATES: "https://carto.nationalmap.gov/arcgis/rest/services/govunits/MapServer/22",
  
  // City/municipal boundaries - USGS National Map (national coverage)
  CITIES: "https://carto.nationalmap.gov/arcgis/rest/services/govunits/MapServer/24", // Incorporated Places
  
  // Census boundaries - U.S. Census Bureau TIGERweb (official 2020 data, no token required)
  CENSUS_TRACTS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/6",
  CENSUS_BLOCK_GROUPS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/8",
  CENSUS_BLOCKS: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/10",
  
  // Alternative Santa Barbara area cities (may require verification)
  SB_CITIES: "https://services.arcgis.com/UXmFoWC7yDHcDN5Q/ArcGIS/rest/services/CityBoundaries_SOC_Dissolve/FeatureServer/0",
  
  // Custom boundaries
  CUSTOM_STUDY_AREAS: "", // For custom study areas if needed
};

interface GeographicLevel {
  id: 'county' | 'city' | 'census-tract' | 'hexagons' | 'custom';
  name: string;
  layer?: FeatureLayer;
  defaultSelection?: __esri.Geometry;
}

interface SelectedArea {
  id: string;
  name: string;
  geometry: __esri.Geometry;
  level: string;
}

export class GeographicBoundariesService {
  private countyLayer: FeatureLayer | null = null;
  private cityLayer: FeatureLayer | null = null;
  private censusTractLayer: FeatureLayer | null = null;
  
  private currentLevel: GeographicLevel['id'] = 'census-tract';
  private selectedArea: SelectedArea | null = null;
  private mapView: MapView | null = null;
  
  // State for interactivity
  private selectedFeature: __esri.Graphic | null = null;
  private hoveredFeature: __esri.Graphic | null = null;
  
  private interactivityHandlers: __esri.Handle[] = [];
  private hitTestInProgress = false;

  private defaultSymbol = new SimpleFillSymbol({
    color: [0, 0, 0, 0], // Transparent fill
    outline: new SimpleLineSymbol({
      color: [70, 130, 180, 0.8], // Steel blue outline
      width: 2
    })
  });

  private selectedSymbol = new SimpleFillSymbol({
    color: [30, 144, 255, 0.4], // Dodger blue with transparency
    outline: new SimpleLineSymbol({
      color: [30, 144, 255, 1], // Solid dodger blue outline
      width: 3
    })
  });
  
  private hoverSymbol = new SimpleFillSymbol({
    color: [255, 255, 0, 0.5], // Yellow with transparency
    outline: new SimpleLineSymbol({
        color: [200, 200, 0, 0.8],
        width: 2
    })
  });

  constructor() {
    this.initializeLayers();
  }

  private initializeLayers() {
    try {
      if (BOUNDARY_LAYER_URLS.COUNTIES) {
        this.countyLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.COUNTIES,
          title: "Counties",
          visible: false,
          popupEnabled: false,
        });
      }

      if (BOUNDARY_LAYER_URLS.CITIES) {
        this.cityLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.CITIES,
          title: "Cities & Towns",
          visible: false,
          popupEnabled: false, // Disable popups to prevent interference
          renderer: new SimpleRenderer({
            symbol: this.defaultSymbol
          })
        });
      }

      if (BOUNDARY_LAYER_URLS.CENSUS_TRACTS) {
        this.censusTractLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.CENSUS_TRACTS,
          title: "Census Tracts",
          visible: false,
          popupEnabled: false,
        });
      }

      console.log("Geographic Boundaries Service: Boundary layers initialized successfully");
    } catch (error) {
      console.error("Geographic Boundaries Service: Error initializing layers:", error);
    }
  }

  getAvailableGeographicLevels(): GeographicLevel[] {
    const levels: GeographicLevel[] = [
      { id: 'hexagons', name: 'Hexagons' },
      { id: 'custom', name: 'Custom Draw Tool' }
    ];
    if (this.censusTractLayer) levels.unshift({ id: 'census-tract', name: 'Census Tract', layer: this.censusTractLayer });
    if (this.cityLayer) levels.unshift({ id: 'city', name: 'City / Service Area', layer: this.cityLayer });
    if (this.countyLayer) levels.unshift({ id: 'county', name: 'County', layer: this.countyLayer });
    return levels;
  }

  async switchGeographicLevel(
    level: GeographicLevel['id'],
    mapView: MapView
  ): Promise<{ success: boolean; defaultArea?: SelectedArea; warning?: string }> {
    this.currentLevel = level;
    this.hideAllBoundaryLayers();
    this.mapView = mapView;

    switch (level) {
      case 'county':
        if (!this.countyLayer) return { success: false, warning: "County boundaries not available." };
        this.countyLayer.visible = true;
        return await this.selectDefaultArea(this.countyLayer, mapView, 'Santa Barbara');

      case 'city':
        if (!this.cityLayer) return { success: false, warning: "City boundaries not available." };
        this.cityLayer.visible = true;
        await this.setupCityInteractivity(mapView);
        try {
          return await this.selectDefaultArea(this.cityLayer, mapView, 'Santa Barbara');
        } catch (error) {
          console.warn('Could not select default Santa Barbara area:', error);
          return { success: true, warning: 'City boundaries loaded but default area selection failed' };
        }

      case 'census-tract':
        if (!this.censusTractLayer) return { success: false, warning: "Census tract boundaries not available." };
        this.censusTractLayer.visible = true;
        return await this.selectDefaultAreaByMapCenter(this.censusTractLayer, mapView, 'census-tract');

      case 'hexagons':
        return { success: true, warning: "Hexagon filtering handled by modeled data service" };
      case 'custom':
        return { success: true, warning: "Custom draw tool: draw your own area" };
      default:
        return { success: false, warning: `Unknown geographic level: ${level}` };
    }
  }

  private async selectDefaultAreaByMapCenter(
    layer: FeatureLayer,
    mapView: MapView,
    levelName: string
  ): Promise<{ success: boolean; defaultArea?: SelectedArea; warning?: string }> {
    try {
      const centerPoint = new Point({
        x: mapView.center.longitude,
        y: mapView.center.latitude,
        spatialReference: mapView.spatialReference
      });
      const query = layer.createQuery();
      query.geometry = centerPoint;
      query.spatialRelationship = "contains";
      query.outFields = ["*"];
      query.returnGeometry = true;

      const result = await layer.queryFeatures(query);

      if (result.features.length > 0) {
        return this.processDefaultSelection(result.features[0], levelName);
      } else {
        return await this.selectDefaultArea(layer, mapView, 'Santa Barbara');
      }
    } catch (error) {
      console.error(`Error selecting default area for ${levelName}:`, error);
      return { success: false, warning: `Error loading ${levelName} boundaries: ${error}` };
    }
  }

  private async selectDefaultArea(
    layer: FeatureLayer,
    mapView: MapView,
    defaultName: string
  ): Promise<{ success: boolean; defaultArea?: SelectedArea; warning?: string }> {
    try {
      const query = layer.createQuery();
      query.where = `NAME LIKE '%${defaultName}%' OR NAMELSAD LIKE '%${defaultName}%'`;
      query.outFields = ["*"];
      query.returnGeometry = true;

      const result = await layer.queryFeatures(query);

      if (result.features.length > 0) {
        return this.processDefaultSelection(result.features[0], this.currentLevel, defaultName);
      } else {
        return { success: false, warning: `No area found matching "${defaultName}"` };
      }
    } catch (error) {
      console.error(`Error selecting default area "${defaultName}":`, error);
      return { success: false, warning: `Error loading area "${defaultName}": ${error}` };
    }
  }

  private processDefaultSelection(feature: __esri.Graphic, levelName: string, defaultName?: string) {
    const selectedArea: SelectedArea = {
      id: feature.attributes.OBJECTID || feature.attributes.GEOID || 'unknown',
      name: feature.attributes.NAME || feature.attributes.NAMELSAD || defaultName || `${levelName} ${feature.attributes.OBJECTID}`,
      geometry: feature.geometry,
      level: levelName
    };
    this.selectedArea = selectedArea;
    this.selectedFeature = feature;
    this.updateCityLayerRenderer();
    return { success: true, defaultArea: selectedArea };
  }

  private hideAllBoundaryLayers() {
    this.cleanupInteractivity();
    if (this.countyLayer) this.countyLayer.visible = false;
    if (this.cityLayer) this.cityLayer.visible = false;
    if (this.censusTractLayer) this.censusTractLayer.visible = false;
  }

  getBoundaryLayers(): FeatureLayer[] {
    const layers: FeatureLayer[] = [];
    if (this.countyLayer) layers.push(this.countyLayer);
    if (this.cityLayer) layers.push(this.cityLayer);
    if (this.censusTractLayer) layers.push(this.censusTractLayer);
    return layers;
  }

  getSelectedArea(): SelectedArea | null {
    return this.selectedArea;
  }

  getCurrentLevel(): GeographicLevel['id'] {
    return this.currentLevel;
  }
  
  private async setupCityInteractivity(mapView: MapView) {
    if (!this.cityLayer) return;

    this.cleanupInteractivity();

    const pointerMoveHandler = mapView.on("pointer-move", (event) => {
        if (this.hitTestInProgress) return;
        this.hitTestInProgress = true;

        mapView.hitTest(event, { include: [this.cityLayer!] })
            .then(response => {
                let newHoveredFeature: __esri.Graphic | null = null;
                if (response.results.length > 0) {
                    newHoveredFeature = response.results[0].graphic;
                }

                const oldHoveredId = this.hoveredFeature?.attributes.OBJECTID;
                const newHoveredId = newHoveredFeature?.attributes.OBJECTID;

                if (oldHoveredId !== newHoveredId) {
                    this.hoveredFeature = newHoveredFeature;
                    this.updateCityLayerRenderer();
                }
                
                mapView.container.style.cursor = newHoveredFeature ? "pointer" : "default";

                this.hitTestInProgress = false;
            })
            .catch(err => {
                if (err.name !== "AbortError") {
                    console.error("hitTest failed:", err);
                }
                this.hitTestInProgress = false;
            });
    });

    const clickHandler = mapView.on("click", (event) => {
        mapView.hitTest(event, { include: [this.cityLayer!] }).then((hit) => {
            if (hit.results.length > 0) {
                this.selectedFeature = hit.results[0].graphic;
                this.hoveredFeature = null; // Clear hover when selecting
                
                this.selectedArea = {
                    id: this.selectedFeature.attributes.OBJECTID,
                    name: this.selectedFeature.attributes.NAME || this.selectedFeature.attributes.NAMELSAD || 'Unknown City',
                    geometry: this.selectedFeature.geometry,
                    level: 'city'
                };
                
                this.updateCityLayerRenderer();
                console.log('City selected:', this.selectedArea.name);
            }
        });
    });

    this.interactivityHandlers = [pointerMoveHandler, clickHandler];
  }

  private cleanupInteractivity() {
    this.interactivityHandlers.forEach(handler => handler.remove());
    this.interactivityHandlers = [];
    this.selectedFeature = null;
    this.hoveredFeature = null;
    this.updateCityLayerRenderer();
    
    if (this.mapView?.container) {
      this.mapView.container.style.cursor = "default";
    }
  }
  
  private updateCityLayerRenderer() {
    if (!this.cityLayer) return;

    const uniqueValueInfos: any[] = [];
    
    // Selected feature gets top priority for styling
    if (this.selectedFeature) {
      uniqueValueInfos.push({
        value: this.selectedFeature.attributes.OBJECTID,
        symbol: this.selectedSymbol,
      });
    }

    // Hovered feature is styled only if it's not the same as the selected one
    if (this.hoveredFeature && 
        (!this.selectedFeature || this.selectedFeature.attributes.OBJECTID !== this.hoveredFeature.attributes.OBJECTID)) {
      uniqueValueInfos.push({
        value: this.hoveredFeature.attributes.OBJECTID,
        symbol: this.hoverSymbol,
      });
    }

    this.cityLayer.renderer = new UniqueValueRenderer({
      field: "OBJECTID",
      defaultSymbol: this.defaultSymbol,
      uniqueValueInfos: uniqueValueInfos,
    });
  }
}
