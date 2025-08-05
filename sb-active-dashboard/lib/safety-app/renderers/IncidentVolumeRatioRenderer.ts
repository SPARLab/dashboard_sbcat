/**
 * Incident to Volume Ratio Renderer
 * Creates weighted heatmap visualization showing incident density relative to traffic volume
 * Uses exposure values from IncidentHeatmapWeights table
 */

import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import { SafetyFilters } from "../types";

export class IncidentVolumeRatioRenderer {
  /**
   * Create a weighted heatmap renderer using exposure values
   * This represents incidents per unit of traffic volume
   */
  static createExposureWeightedHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "weightedExposure", // This comes from joined IncidentHeatmapWeights data
      blurRadius: 25,
      maxDensity: 0.02, // Adjust based on exposure data range
      minDensity: 0,
      colorStops: [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
        { ratio: 0.1, color: "rgba(0, 255, 0, 0.2)" }, // Light green - low risk
        { ratio: 0.2, color: "rgba(173, 255, 47, 0.4)" }, // Green yellow - low-medium risk
        { ratio: 0.4, color: "rgba(255, 255, 0, 0.6)" }, // Yellow - medium risk
        { ratio: 0.6, color: "rgba(255, 165, 0, 0.7)" }, // Orange - medium-high risk
        { ratio: 0.8, color: "rgba(255, 69, 0, 0.8)" }, // Orange red - high risk
        { ratio: 1.0, color: "rgba(220, 20, 60, 1.0)" } // Crimson - very high risk
      ]
    });
  }

  /**
   * Create a road user specific exposure-weighted heatmap
   */
  static createRoadUserExposureHeatmap(roadUser: 'pedestrian' | 'bicyclist'): HeatmapRenderer {
    let colorStops;
    
    if (roadUser === 'bicyclist') {
      // Green-to-red gradient for bicycle safety risk
      colorStops = [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.1, color: "rgba(0, 128, 0, 0.2)" }, // Dark green - safe
        { ratio: 0.2, color: "rgba(50, 205, 50, 0.4)" }, // Lime green - low risk
        { ratio: 0.4, color: "rgba(255, 255, 0, 0.6)" }, // Yellow - medium risk
        { ratio: 0.6, color: "rgba(255, 140, 0, 0.7)" }, // Dark orange - elevated risk
        { ratio: 0.8, color: "rgba(255, 69, 0, 0.8)" }, // Orange red - high risk
        { ratio: 1.0, color: "rgba(178, 34, 34, 1.0)" } // Fire brick - very high risk
      ];
    } else {
      // Blue-to-red gradient for pedestrian safety risk
      colorStops = [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.1, color: "rgba(0, 191, 255, 0.2)" }, // Deep sky blue - safe
        { ratio: 0.2, color: "rgba(135, 206, 235, 0.4)" }, // Sky blue - low risk
        { ratio: 0.4, color: "rgba(255, 255, 0, 0.6)" }, // Yellow - medium risk
        { ratio: 0.6, color: "rgba(255, 140, 0, 0.7)" }, // Dark orange - elevated risk
        { ratio: 0.8, color: "rgba(255, 69, 0, 0.8)" }, // Orange red - high risk
        { ratio: 1.0, color: "rgba(220, 20, 60, 1.0)" } // Crimson - very high risk
      ];
    }

    return new HeatmapRenderer({
      field: "weightedExposure",
      blurRadius: 22,
      maxDensity: 0.015,
      minDensity: 0,
      colorStops
    });
  }

  /**
   * Create a model-specific exposure heatmap
   * Different models may have different exposure calculation methods
   */
  static createModelSpecificHeatmap(model: string): HeatmapRenderer {
    // Adjust visualization based on the exposure model used
    let blurRadius = 25;
    let maxDensity = 0.02;
    
    // Different models might require different visualization parameters
    if (model.toLowerCase().includes('urban')) {
      blurRadius = 20; // Tighter clustering for urban models
      maxDensity = 0.025;
    } else if (model.toLowerCase().includes('rural')) {
      blurRadius = 30; // Wider spread for rural models
      maxDensity = 0.015;
    }

    return new HeatmapRenderer({
      field: "weightedExposure",
      blurRadius,
      maxDensity,
      minDensity: 0,
      colorStops: [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.15, color: "rgba(34, 139, 34, 0.3)" }, // Forest green - low risk
        { ratio: 0.3, color: "rgba(154, 205, 50, 0.5)" }, // Yellow green - low-medium risk  
        { ratio: 0.5, color: "rgba(255, 215, 0, 0.6)" }, // Gold - medium risk
        { ratio: 0.7, color: "rgba(255, 140, 0, 0.75)" }, // Dark orange - high risk
        { ratio: 0.85, color: "rgba(255, 69, 0, 0.85)" }, // Orange red - very high risk
        { ratio: 1.0, color: "rgba(139, 0, 0, 1.0)" } // Dark red - extreme risk
      ]
    });
  }

  /**
   * Create a temporal exposure heatmap (incidents vs volume by time period)
   */
  static createTemporalExposureHeatmap(timePeriod: 'morning_peak' | 'evening_peak' | 'off_peak' | 'night'): HeatmapRenderer {
    let colorStops;
    let maxDensity = 0.02;
    
    switch (timePeriod) {
      case 'morning_peak':
        // Warm morning colors
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.1, color: "rgba(255, 228, 181, 0.3)" }, // Moccasin
          { ratio: 0.3, color: "rgba(255, 215, 0, 0.5)" }, // Gold
          { ratio: 0.5, color: "rgba(255, 165, 0, 0.7)" }, // Orange
          { ratio: 0.7, color: "rgba(255, 99, 71, 0.8)" }, // Tomato
          { ratio: 1.0, color: "rgba(220, 20, 60, 1.0)" } // Crimson
        ];
        maxDensity = 0.025; // Higher density expected during peak
        break;
        
      case 'evening_peak':
        // Warmer evening colors
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.1, color: "rgba(255, 218, 185, 0.3)" }, // Peach puff
          { ratio: 0.3, color: "rgba(255, 160, 122, 0.5)" }, // Light salmon
          { ratio: 0.5, color: "rgba(255, 99, 71, 0.7)" }, // Tomato
          { ratio: 0.7, color: "rgba(255, 69, 0, 0.8)" }, // Orange red
          { ratio: 1.0, color: "rgba(178, 34, 34, 1.0)" } // Fire brick
        ];
        maxDensity = 0.025;
        break;
        
      case 'night':
        // Cool nighttime colors
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.1, color: "rgba(176, 196, 222, 0.3)" }, // Light steel blue
          { ratio: 0.3, color: "rgba(135, 206, 235, 0.5)" }, // Sky blue
          { ratio: 0.5, color: "rgba(255, 255, 0, 0.7)" }, // Yellow (visibility concern)
          { ratio: 0.7, color: "rgba(255, 140, 0, 0.8)" }, // Dark orange
          { ratio: 1.0, color: "rgba(139, 0, 139, 1.0)" } // Dark magenta
        ];
        maxDensity = 0.015; // Lower density expected at night
        break;
        
      case 'off_peak':
      default:
        // Neutral off-peak colors
        colorStops = [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" },
          { ratio: 0.1, color: "rgba(144, 238, 144, 0.3)" }, // Light green
          { ratio: 0.3, color: "rgba(173, 255, 47, 0.5)" }, // Green yellow
          { ratio: 0.5, color: "rgba(255, 255, 0, 0.7)" }, // Yellow
          { ratio: 0.7, color: "rgba(255, 165, 0, 0.8)" }, // Orange
          { ratio: 1.0, color: "rgba(255, 69, 0, 1.0)" } // Orange red
        ];
        maxDensity = 0.018;
        break;
    }

    return new HeatmapRenderer({
      field: "weightedExposure",
      blurRadius: 23,
      maxDensity,
      minDensity: 0,
      colorStops
    });
  }

  /**
   * Create a comparative risk heatmap (incidents per capita by area)
   */
  static createComparativeRiskHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "riskRatio", // Computed field: incidents per unit population/volume
      blurRadius: 30,
      maxDensity: 0.012,
      minDensity: 0,
      colorStops: [
        { ratio: 0, color: "rgba(255, 255, 255, 0)" },
        { ratio: 0.05, color: "rgba(0, 100, 0, 0.2)" }, // Dark green - very safe
        { ratio: 0.15, color: "rgba(34, 139, 34, 0.3)" }, // Forest green - safe
        { ratio: 0.3, color: "rgba(173, 255, 47, 0.5)" }, // Green yellow - acceptable
        { ratio: 0.5, color: "rgba(255, 255, 0, 0.7)" }, // Yellow - caution
        { ratio: 0.7, color: "rgba(255, 140, 0, 0.8)" }, // Dark orange - concerning
        { ratio: 0.85, color: "rgba(255, 69, 0, 0.9)" }, // Orange red - dangerous
        { ratio: 1.0, color: "rgba(139, 0, 0, 1.0)" } // Dark red - very dangerous
      ]
    });
  }

  /**
   * Get incident-to-volume ratio renderer based on type and filters
   */
  static getRenderer(
    type: 'exposure' | 'road_user' | 'model' | 'temporal' | 'comparative',
    filters?: SafetyFilters,
    options?: {
      roadUser?: 'pedestrian' | 'bicyclist';
      model?: string;
      timePeriod?: 'morning_peak' | 'evening_peak' | 'off_peak' | 'night';
    }
  ): HeatmapRenderer {
    switch (type) {
      case 'road_user':
        return this.createRoadUserExposureHeatmap(options?.roadUser || 'bicyclist');
      case 'model':
        return this.createModelSpecificHeatmap(options?.model || 'default');
      case 'temporal':
        return this.createTemporalExposureHeatmap(options?.timePeriod || 'off_peak');
      case 'comparative':
        return this.createComparativeRiskHeatmap();
      case 'exposure':
      default:
        return this.createExposureWeightedHeatmap();
    }
  }

  /**
   * Adjust renderer based on data characteristics
   */
  static adjustForDataRange(
    renderer: HeatmapRenderer, 
    minExposure: number, 
    maxExposure: number,
    featureCount: number
  ): HeatmapRenderer {
    const newRenderer = renderer.clone();
    
    // Adjust max density based on exposure value range
    const exposureRange = maxExposure - minExposure;
    let maxDensity = 0.02;
    
    if (exposureRange > 1000) {
      maxDensity = 0.03; // Higher density for large exposure ranges
    } else if (exposureRange < 10) {
      maxDensity = 0.01; // Lower density for small ranges
    }
    
    // Adjust blur based on feature count
    let blurRadius = 25;
    if (featureCount > 1000) {
      blurRadius = 20; // Tighter clustering for many features
    } else if (featureCount < 50) {
      blurRadius = 35; // Wider spread for few features
    }
    
    newRenderer.maxDensity = maxDensity;
    newRenderer.blurRadius = blurRadius;
    
    return newRenderer;
  }

  /**
   * Create legend information for the exposure-weighted visualization
   */
  static createLegendInfo() {
    return {
      title: "Incident to Volume Ratio",
      description: "Areas with higher incident rates relative to traffic volume",
      colorStops: [
        { color: "rgba(0, 255, 0, 0.5)", label: "Low Risk" },
        { color: "rgba(255, 255, 0, 0.7)", label: "Medium Risk" },
        { color: "rgba(255, 165, 0, 0.8)", label: "High Risk" },
        { color: "rgba(220, 20, 60, 1.0)", label: "Very High Risk" }
      ],
      notes: [
        "Based on incident exposure weights relative to traffic volume",
        "Higher values indicate disproportionate incident rates",
        "Useful for identifying locations that may benefit from safety improvements"
      ]
    };
  }
}