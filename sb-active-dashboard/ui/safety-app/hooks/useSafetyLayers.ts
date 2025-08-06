import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useEffect, useState } from "react";
import { GeographicBoundariesService } from "../../../lib/data-services/GeographicBoundariesService";
import { SafetyIncidentsDataService } from "../../../lib/data-services/SafetyIncidentsDataService";

export function useSafetyLayers(
  viewReady: boolean,
  mapView: __esri.MapView | null,
  boundaryService: GeographicBoundariesService,
  setDataLoading: (loading: boolean) => void,
  setDataError: (error: string | null) => void
) {
  const [incidentsLayer, setIncidentsLayer] = useState<FeatureLayer | null>(null);
  const [partiesLayer, setPartiesLayer] = useState<FeatureLayer | null>(null);
  const [weightsLayer, setWeightsLayer] = useState<FeatureLayer | null>(null);

  // Initialize safety data layers when map view is ready
  useEffect(() => {
    if (!viewReady || !mapView) return;

    const initializeLayers = async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        // Initialize the feature layers
        const layers = SafetyIncidentsDataService.initializeLayers();
        
        setIncidentsLayer(layers.incidentsLayer);
        setPartiesLayer(layers.partiesLayer);
        setWeightsLayer(layers.weightsLayer);

        // Add boundary layers to map
        const boundaryLayers = boundaryService.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapView.map.add(layer));

        // Add layers to map
        mapView.map.addMany([
          layers.incidentsLayer,
          // Note: parties and weights layers are not added to map as they're for data only
        ]);

        console.log('[DEBUG] Safety layers initialized successfully');
        setDataLoading(false);

      } catch (error) {
        console.error('[DEBUG] Failed to initialize safety layers:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to load safety data');
        setDataLoading(false);
      }
    };

    initializeLayers();
  }, [viewReady, mapView, boundaryService, setDataLoading, setDataError]);

  return {
    incidentsLayer,
    partiesLayer,
    weightsLayer
  };
}