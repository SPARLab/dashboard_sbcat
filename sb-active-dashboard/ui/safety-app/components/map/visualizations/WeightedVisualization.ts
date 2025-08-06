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
        console.log('[DEBUG] Using cached weighted layer - no reload needed');
        
        // Hide the regular incidents layer and show the cached weighted layer
        incidentsLayer.visible = false;
        cachedWeightedLayer.visible = true;
        
        // Make sure the cached layer is in the map
        if (!mapView.map.layers.includes(cachedWeightedLayer)) {
          mapView.map.add(cachedWeightedLayer);
        }
        
        return;
      }

      console.log('[DEBUG] Cache miss - creating new weighted layer');

      // Query incidents and weights for current map extent
      const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
        mapView.extent,
        filters
      );

      // Debug the raw safety data
      console.log('[DEBUG] Raw safety data:', {
        totalIncidents: safetyData.data.length,
        sampleIncident: safetyData.data[0],
        incidentsWithWeights: safetyData.data.filter(inc => inc.hasWeight).length,
        incidentsWithExposure: safetyData.data.filter(inc => inc.weightedExposure).length,
        sampleWeightedIncident: safetyData.data.find(inc => inc.weightedExposure)
      });

      // Filter incidents that have weight data
      const weightedIncidents = safetyData.data.filter(inc => inc.hasWeight && inc.weightedExposure);

      console.log('[DEBUG] Filtered weighted incidents:', {
        totalWeightedIncidents: weightedIncidents.length,
        sampleWeightedIncidents: weightedIncidents.slice(0, 3).map(inc => ({
          id: inc.id,
          hasWeight: inc.hasWeight,
          weightedExposure: inc.weightedExposure,
          weightsCount: inc.weights?.length || 0
        }))
      });

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
      
      console.log('[DEBUG] Normalizing exposure values:', {
        originalRange: [minExposure, maxExposure],
        rangeSize: exposureRange,
        valueDistribution: {
          count: exposureValues.length,
          min: Math.min(...exposureValues),
          max: Math.max(...exposureValues),
          avg: exposureValues.reduce((a, b) => a + b, 0) / exposureValues.length,
          median: exposureValues.sort((a, b) => a - b)[Math.floor(exposureValues.length / 2)],
          top10percent: exposureValues.slice(-Math.floor(exposureValues.length * 0.1))
        }
      });

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
        
        // Debug first few features
        if (index < 3) {
          console.log(`[DEBUG] Feature ${index}:`, {
            original: originalExposure,
            normalized: normalizedExposure,
            attributes: feature.attributes
          });
        }
        
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
      console.log('[DEBUG] Created weighted layer:', {
        title: weightedLayer.title,
        featureCount: weightedFeatures.length,
        fields: weightedLayer.fields?.map(f => ({ name: f.name, type: f.type })),
        geometryType: weightedLayer.geometryType,
        source: 'client-side features'
      });

      // Use the normalized renderer for consistent visualization
      console.log('[DEBUG] Using normalized renderer for consistent color distribution');
      
      const normalizedRenderer = IncidentVolumeRatioRenderer.createNormalizedRenderer();
      weightedLayer.renderer = normalizedRenderer;

      // Cache the weighted layer and extent key for future use
      setCachedWeightedLayer(weightedLayer);
      setCachedExtentKey(currentCacheKey);
      console.log('[DEBUG] Cached weighted layer for future use');

      // Hide the regular incidents layer and show the weighted layer
      incidentsLayer.visible = false;
      weightedLayer.visible = true;

    } catch (error) {
      console.error('[DEBUG] Failed to create weighted visualization:', error);
      // Fallback to regular heatmap
      if (incidentsLayer) {
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
        incidentsLayer.visible = true;
      }
    }
  }
}