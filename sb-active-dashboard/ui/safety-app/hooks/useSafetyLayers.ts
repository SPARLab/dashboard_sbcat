import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useEffect, useState } from "react";
import { GeographicBoundariesService } from "../../../lib/data-services/GeographicBoundariesService";
import { SafetyIncidentsDataService } from "../../../lib/data-services/SafetyIncidentsDataService";
import { createEnrichedSafetyIncidentsLayer } from "../../../lib/safety-app/improvedSafetyLayers";

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

        // Create the enriched incidents layer with maxSeverity field
        console.log('[DEBUG] Creating enriched safety incidents layer...');
        const enrichedIncidentsLayer = await createEnrichedSafetyIncidentsLayer();
        
        // Also initialize the standard layers for data access (parties and weights)
        const layers = SafetyIncidentsDataService.initializeLayers();
        
        setIncidentsLayer(enrichedIncidentsLayer); // Use enriched layer instead!
        setPartiesLayer(layers.partiesLayer);
        setWeightsLayer(layers.weightsLayer);

        // Add boundary layers to map
        const boundaryLayers = boundaryService.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapView.map.add(layer));

        // Add enriched layer to map
        mapView.map.add(enrichedIncidentsLayer);

        console.log('[DEBUG] Enriched safety layers initialized successfully with maxSeverity field');
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