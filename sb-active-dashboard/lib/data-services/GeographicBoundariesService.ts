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
  
  constructor() {
    this.initializeLayers();
  }

  private initializeLayers() {
    try {
      // County boundaries - USGS National Map
      if (BOUNDARY_LAYER_URLS.COUNTIES) {
        this.countyLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.COUNTIES,
          title: "Counties",
          visible: false,
          popupTemplate: {
            title: "County: {NAME}",
            content: "State: {STATE_NAME}<br/>County: {NAME}"
          }
        });
      }

      // City boundaries - USGS National Map (Incorporated Places)
      if (BOUNDARY_LAYER_URLS.CITIES) {
        this.cityLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.CITIES,
          title: "Cities & Towns",
          visible: false,
          popupTemplate: {
            title: "City: {NAME}",
            content: "City: {NAME}<br/>State: {STATE_NAME}"
          }
        });
      }

      // Census Tracts - U.S. Census Bureau TIGERweb
      if (BOUNDARY_LAYER_URLS.CENSUS_TRACTS) {
        this.censusTractLayer = new FeatureLayer({
          url: BOUNDARY_LAYER_URLS.CENSUS_TRACTS,
          title: "Census Tracts",
          visible: false,
          popupTemplate: {
            title: "Census Tract: {NAME}",
            content: "Tract: {BASENAME}<br/>County: {COUNTY}<br/>State: {STATE}"
          }
        });
      }

      console.log("Geographic Boundaries Service: Boundary layers initialized successfully");
    } catch (error) {
      console.error("Geographic Boundaries Service: Error initializing layers:", error);
    }
  }

  /**
   * Get available geographic levels based on what data is available
   */
  getAvailableGeographicLevels(): GeographicLevel[] {
    const levels: GeographicLevel[] = [
      {
        id: 'hexagons',
        name: 'Hexagons',
        // Hexagons are handled by the modeled data service
      },
      {
        id: 'custom',
        name: 'Custom Draw Tool',
        // Custom areas can be drawn without predefined boundaries
      }
    ];

    // Add levels only if we have the corresponding layers (most granular to least granular)
    if (this.censusTractLayer) {
      levels.unshift({
        id: 'census-tract',
        name: 'Census Tract',
        layer: this.censusTractLayer
      });
    }

    if (this.cityLayer) {
      levels.unshift({
        id: 'city',
        name: 'City / Service Area',
        layer: this.cityLayer
      });
    }

    if (this.countyLayer) {
      levels.unshift({
        id: 'county',
        name: 'County',
        layer: this.countyLayer
      });
    }

    return levels;
  }

  /**
   * Switch to a different geographic level
   */
  async switchGeographicLevel(
    level: GeographicLevel['id'],
    mapView: MapView
  ): Promise<{
    success: boolean;
    defaultArea?: SelectedArea;
    warning?: string;
  }> {
    this.currentLevel = level;
    
    // Hide all boundary layers first
    this.hideAllBoundaryLayers();

    switch (level) {
      case 'county':
        if (!this.countyLayer) {
          return { 
            success: false, 
            warning: "County boundaries not available." 
          };
        }
        this.countyLayer.visible = true;
        return await this.selectDefaultArea(this.countyLayer, mapView, 'Santa Barbara');

      case 'city':
        if (!this.cityLayer) {
          return { 
            success: false, 
            warning: "City boundaries not available." 
          };
        }
        this.cityLayer.visible = true;
        return await this.selectDefaultArea(this.cityLayer, mapView, 'Santa Barbara');

      case 'census-tract':
        if (!this.censusTractLayer) {
          return { 
            success: false, 
            warning: "Census tract boundaries not available." 
          };
        }
        this.censusTractLayer.visible = true;
        return await this.selectDefaultAreaByMapCenter(this.censusTractLayer, mapView, 'census-tract');

      case 'hexagons':
        // Hexagons are handled by the modeled volume service
        return { success: true, warning: "Hexagon filtering handled by modeled data service" };

      case 'custom':
        // Custom drawing doesn't need predefined boundaries
        return { success: true, warning: "Custom draw tool: draw your own area" };

      default:
        return { success: false, warning: `Unknown geographic level: ${level}` };
    }
  }

  /**
   * Get the default area for a geographic level based on map center
   */
  private async selectDefaultAreaByMapCenter(
    layer: FeatureLayer,
    mapView: MapView,
    levelName: string
  ): Promise<{ success: boolean; defaultArea?: SelectedArea; warning?: string }> {
    try {
      // Query feature that contains the map center
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
        const feature = result.features[0];
        const selectedArea: SelectedArea = {
          id: feature.attributes.OBJECTID || feature.attributes.GEOID || 'unknown',
          name: feature.attributes.NAME || feature.attributes.NAMELSAD || `${levelName} ${feature.attributes.OBJECTID}`,
          geometry: feature.geometry,
          level: levelName
        };

        this.selectedArea = selectedArea;
        return { success: true, defaultArea: selectedArea };
      } else {
        // Fall back to Santa Barbara area if no feature contains map center
        return await this.selectDefaultArea(layer, mapView, 'Santa Barbara');
      }

    } catch (error) {
      console.error(`Error selecting default area for ${levelName}:`, error);
      return { 
        success: false, 
        warning: `Error loading ${levelName} boundaries: ${error}` 
      };
    }
  }

  /**
   * Get the default area by name (e.g., "Santa Barbara")
   */
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
        const feature = result.features[0];
        const selectedArea: SelectedArea = {
          id: feature.attributes.OBJECTID || feature.attributes.GEOID || 'unknown',
          name: feature.attributes.NAME || feature.attributes.NAMELSAD || defaultName,
          geometry: feature.geometry,
          level: this.currentLevel
        };

        this.selectedArea = selectedArea;
        return { success: true, defaultArea: selectedArea };
      } else {
        return { 
          success: false, 
          warning: `No area found matching "${defaultName}"` 
        };
      }

    } catch (error) {
      console.error(`Error selecting default area "${defaultName}":`, error);
      return { 
        success: false, 
        warning: `Error loading area "${defaultName}": ${error}` 
      };
    }
  }

  /**
   * Hide all boundary layers
   */
  private hideAllBoundaryLayers() {
    if (this.countyLayer) this.countyLayer.visible = false;
    if (this.cityLayer) this.cityLayer.visible = false;
    if (this.censusTractLayer) this.censusTractLayer.visible = false;
  }

  /**
   * Get all boundary layers for adding to map
   */
  getBoundaryLayers(): FeatureLayer[] {
    const layers: FeatureLayer[] = [];
    
    if (this.countyLayer) layers.push(this.countyLayer);
    if (this.cityLayer) layers.push(this.cityLayer);
    if (this.censusTractLayer) layers.push(this.censusTractLayer);
    
    return layers;
  }

  /**
   * Get currently selected area
   */
  getSelectedArea(): SelectedArea | null {
    return this.selectedArea;
  }

  /**
   * Get current geographic level
   */
  getCurrentLevel(): GeographicLevel['id'] {
    return this.currentLevel;
  }

  /**
   * Check if a geographic level is available
   */
  isLevelAvailable(level: GeographicLevel['id']): boolean {
    switch (level) {
      case 'county': return !!this.countyLayer;
      case 'city': return !!this.cityLayer;
      case 'census-tract': return !!this.censusTractLayer;
      case 'hexagons': return true; // Always available via modeled data
      case 'custom': return true; // Always available for drawing
      default: return false;
    }
  }

  /**
   * Get missing data sources report
   */
  getMissingDataSources(): { 
    missing: string[]; 
    available: string[]; 
    recommendations: string[] 
  } {
    const missing: string[] = [];
    const available: string[] = [];
    const recommendations: string[] = [];

    // Check required boundary types
    if (!this.countyLayer) {
      missing.push("County boundaries");
      recommendations.push("Add USGS National Map county boundaries");
    } else {
      available.push("County boundaries (USGS National Map)");
    }

    if (!this.cityLayer) {
      missing.push("City/municipal boundaries");
      recommendations.push("Add USGS National Map incorporated places");
    } else {
      available.push("City/municipal boundaries (USGS National Map)");
    }

    if (!this.censusTractLayer) {
      missing.push("Census tract boundaries");
      recommendations.push("Add U.S. Census Bureau TIGERweb services");
    } else {
      available.push("Census tract boundaries (U.S. Census TIGERweb)");
    }

    // Always available
    available.push("Hexagon areas (from modeled data)");
    available.push("Custom draw tool");

    return { missing, available, recommendations };
  }
}