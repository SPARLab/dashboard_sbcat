import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { RawIncidentRenderer } from "../../../../../lib/safety-app/renderers/RawIncidentRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";

export class RawIncidentsVisualization {
  /**
   * Applies the raw incident dot renderer to the main incidents layer.
   * This function no longer creates a separate layer, ensuring that
   * the FeatureFilter works correctly.
   */
  static async apply(
    mapView: __esri.MapView,
    incidentsLayer: FeatureLayer,
    filters: Partial<SafetyFilters>
  ): Promise<void> {
    try {
      console.log('[DEBUG] Applying RawIncidentsVisualization renderer');
      
      // Ensure the main incidents layer is visible for this visualization
      incidentsLayer.visible = true;
      
      // Apply the raw incident renderer (dots) to the single, main layer
      incidentsLayer.renderer = RawIncidentRenderer.getRenderer('severity', filters as SafetyFilters);
      
      // Ensure no feature reduction (clustering) is applied for raw dots
      incidentsLayer.featureReduction = null;

    } catch (error) {
      console.error('[DEBUG] Failed to apply RawIncidentsVisualization:', error);
      // It's better to let the caller handle loading state and errors
      throw error;
    }
  }
}