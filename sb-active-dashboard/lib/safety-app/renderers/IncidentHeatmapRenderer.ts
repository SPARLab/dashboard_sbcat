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
  static createDensityHeatmap(colorScheme: 'purple' | 'yellow-pink' | 'green-purple' | 'orange' = 'purple'): HeatmapRenderer {
    return new HeatmapRenderer({
      field: undefined, // Use point density, not a specific field
      radius: 10,
      maxDensity: 0.04, // Lower value = darker/more intense heatmap (adjusted from 0.08)
      minDensity: 0,
      referenceScale: 72224, // Lock visualization to this scale for consistency across zoom levels
      colorStops: this.getColorScheme(colorScheme)
    });
  }

  /**
   * Create a severity-weighted heatmap renderer
   */
  static createSeverityWeightedHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "severity_weight", // This field would need to be computed
      radius: 10,
      maxDensity: 0.08,
      minDensity: 0,
      referenceScale: 72224,
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
      field: undefined,
      radius: 15,
      maxDensity: 0.01,
      minDensity: 0,
      referenceScale: 72224,
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
      field: undefined,
      radius: 16,
      maxDensity: 0.012,
      minDensity: 0,
      referenceScale: 72224,
      colorStops
    });
  }

  /**
   * Create a data source specific heatmap renderer
   */
  static createDataSourceHeatmap(dataSource: 'SWITRS' | 'BikeMaps.org'): HeatmapRenderer {
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
      field: undefined,
      radius: 14,
      maxDensity: 0.008,
      minDensity: 0,
      referenceScale: 72224,
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
      dataSource?: 'SWITRS' | 'BikeMaps.org';
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
        // You can easily test different color schemes by changing the parameter:
        // 'purple' (current), 'yellow-pink', 'green-purple', or 'orange'
        return this.createDensityHeatmap('purple');
    }
  }

  /**
   * Get optimal reference scale for heatmap consistency
   * This scale provides good balance between detail and overview
   */
  static getOptimalReferenceScale(): number {
    return 72224; // Approximately 1:72,224 scale - good for regional incident patterns
  }

  /**
   * Alternative color schemes for testing
   */
  static getColorScheme(scheme: 'purple' | 'yellow-pink' | 'green-purple' | 'orange'): Array<{ ratio: number; color: string }> {
    switch (scheme) {
      case 'purple':
        return [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
          { ratio: 0.1, color: "rgba(159, 74, 150, 0.1)" }, // Very light purple
          { ratio: 0.3, color: "rgba(159, 74, 150, 0.3)" }, // Light purple
          { ratio: 0.5, color: "rgba(159, 74, 150, 0.5)" }, // Medium purple
          { ratio: 0.7, color: "rgba(159, 74, 150, 0.7)" }, // Stronger purple
          { ratio: 0.85, color: "rgba(159, 74, 150, 0.85)" }, // Strong purple
          { ratio: 1.0, color: "rgba(159, 74, 150, 1.0)" } // Full purple
        ];
      
      case 'yellow-pink':
        return [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
          { ratio: 0.1, color: "rgba(244, 179, 1, 0.2)" }, // Light yellow
          { ratio: 0.3, color: "rgba(244, 179, 1, 0.4)" }, // Yellow
          { ratio: 0.5, color: "rgba(244, 150, 50, 0.6)" }, // Yellow-orange
          { ratio: 0.7, color: "rgba(244, 120, 100, 0.7)" }, // Orange-pink
          { ratio: 0.85, color: "rgba(219, 16, 72, 0.85)" }, // Pink-red
          { ratio: 1.0, color: "rgba(219, 16, 72, 1.0)" } // Full pink
        ];

      case 'green-purple':
        return [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
          { ratio: 0.1, color: "rgba(120, 200, 120, 0.2)" }, // Light green
          { ratio: 0.3, color: "rgba(100, 180, 140, 0.4)" }, // Green-teal
          { ratio: 0.5, color: "rgba(80, 160, 160, 0.6)" }, // Teal
          { ratio: 0.7, color: "rgba(100, 120, 180, 0.7)" }, // Blue-purple
          { ratio: 0.85, color: "rgba(120, 80, 160, 0.85)" }, // Purple
          { ratio: 1.0, color: "rgba(159, 74, 150, 1.0)" } // Full purple
        ];

      case 'orange':
        return [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
          { ratio: 0.1, color: "rgba(255, 200, 100, 0.2)" }, // Very light orange
          { ratio: 0.3, color: "rgba(255, 180, 80, 0.4)" }, // Light orange
          { ratio: 0.5, color: "rgba(255, 160, 60, 0.6)" }, // Medium orange
          { ratio: 0.7, color: "rgba(255, 140, 40, 0.7)" }, // Stronger orange
          { ratio: 0.85, color: "rgba(255, 120, 20, 0.85)" }, // Strong orange
          { ratio: 1.0, color: "rgba(255, 100, 0, 1.0)" } // Full orange
        ];

      default:
        return this.getColorScheme('purple');
    }
  }
}