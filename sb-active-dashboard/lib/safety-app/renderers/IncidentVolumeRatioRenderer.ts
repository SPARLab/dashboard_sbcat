/**
 * Incident to Volume Ratio Renderer
 * Creates weighted heatmap visualization showing incident density relative to traffic volume
 * Uses exposure values from IncidentHeatmapWeights table
 */

import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import { SafetyFilters } from "../types";
import { IncidentHeatmapRenderer } from "./IncidentHeatmapRenderer";

export class IncidentVolumeRatioRenderer {
  /**
   * Create a weighted heatmap renderer using exposure values
   * This represents incidents per unit of traffic volume
   */
  static createExposureWeightedHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "weightedExposure", // This comes from joined IncidentHeatmapWeights data
      radius: 15, // Match incident heatmap radius
      maxDensity: 0.02, // Match incident heatmap maxDensity
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap referenceScale for consistency
      colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Use same colors as incident heatmap
    });
  }

  /**
   * Create a road user specific exposure-weighted heatmap
   */
  static createRoadUserExposureHeatmap(roadUser: 'pedestrian' | 'bicyclist'): HeatmapRenderer {
    // Use consistent purple scheme for both road users to match incident heatmap
    return new HeatmapRenderer({
      field: "weightedExposure",
      radius: 16, // Slightly larger for road user differentiation
      maxDensity: 0.02, // Match incident heatmap
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap
      colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Same colors as incident heatmap
    });
  }

  /**
   * Create a model-specific exposure heatmap
   * Different models may have different exposure calculation methods
   */
  static createModelSpecificHeatmap(model: string): HeatmapRenderer {
    // Use consistent parameters regardless of model type
    return new HeatmapRenderer({
      field: "weightedExposure",
      radius: 15, // Match incident heatmap
      maxDensity: 0.02, // Match incident heatmap
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap
      colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Same colors as incident heatmap
    });
  }

  /**
   * Create a temporal exposure heatmap (incidents vs volume by time period)
   */
  static createTemporalExposureHeatmap(timePeriod: 'morning_peak' | 'evening_peak' | 'off_peak' | 'night'): HeatmapRenderer {
    // Use consistent purple scheme for all time periods to match incident heatmap
    return new HeatmapRenderer({
      field: "weightedExposure",
      radius: 15, // Match incident heatmap
      maxDensity: 0.02, // Match incident heatmap
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap
      colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Same colors as incident heatmap
    });
  }

  /**
   * Create a comparative risk heatmap (incidents per capita by area)
   */
  static createComparativeRiskHeatmap(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "riskRatio", // Computed field: incidents per unit population/volume
      radius: 15, // Match incident heatmap
      maxDensity: 0.02, // Match incident heatmap
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap
      colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Same colors as incident heatmap
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
    
    // Adjust max density based on exposure value range and feature density
    const exposureRange = maxExposure - minExposure;
    let maxDensity = renderer.maxDensity; // Start with the renderer's existing value
    
    // Only adjust if we detect problematic ranges
    if (exposureRange < 5 && minExposure > 2) {
      // Very narrow range with moderate-high values - use ultra-sensitive density
      maxDensity = Math.min(maxDensity, 0.00005);
    } else if (exposureRange < 3) {
      // Extremely narrow range - be very sensitive
      maxDensity = Math.min(maxDensity, 0.0001);
    } else if (exposureRange < 10) {
      // Narrow range - be more sensitive
      maxDensity = Math.min(maxDensity, 0.0005);
    } else if (minExposure > 500) {
      maxDensity = 0.002; // Very aggressive reduction for very high exposure values
    } else if (minExposure > 100) {
      maxDensity = 0.003; // Very low for high exposure values
    }
    
    // Adjust blur based on feature count for better visualization
    let blurRadius = 25;
    if (featureCount > 1000) {
      blurRadius = 20; // Tighter clustering for many features
    } else if (featureCount < 50) {
      blurRadius = 35; // Wider spread for few features
    }
    

    
    newRenderer.maxDensity = maxDensity;
    (newRenderer as any).blurRadius = blurRadius;
    
    return newRenderer;
  }

  /**
   * Create data-driven color stops based on actual exposure distribution
   */
  static createDataDrivenColorStops(exposureValues: number[]): any[] {
    // Always use the consistent purple scheme regardless of data distribution
    return IncidentHeatmapRenderer.getColorScheme('purple');
  }

  /**
   * Create a renderer with data-driven color stops
   */
  static createDataDrivenRenderer(exposureValues: number[]): HeatmapRenderer {
    const colorStops = this.createDataDrivenColorStops(exposureValues);
    
    // Use consistent parameters to match incident heatmap
    return new HeatmapRenderer({
      field: "weightedExposure",
      radius: 15, // Match incident heatmap
      maxDensity: 0.02, // Match incident heatmap
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap
      colorStops
    });
  }

  /**
   * Create a normalized renderer that uses 0-1 normalized exposure values
   */
  static createNormalizedRenderer(): HeatmapRenderer {
    return new HeatmapRenderer({
      field: "normalizedExposure", // Use the normalized 0-1 values
      radius: 15, // Match incident heatmap
      maxDensity: 0.02, // Match incident heatmap
      minDensity: 0,
      referenceScale: 72224, // Match incident heatmap
      colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Use consistent purple scheme
    });
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