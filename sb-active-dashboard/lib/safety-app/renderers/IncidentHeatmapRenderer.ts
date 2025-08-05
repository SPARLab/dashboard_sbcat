/**
 * Incident Heatmap Renderer
 * Creates heatmap visualization for safety incident density
 */

import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import { SafetyFilters } from "../types";

export class IncidentHeatmapRenderer {
  /**
   * Create a standard heatmap renderer for incident density
   */
  static createDensityHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: null, // Use point density, not a specific field
      blurRadius: 20,
      maxDensity: 0.01, // Adjust based on data density
      minDensity: 0,
      colorStops: [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
        { ratio: 0.2, color: "rgba(0, 255, 255, 0.4)" }, // Light cyan
        { ratio: 0.4, color: "rgba(0, 255, 0, 0.6)" }, // Green
        { ratio: 0.6, color: "rgba(255, 255, 0, 0.8)" }, // Yellow
        { ratio: 0.8, color: "rgba(255, 165, 0, 0.9)" }, // Orange
        { ratio: 1.0, color: "rgba(255, 0, 0, 1.0)" } // Red
      ]
    });
  }

  /**
   * Create a severity-weighted heatmap renderer
   */
  static createSeverityWeightedHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "severity_weight", // This field would need to be computed
      blurRadius: 25,
      maxDensity: 0.015,
      minDensity: 0,
      colorStops: [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.1, color: "rgba(0, 191, 255, 0.3)" }, // Deep sky blue
        { ratio: 0.3, color: "rgba(255, 255, 0, 0.5)" }, // Yellow
        { ratio: 0.5, color: "rgba(255, 140, 0, 0.7)" }, // Dark orange
        { ratio: 0.7, color: "rgba(255, 69, 0, 0.8)" }, // Orange red
        { ratio: 0.9, color: "rgba(220, 20, 60, 0.9)" }, // Crimson
        { ratio: 1.0, color: "rgba(139, 0, 0, 1.0)" } // Dark red
      ]
    });
  }

  /**
   * Create a time-specific heatmap renderer
   */
  static createTimeSpecificHeatmap(timeFilter: 'peak' | 'off_peak' | 'night'): HeatmapRenderer {
    let colorStops;
    
    switch (timeFilter) {
      case 'peak':
        // Warmer colors for peak times
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.2, color: "rgba(255, 255, 0, 0.3)" }, // Yellow
          { ratio: 0.4, color: "rgba(255, 165, 0, 0.5)" }, // Orange
          { ratio: 0.6, color: "rgba(255, 69, 0, 0.7)" }, // Orange red
          { ratio: 0.8, color: "rgba(220, 20, 60, 0.8)" }, // Crimson
          { ratio: 1.0, color: "rgba(139, 0, 0, 1.0)" } // Dark red
        ];
        break;
      case 'night':
        // Cooler colors for night time
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.2, color: "rgba(173, 216, 230, 0.3)" }, // Light blue
          { ratio: 0.4, color: "rgba(135, 206, 235, 0.5)" }, // Sky blue
          { ratio: 0.6, color: "rgba(70, 130, 180, 0.7)" }, // Steel blue
          { ratio: 0.8, color: "rgba(25, 25, 112, 0.8)" }, // Midnight blue
          { ratio: 1.0, color: "rgba(0, 0, 139, 1.0)" } // Dark blue
        ];
        break;
      case 'off_peak':
      default:
        // Neutral colors for off-peak
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.2, color: "rgba(144, 238, 144, 0.3)" }, // Light green
          { ratio: 0.4, color: "rgba(50, 205, 50, 0.5)" }, // Lime green
          { ratio: 0.6, color: "rgba(34, 139, 34, 0.7)" }, // Forest green
          { ratio: 0.8, color: "rgba(0, 100, 0, 0.8)" }, // Dark green
          { ratio: 1.0, color: "rgba(0, 64, 0, 1.0)" } // Very dark green
        ];
        break;
    }

    return new HeatmapRenderer({
      field: null,
      blurRadius: 20,
      maxDensity: 0.01,
      minDensity: 0,
      colorStops
    });
  }

  /**
   * Create a road user specific heatmap renderer
   */
  static createRoadUserHeatmap(roadUser: 'bicyclist' | 'pedestrian'): HeatmapRenderer {
    let colorStops;
    
    if (roadUser === 'bicyclist') {
      // Green-based color scheme for bicycle incidents
      colorStops = [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.2, color: "rgba(144, 238, 144, 0.4)" }, // Light green
        { ratio: 0.4, color: "rgba(50, 205, 50, 0.6)" }, // Lime green
        { ratio: 0.6, color: "rgba(34, 139, 34, 0.7)" }, // Forest green
        { ratio: 0.8, color: "rgba(0, 128, 0, 0.8)" }, // Green
        { ratio: 1.0, color: "rgba(0, 100, 0, 1.0)" } // Dark green
      ];
    } else {
      // Purple-based color scheme for pedestrian incidents
      colorStops = [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.2, color: "rgba(221, 160, 221, 0.4)" }, // Plum
        { ratio: 0.4, color: "rgba(147, 112, 219, 0.6)" }, // Medium slate blue
        { ratio: 0.6, color: "rgba(138, 43, 226, 0.7)" }, // Blue violet
        { ratio: 0.8, color: "rgba(75, 0, 130, 0.8)" }, // Indigo
        { ratio: 1.0, color: "rgba(72, 61, 139, 1.0)" } // Dark slate blue
      ];
    }

    return new HeatmapRenderer({
      field: null,
      blurRadius: 22,
      maxDensity: 0.012,
      minDensity: 0,
      colorStops
    });
  }

  /**
   * Create a data source specific heatmap renderer
   */
  static createDataSourceHeatmap(dataSource: 'SWITRS' | 'BikeMaps'): HeatmapRenderer {
    let colorStops;
    
    if (dataSource === 'SWITRS') {
      // Red-based scheme for official crash reports
      colorStops = [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.2, color: "rgba(255, 182, 193, 0.4)" }, // Light pink
        { ratio: 0.4, color: "rgba(255, 105, 180, 0.6)" }, // Hot pink
        { ratio: 0.6, color: "rgba(220, 20, 60, 0.7)" }, // Crimson
        { ratio: 0.8, color: "rgba(178, 34, 34, 0.8)" }, // Fire brick
        { ratio: 1.0, color: "rgba(139, 0, 0, 1.0)" } // Dark red
      ];
    } else {
      // Teal-based scheme for user-reported incidents
      colorStops = [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.2, color: "rgba(175, 238, 238, 0.4)" }, // Pale turquoise
        { ratio: 0.4, color: "rgba(64, 224, 208, 0.6)" }, // Turquoise
        { ratio: 0.6, color: "rgba(32, 178, 170, 0.7)" }, // Light sea green
        { ratio: 0.8, color: "rgba(0, 139, 139, 0.8)" }, // Dark cyan
        { ratio: 1.0, color: "rgba(0, 128, 128, 1.0)" } // Teal
      ];
    }

    return new HeatmapRenderer({
      field: null,
      blurRadius: 18,
      maxDensity: 0.008,
      minDensity: 0,
      colorStops
    });
  }

  /**
   * Get heatmap renderer based on type and filters
   */
  static getRenderer(
    type: 'density' | 'severity' | 'time' | 'road_user' | 'data_source',
    filters?: SafetyFilters,
    options?: {
      timeFilter?: 'peak' | 'off_peak' | 'night';
      roadUser?: 'bicyclist' | 'pedestrian';
      dataSource?: 'SWITRS' | 'BikeMaps';
    }
  ): HeatmapRenderer {
    switch (type) {
      case 'severity':
        return this.createSeverityWeightedHeatmap();
      case 'time':
        return this.createTimeSpecificHeatmap(options?.timeFilter || 'peak');
      case 'road_user':
        return this.createRoadUserHeatmap(options?.roadUser || 'bicyclist');
      case 'data_source':
        return this.createDataSourceHeatmap(options?.dataSource || 'SWITRS');
      case 'density':
      default:
        return this.createDensityHeatmap();
    }
  }

  /**
   * Adjust heatmap parameters based on zoom level and data density
   */
  static adjustForScale(renderer: HeatmapRenderer, zoomLevel: number, featureCount: number): HeatmapRenderer {
    // Adjust blur radius based on zoom level
    let blurRadius = 20;
    if (zoomLevel < 10) {
      blurRadius = 30; // Larger blur for zoomed out views
    } else if (zoomLevel > 15) {
      blurRadius = 15; // Smaller blur for zoomed in views
    }

    // Adjust max density based on feature count
    let maxDensity = 0.01;
    if (featureCount > 1000) {
      maxDensity = 0.02; // Higher density threshold for many features
    } else if (featureCount < 100) {
      maxDensity = 0.005; // Lower threshold for few features
    }

    // Create new renderer with adjusted parameters
    const newRenderer = renderer.clone();
    newRenderer.blurRadius = blurRadius;
    newRenderer.maxDensity = maxDensity;
    
    return newRenderer;
  }
}