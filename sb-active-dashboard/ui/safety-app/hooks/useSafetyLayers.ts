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

  // Initialize safety data layers when map view is ready
  useEffect(() => {
    if (!viewReady || !mapView) return;

    const initializeLayers = async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        // Create the enriched incidents layer with maxSeverity field
        // Note: Date filtering is handled client-side via FeatureFilter, so we load all dates
        const enrichedIncidentsLayer = await createEnrichedSafetyIncidentsLayer();
        
        // Also initialize the standard layers for data access (parties)
        const layers = SafetyIncidentsDataService.initializeLayers();
        
        setIncidentsLayer(enrichedIncidentsLayer); // Use enriched layer instead!
        setPartiesLayer(layers.partiesLayer);
        

        // Add boundary layers to map
        const boundaryLayers = boundaryService.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapView.map?.add(layer));

        // Add enriched layer to map
        mapView.map?.add(enrichedIncidentsLayer);

  
        setDataLoading(false);

      } catch (error) {
  
        setDataError(error instanceof Error ? error.message : 'Failed to load safety data');
        setDataLoading(false);
      }
    };

    initializeLayers();
  }, [viewReady, mapView, boundaryService, setDataLoading, setDataError]); // Removed dateRange - client-side filtering handles it

  return {
    incidentsLayer,
    partiesLayer
  };
}