import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { IncidentHeatmapRenderer } from "../../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { IncidentVolumeRatioRenderer } from "../../../../../lib/safety-app/renderers/IncidentVolumeRatioRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";

export class WeightedVisualization {
  static async createVisualization(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    incidentsLayer: FeatureLayer | null,
    weightsLayer: FeatureLayer | null,
    cachedWeightedLayer: FeatureLayer | null,
    cachedExtentKey: string | null,
    generateCacheKey: (extent: __esri.Extent, filters: Partial<SafetyFilters>) => string,
    setCachedWeightedLayer: (layer: FeatureLayer | null) => void,
    setCachedExtentKey: (key: string | null) => void
  ): Promise<void> {
    if (!incidentsLayer || !weightsLayer || !mapView) return;

    try {
      // Check if we can use cached layer
      const currentCacheKey = generateCacheKey(mapView.extent, filters);
      
      if (cachedWeightedLayer && cachedExtentKey === currentCacheKey) {
  
        
        // Hide the regular incidents layer and show the cached weighted layer
        incidentsLayer.visible = false;
        cachedWeightedLayer.visible = true;
        
        // Make sure the cached layer is in the map
        if (!mapView.map.layers.includes(cachedWeightedLayer)) {
          mapView.map.add(cachedWeightedLayer);
        }
        
        return;
      }

  

      // Query incidents and weights for current map extent
      const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
        mapView.extent,
        filters
      );

      // Debug the raw safety data
      

      // Filter incidents that have weight data
      const weightedIncidents = safetyData.data.filter(inc => inc.hasWeight && inc.weightedExposure);

      

      if (weightedIncidents.length === 0) {
        console.warn('No weighted incident data available for current extent');
        
        // Fallback to regular heatmap
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
        incidentsLayer.visible = true;
        return;
      }

      // Normalize exposure values to 0-1 range for better heatmap visualization
      const exposureValues = weightedIncidents.map(inc => inc.weightedExposure || 0);
      const minExposure = Math.min(...exposureValues);
      const maxExposure = Math.max(...exposureValues);
      const exposureRange = maxExposure - minExposure;
      
      

      // Create features array for client-side feature layer with normalized exposure
      const weightedFeatures = weightedIncidents.map((incident, index) => {
        const originalExposure = incident.weightedExposure || 0;
        // Normalize to 0-1 scale
        const normalizedExposure = exposureRange > 0 
          ? (originalExposure - minExposure) / exposureRange 
          : 0;
        
        const feature = {
          geometry: incident.geometry,
          attributes: {
            objectid: incident.OBJECTID || index + 1, // Ensure we have a valid objectid
            id: incident.id,
            weightedExposure: originalExposure, // Keep original for reference
            normalizedExposure: normalizedExposure, // Use this for visualization
            severity: incident.maxSeverity || 'unknown',
            data_source: incident.data_source || 'unknown'
          }
        };
        

        
        return feature;
      });

      // Remove existing weighted layer if it exists
      const existingWeightedLayer = mapView.map.layers.find(
        (layer: any) => layer.title === "Weighted Safety Incidents"
      );
      if (existingWeightedLayer) {
        mapView.map.remove(existingWeightedLayer);
      }

      // Create a client-side FeatureLayer for the weighted data
      const weightedLayer = new FeatureLayer({
        source: weightedFeatures,
        title: "Weighted Safety Incidents",
        objectIdField: "objectid",
        fields: [
          { name: "objectid", type: "oid" },
          { name: "id", type: "integer" },
          { name: "weightedExposure", type: "double" },
          { name: "normalizedExposure", type: "double" },
          { name: "severity", type: "string" },
          { name: "data_source", type: "string" }
        ],
        geometryType: "point",
        spatialReference: mapView.spatialReference
      });

      // Add the new weighted layer
      mapView.map.add(weightedLayer);
      
      // Debug the created layer
      

      // Use the normalized renderer for consistent visualization
  
      
      const normalizedRenderer = IncidentVolumeRatioRenderer.createNormalizedRenderer();
      weightedLayer.renderer = normalizedRenderer;

      // Cache the weighted layer and extent key for future use
      setCachedWeightedLayer(weightedLayer);
      setCachedExtentKey(currentCacheKey);
  

      // Hide the regular incidents layer and show the weighted layer
      incidentsLayer.visible = false;
      weightedLayer.visible = true;

    } catch (error) {
  
      // Fallback to regular heatmap
      if (incidentsLayer) {
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
        incidentsLayer.visible = true;
      }
    }
  }
}