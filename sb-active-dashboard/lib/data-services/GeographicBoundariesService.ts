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

// TODO: These URLs need to be replaced with actual boundary layer URLs
const BOUNDARY_LAYER_URLS = {
  // California/regional boundaries
  REGIONS: "", // TODO: Need regional boundary layer (e.g., Central Coast, San Luis Obispo County)
  
  // City/service area boundaries  
  CITIES: "", // TODO: Need city boundaries (Santa Barbara, Goleta, Carpinteria, etc.)
  
  // Census boundaries (these might exist via ArcGIS Online)
  CENSUS_TRACTS: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Tracts/FeatureServer/0",
  CENSUS_BLOCK_GROUPS: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Block_Groups/FeatureServer/0",
  
  // Custom boundaries
  CUSTOM_STUDY_AREAS: "", // TODO: If they have custom study area boundaries
};

interface GeographicLevel {
  id: 'region' | 'city' | 'census-tract' | 'census-block-group' | 'hexagons' | 'custom';
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
  private regionLayer: FeatureLayer | null = null;
  private cityLayer: FeatureLayer | null = null;
  private censusTractLayer: FeatureLayer | null = null;
  private censusBlockGroupLayer: FeatureLayer | null = null;
  
  private currentLevel: GeographicLevel['id'] = 'census-tract';
  private selectedArea: SelectedArea | null = null;
  
  constructor() {
    this.initializeLayers();
  }

  private initializeLayers() {
    // Only initialize layers that have URLs
    if (BOUNDARY_LAYER_URLS.CENSUS_TRACTS) {
      this.censusTractLayer = new FeatureLayer({
        url: BOUNDARY_LAYER_URLS.CENSUS_TRACTS,
        title: "Census Tracts",
        visible: false // Start invisible
      });
    }
    
    if (BOUNDARY_LAYER_URLS.CENSUS_BLOCK_GROUPS) {
      this.censusBlockGroupLayer = new FeatureLayer({
        url: BOUNDARY_LAYER_URLS.CENSUS_BLOCK_GROUPS,
        title: "Census Block Groups", 
        visible: false
      });
    }

    // TODO: Initialize other layers when URLs are available
    console.warn("Geographic Boundaries Service: Some boundary layers are missing URLs and won't function");
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

    // Add levels only if we have the corresponding layers
    if (this.censusTractLayer) {
      levels.unshift({
        id: 'census-tract',
        name: 'Census Tract',
        layer: this.censusTractLayer
      });
    }

    if (this.censusBlockGroupLayer) {
      levels.unshift({
        id: 'census-block-group', 
        name: 'Census Block Group',
        layer: this.censusBlockGroupLayer
      });
    }

    if (this.cityLayer) {
      levels.unshift({
        id: 'city',
        name: 'City / Service Area',
        layer: this.cityLayer
      });
    }

    if (this.regionLayer) {
      levels.unshift({
        id: 'region',
        name: 'Region',
        layer: this.regionLayer
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
      case 'region':
        if (!this.regionLayer) {
          return { 
            success: false, 
            warning: "Region boundaries not available. Need regional boundary layer URL." 
          };
        }
        this.regionLayer.visible = true;
        return await this.selectDefaultArea(this.regionLayer, mapView, 'Santa Barbara County');

      case 'city':
        if (!this.cityLayer) {
          return { 
            success: false, 
            warning: "City boundaries not available. Need city boundary layer URL." 
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
    if (this.regionLayer) this.regionLayer.visible = false;
    if (this.cityLayer) this.cityLayer.visible = false;
    if (this.censusTractLayer) this.censusTractLayer.visible = false;
    if (this.censusBlockGroupLayer) this.censusBlockGroupLayer.visible = false;
  }

  /**
   * Get all boundary layers for adding to map
   */
  getBoundaryLayers(): FeatureLayer[] {
    const layers: FeatureLayer[] = [];
    
    if (this.regionLayer) layers.push(this.regionLayer);
    if (this.cityLayer) layers.push(this.cityLayer);
    if (this.censusTractLayer) layers.push(this.censusTractLayer);
    if (this.censusBlockGroupLayer) layers.push(this.censusBlockGroupLayer);
    
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
      case 'region': return !!this.regionLayer;
      case 'city': return !!this.cityLayer;
      case 'census-tract': return !!this.censusTractLayer;
      case 'census-block-group': return !!this.censusBlockGroupLayer;
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

    if (!this.regionLayer) {
      missing.push("Regional boundaries");
      recommendations.push("Contact Santa Barbara County GIS for regional boundary data");
    } else {
      available.push("Regional boundaries");
    }

    if (!this.cityLayer) {
      missing.push("City/service area boundaries");
      recommendations.push("Contact cities (Santa Barbara, Goleta, Carpinteria) for municipal boundary data");
    } else {
      available.push("City boundaries");
    }

    if (!this.censusTractLayer) {
      missing.push("Census tract boundaries");
      recommendations.push("Use ArcGIS Online census boundary services");
    } else {
      available.push("Census tract boundaries");
    }

    // Always available
    available.push("Hexagon areas (from modeled data)");
    available.push("Custom draw tool");

    return { missing, available, recommendations };
  }
}