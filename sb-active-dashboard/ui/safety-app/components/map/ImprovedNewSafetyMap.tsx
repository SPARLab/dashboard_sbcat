import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Polygon from "@arcgis/core/geometry/Polygon";
import { ArcgisMap } from "@arcgis/map-components-react";
import { CircularProgress, Box as MuiBox } from "@mui/material";
import { useEffect, useRef, useState, useMemo } from "react";
import { GeographicBoundariesService } from "../../../../lib/data-services/GeographicBoundariesService";
import { SafetyFilters, SafetyVisualizationType } from "../../../../lib/safety-app/types";
import { SafetyLayerService } from "../../../../lib/safety-app/improvedSafetyLayers";
import { IncidentHeatmapRenderer } from "../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { RawIncidentsVisualization } from "./visualizations/RawIncidentsVisualization";
import { WeightedVisualization } from "./visualizations/WeightedVisualization";
import { useLayerCache } from "../../hooks/useLayerCache";
import { useSafetyLayers } from "../../hooks/useSafetyLayers";

interface ImprovedNewSafetyMapProps {
  activeVisualization: SafetyVisualizationType;
  filters: Partial<SafetyFilters>;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  geographicLevel: string;
  onSelectionChange?: (data: { geometry: Polygon | null; areaName?: string | null } | null) => void;
}

