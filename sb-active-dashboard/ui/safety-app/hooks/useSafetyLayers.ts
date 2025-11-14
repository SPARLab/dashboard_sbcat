import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useEffect, useState } from "react";
import { GeographicBoundariesService } from "../../../lib/data-services/GeographicBoundariesService";
import { SafetyIncidentsDataService } from "../../../lib/data-services/SafetyIncidentsDataService";
import { createEnrichedSafetyIncidentsLayer } from "../../../lib/safety-app/improvedSafetyLayers";
import { createJitteredDisplayLayer } from "../../../lib/safety-app/jitteredLayerService";

export function useSafetyLayers(
  viewReady: boolean,
  mapView: __esri.MapView | null,
  boundaryService: GeographicBoundariesService,
  setDataLoading: (loading: boolean) => void,
  setDataError: (error: string | null) => void
) {
  const [incidentsLayer, setIncidentsLayer] = useState<FeatureLayer | null>(null); // Original layer for queries
  const [jitteredIncidentsLayer, setJitteredIncidentsLayer] = useState<FeatureLayer | null>(null); // Jittered layer for display
  const [partiesLayer, setPartiesLayer] = useState<FeatureLayer | null>(null);

  // Initialize safety data layers when map view is ready
  useEffect(() => {
    if (!viewReady || !mapView) return;

    const initializeLayers = async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        // 1. Create the enriched incidents layer (original, for queries)
        // Note: Date filtering is handled client-side via FeatureFilter, so we load all dates
        const enrichedIncidentsLayer = await createEnrichedSafetyIncidentsLayer();
        enrichedIncidentsLayer.visible = false; // Hide original layer - only used for queries
        enrichedIncidentsLayer.title = "Safety Incidents (Query Layer)";
        
        // 2. Create jittered display layer from the original
        const jitteredLayer = await createJitteredDisplayLayer(enrichedIncidentsLayer, 20);
        jitteredLayer.visible = true; // Show jittered layer
        jitteredLayer.title = "Safety Incidents (Display Layer)";
        
        // 3. Initialize the standard layers for data access (parties)
        const layers = SafetyIncidentsDataService.initializeLayers();
        
        // 4. Set layer states
        setIncidentsLayer(enrichedIncidentsLayer); // Original for queries
        setJitteredIncidentsLayer(jitteredLayer); // Jittered for display
        setPartiesLayer(layers.partiesLayer);

        // 5. Add boundary layers to map
        const boundaryLayers = boundaryService.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapView.map?.add(layer));

        // 6. Add BOTH layers to map (order matters: original first, then jittered on top)
        mapView.map?.add(enrichedIncidentsLayer); // Invisible, for queries
        mapView.map?.add(jitteredLayer); // Visible, for display
  
        setDataLoading(false);

      } catch (error) {
        console.error('Error initializing safety layers:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to load safety data');
        setDataLoading(false);
      }
    };

    initializeLayers();
  }, [viewReady, mapView, boundaryService, setDataLoading, setDataError]); // Removed dateRange - client-side filtering handles it

  return {
    incidentsLayer, // Original layer for spatial queries
    jitteredIncidentsLayer, // Jittered layer for display
    partiesLayer
  };
}