export default function ImprovedNewSafetyMap({ 
  activeVisualization,
  filters,
  onMapViewReady,
  geographicLevel,
  onSelectionChange
}: ImprovedNewSafetyMapProps) {
  // Map and state management
  const mapViewRef = useRef<__esri.MapView | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Services
  const boundaryService = useRef(new GeographicBoundariesService());
  const safetyLayerService = useMemo(() => new SafetyLayerService(), []);
  
  // Layer references - keep both improved and original layers
  const [safetyGroupLayer, setSafetyGroupLayer] = useState<__esri.GroupLayer | null>(null);
  
  // Use layer cache hook for complex visualizations
  const {
    cachedWeightedLayer,
    setCachedWeightedLayer,
    cachedExtentKey,
    setCachedExtentKey,
    cachedRawIncidentsData,
    setCachedRawIncidentsData,
    cachedRawIncidentsLayer,
    setCachedRawIncidentsLayer,
    rawDataFiltersKey,
    setRawDataFiltersKey,
    generateCacheKey,
    clearRawIncidentsCache
  } = useLayerCache();

  // Use safety layers hook for the original layer infrastructure
  const { incidentsLayer, weightsLayer } = useSafetyLayers(
    viewReady,
    mapViewRef.current,
    boundaryService.current,
    setDataLoading,
    setDataError
  );

  // Handle ArcGIS view ready
  const handleArcgisViewReadyChange = (event: CustomEvent) => {
    const mapView = event.target.view as __esri.MapView;
    mapViewRef.current = mapView;
    console.log('[DEBUG] ImprovedNewSafetyMap - MapView ready');

    if (mapView) {
      mapView.goTo({
        center: [-120, 34.7],
        zoom: 9,
      }).then(() => {
        setViewReady(true);
        
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
        
        console.log('[DEBUG] ImprovedNewSafetyMap - Map view initialization completed');
      }).catch((error: Error) => {
        console.error('[DEBUG] ImprovedNewSafetyMap - Map view initialization failed:', error);
        setViewReady(true);
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
      });
    }
  };

  // Initialize improved layer service when both layers are ready
  useEffect(() => {
    if (!viewReady || !mapViewRef.current || !incidentsLayer) return;

    const initializeLayerService = async () => {
      try {
        console.log('[DEBUG] ImprovedNewSafetyMap - Initializing FeatureFilter service for existing layers');

        // Initialize the safety layer service for efficient DATA SOURCE filtering
        // This provides instant filtering for Police Reports vs BikeMaps.org toggles
        await safetyLayerService.initialize(mapViewRef.current!, incidentsLayer);

        // Add boundary layers
        const boundaryLayers = boundaryService.current.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapViewRef.current!.map.add(layer));

        // Initialize geographic boundaries
        boundaryService.current.switchGeographicLevel(geographicLevel as any, mapViewRef.current!);

        console.log('[DEBUG] ImprovedNewSafetyMap - FeatureFilter service ready for instant data source filtering');

      } catch (error) {
        console.error('[DEBUG] ImprovedNewSafetyMap - Service initialization failed:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to initialize filtering service');
      }
    };

    initializeLayerService();
  }, [viewReady, incidentsLayer, geographicLevel, safetyLayerService]);



  // This single effect handles ALL filter changes by applying a client-side FeatureFilter.
  // It is completely decoupled from the visualization logic and does NOT trigger data reloads.
  useEffect(() => {
    if (!safetyLayerService) return;

    const applyFilters = () => {
      console.log('[DEBUG] Applying FeatureFilter for filter changes:', filters);
      safetyLayerService.applyAdditionalFilters({
        dataSources: filters.dataSource || [],
        // Future filters can be added here, e.g.:
        // severityTypes: filters.severityTypes, 
        // conflictTypes: filters.conflictTypes,
      });
    };

    applyFilters();
  }, [filters, safetyLayerService]);

  // Handle visualization type changes using original logic
  useEffect(() => {
    if (!incidentsLayer || !viewReady || !mapViewRef.current) return;

    // This effect should only run when the activeVisualization or its dependencies change
    // NOT when filters change, to prevent data reloading on simple filter toggles.
    const filtersKey = JSON.stringify(filters);

    const updateVisualization = async () => {
      console.log(`[DEBUG] Updating visualization to: ${activeVisualization}`);
      try {
        setDataLoading(true);

        // Hide all layers before showing the active one
        if (incidentsLayer) incidentsLayer.visible = false;
        if (cachedRawIncidentsLayer) cachedRawIncidentsLayer.visible = false;
        if (cachedWeightedLayer) cachedWeightedLayer.visible = false;

        switch (activeVisualization) {
          case 'raw-incidents':
            await RawIncidentsVisualization.apply(
              mapViewRef.current!, incidentsLayer, filters
            );
            break;

          case 'incident-heatmap':
            if (incidentsLayer) {
              incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as SafetyFilters);
              incidentsLayer.visible = true;
            }
            break;

          case 'incident-to-volume-ratio':
            if (weightsLayer) {
              await WeightedVisualization.createVisualization(
                mapViewRef.current!, filters, incidentsLayer, weightsLayer,
                cachedWeightedLayer, cachedExtentKey, generateCacheKey,
                setCachedWeightedLayer, setCachedExtentKey
              );
            } else {
              console.warn('Weights layer not available for incident-to-volume ratio visualization');
              if (incidentsLayer) {
                incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as SafetyFilters);
                incidentsLayer.visible = true;
              }
            }
            break;

          default:
            console.warn(`Unknown visualization type: ${activeVisualization}`);
            break;
        }
      } catch (error) {
        console.error(`[DEBUG] Failed to update visualization to ${activeVisualization}:`, error);
        setDataError(error instanceof Error ? error.message : `Failed to update to ${activeVisualization}`);
      } finally {
        setDataLoading(false);
      }
    };

    updateVisualization();
    // Re-run this effect when the visualization type changes. Filter changes are handled separately.
  }, [activeVisualization, incidentsLayer, weightsLayer, viewReady]);

  // Handle geographic level changes
  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;

    console.log('[DEBUG] ImprovedNewSafetyMap - Switching geographic level to:', geographicLevel);
    boundaryService.current.switchGeographicLevel(geographicLevel as any, mapViewRef.current);

  }, [geographicLevel, viewReady]);

  // Handle selection changes
  useEffect(() => {
    if (!onSelectionChange) return;

    boundaryService.current.setSelectionChangeCallback(onSelectionChange);
  }, [onSelectionChange]);

  return (
    <div id="improved-safety-map-container" className="w-full h-full relative">
      {/* Loading Overlay */}
      {dataLoading && (
        <div 
          id="safety-map-loading-overlay" 
          className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50"
        >
          <div id="safety-map-loading-content" className="text-center">
            <CircularProgress size={40} />
            <div id="safety-map-loading-text" className="mt-2 text-sm text-gray-600">
              Loading safety data...
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {dataError && (
        <div 
          id="safety-map-error-overlay" 
          className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50"
        >
          <div id="safety-map-error-content" className="text-center max-w-md p-4">
            <div id="safety-map-error-title" className="text-red-600 font-medium mb-2">
              Error Loading Data
            </div>
            <div id="safety-map-error-message" className="text-sm text-gray-600 mb-4">
              {dataError}
            </div>
            <button
              id="safety-map-error-retry-button"
              onClick={() => {
                setDataError(null);
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ArcGIS Map */}
      <MuiBox
        id="safety-arcgis-map-wrapper"
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          '& arcgis-map': {
            width: '100%',
            height: '100%',
          }
        }}
      >
        <ArcgisMap
          basemap="topo-vector"
          onArcgisViewReadyChange={handleArcgisViewReadyChange}
        />
      </MuiBox>
    </div>
  );
}