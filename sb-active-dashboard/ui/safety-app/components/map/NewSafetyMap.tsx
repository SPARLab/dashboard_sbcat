import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Polygon from "@arcgis/core/geometry/Polygon";
import { ArcgisMap } from "@arcgis/map-components-react";
import { CircularProgress, Box as MuiBox } from "@mui/material";
import { useEffect } from "react";
import { IncidentHeatmapRenderer } from "../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { SafetyFilters, SafetyVisualizationType } from "../../../../lib/safety-app/types";
import { useLayerCache } from "../../hooks/useLayerCache";
import { useMapState } from "../../hooks/useMapState";
import { useSafetyLayers } from "../../hooks/useSafetyLayers";
import { MapClickHandler } from "./handlers/MapClickHandler";
import { RawIncidentsVisualization } from "./visualizations/RawIncidentsVisualization";
import { WeightedVisualization } from "./visualizations/WeightedVisualization";

interface NewSafetyMapProps {
  activeVisualization: SafetyVisualizationType;
  filters: Partial<SafetyFilters>;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  geographicLevel: string;
  onSelectionChange?: (data: { geometry: Polygon | null; areaName?: string | null } | null) => void;
}

export default function NewSafetyMap({ 
  activeVisualization,
  filters,
  onMapViewReady,
  geographicLevel,
  onSelectionChange
}: NewSafetyMapProps) {
  // Use custom hooks for state management
  const {
    mapViewRef,
    viewReady,
    dataLoading,
    setDataLoading,
    dataError,
    setDataError,
    boundaryService,
    handleArcgisViewReadyChange
  } = useMapState({ onMapViewReady, onSelectionChange });

  // Use layer cache hook
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

  // Use safety layers hook
  const { incidentsLayer, weightsLayer } = useSafetyLayers(
    viewReady,
    mapViewRef.current,
    boundaryService,
    setDataLoading,
    setDataError
  );





  // Setup map click handlers for incident popups
  useEffect(() => {
    if (!viewReady || !mapViewRef.current || !incidentsLayer) return;

    const clickHandle = MapClickHandler.setupClickHandler(
      mapViewRef.current,
      incidentsLayer,
      filters,
      activeVisualization
    );

    return () => {
      if (clickHandle) {
        clickHandle.remove();
      }
    };
  }, [viewReady, incidentsLayer, filters, activeVisualization]);

  // Clear cached raw incidents when filters change  
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(filters);
    if (rawDataFiltersKey && rawDataFiltersKey !== currentFiltersKey) {
      clearRawIncidentsCache(mapViewRef.current || undefined);
    }
  }, [filters, rawDataFiltersKey, clearRawIncidentsCache, cachedRawIncidentsLayer]);

  // Update layers when active visualization changes
  useEffect(() => {
    if (!incidentsLayer || !viewReady || !mapViewRef.current) return;

    const updateVisualization = async () => {
      try {
        setDataLoading(true);

        // Clean up any existing weighted layer if not using incident-to-volume-ratio
        if (activeVisualization !== 'incident-to-volume-ratio') {
          // Hide cached layer but don't destroy it
          if (cachedWeightedLayer) {
            cachedWeightedLayer.visible = false;
            console.log('[DEBUG] Hiding cached weighted layer, but keeping it for later use');
          }
          
          // Also clean up any other weighted layers
          if (mapViewRef.current?.map) {
            const existingWeightedLayer = mapViewRef.current.map.layers.find(
              (layer: __esri.Layer) => layer.title === "Weighted Safety Incidents"
            );
            if (existingWeightedLayer && existingWeightedLayer !== cachedWeightedLayer) {
              mapViewRef.current.map.remove(existingWeightedLayer);
            }
          }
        }

        // Remove any existing renderer or feature reduction
        incidentsLayer.featureReduction = null;
        incidentsLayer.renderer = null;

        switch (activeVisualization) {
          case 'raw-incidents':
            await RawIncidentsVisualization.createVisualization(
              mapViewRef.current!,
              filters,
              incidentsLayer,
              cachedRawIncidentsLayer,
              cachedRawIncidentsData,
              rawDataFiltersKey,
              setDataLoading,
              setCachedRawIncidentsLayer,
              setCachedRawIncidentsData,
              setRawDataFiltersKey
            );
            break;

          case 'incident-heatmap':
            // Use heatmap renderer for density visualization
            incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as SafetyFilters);
            incidentsLayer.visible = true;
            break;

          case 'incident-to-volume-ratio':
            if (weightsLayer) {
              await WeightedVisualization.createVisualization(
                mapViewRef.current!,
                filters,
                incidentsLayer,
                weightsLayer,
                cachedWeightedLayer,
                cachedExtentKey,
                generateCacheKey,
                setCachedWeightedLayer,
                setCachedExtentKey
              );
            } else {
              console.warn('Weights layer not available for incident-to-volume ratio visualization');
              // Fallback to regular heatmap
              incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as SafetyFilters);
              incidentsLayer.visible = true;
            }
            break;

          default:
            incidentsLayer.visible = false;
            break;
        }

        setDataLoading(false);
      } catch (error) {
        console.error('[DEBUG] Failed to update visualization:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to update visualization');
        setDataLoading(false);
      }
    };

    updateVisualization();
  }, [activeVisualization, filters, incidentsLayer, weightsLayer, cachedWeightedLayer, cachedExtentKey, cachedRawIncidentsLayer, cachedRawIncidentsData, rawDataFiltersKey, generateCacheKey, setCachedWeightedLayer, setCachedExtentKey, setCachedRawIncidentsLayer, setCachedRawIncidentsData, setRawDataFiltersKey]);





  // Update boundary visualization based on geographic level
  useEffect(() => {
    if (!viewReady || !boundaryService || !mapViewRef.current) return;

    const updateBoundaries = async () => {
      try {
        // Convert geographicLevel to the format expected by boundary service
        let boundaryLevel: 'city' | 'county' | 'census-tract' | 'city-service-area' = 'city';
        switch (geographicLevel) {
          case 'cities':
            boundaryLevel = 'city';
            break;
          case 'counties':
            boundaryLevel = 'county';
            break;
          case 'census-tracts':
            boundaryLevel = 'census-tract';
            break;
          case 'city-service-areas':
            boundaryLevel = 'city-service-area';
            break;
          default:
            boundaryLevel = 'city';
        }

        if (mapViewRef.current) {
          await boundaryService.switchGeographicLevel(boundaryLevel, mapViewRef.current);
        }
        
      } catch (error) {
        console.error('[DEBUG] Failed to update boundaries:', error);
      }
    };

    updateBoundaries();
  }, [viewReady, geographicLevel, boundaryService]);

  // Handle extent changes for other visualizations (raw incidents now cache all data)
  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;

    const handle = reactiveUtils.when(
      () => mapViewRef.current?.stationary,
      () => {
        if (mapViewRef.current?.stationary && incidentsLayer) {
          // Raw incidents no longer need extent-based refresh - they load all data once
          // Only other visualizations need extent-based updates
          if (activeVisualization !== 'raw-incidents' && activeVisualization !== 'incident-to-volume-ratio') {
            console.log('[DEBUG] Map extent changed, refreshing safety data');
            // Other visualizations might need to refresh
          }
        }
      }
    );

    return () => handle.remove();
  }, [viewReady, incidentsLayer, filters, activeVisualization]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (boundaryService) {
        boundaryService.cleanupInteractivity();
      }
      
      // Clean up weighted layer
      const currentMapView = mapViewRef.current;
      if (currentMapView && currentMapView.map) {
        const existingWeightedLayer = currentMapView.map.layers.find(
          (layer: __esri.Layer) => layer.title === "Weighted Safety Incidents"
        );
        if (existingWeightedLayer) {
          currentMapView.map.remove(existingWeightedLayer);
        }
        
        // Clean up cached raw incidents layer
        const existingRawLayer = currentMapView.map.layers.find(
          (layer: __esri.Layer) => layer.title === "Raw Safety Incidents"
        );
        if (existingRawLayer) {
          currentMapView.map.remove(existingRawLayer);
        }
      }
    };
  }, [boundaryService]);

  return (
    <MuiBox
      id="new-safety-map-container"
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Loading overlay */}
      {dataLoading && (
        <MuiBox
          id="safety-map-loading-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <div id="safety-map-loading-container" className="flex flex-col items-center gap-3">
            <CircularProgress 
              size={48} 
              sx={{ color: '#3B82F6' }} // Tailwind blue-500
            />
            <div id="safety-map-loading-text" className="text-gray-600 font-medium">
              Loading safety data...
            </div>
          </div>
        </MuiBox>
      )}

      {/* Error overlay */}
      {dataError && (
        <MuiBox
          id="safety-map-error-overlay"
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            padding: 2,
            borderRadius: 1,
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
        >
          <div id="safety-map-error-text" className="font-medium">
            Error: {dataError}
          </div>
          <button
            id="safety-map-error-dismiss"
            onClick={() => setDataError(null)}
            className="mt-2 px-3 py-1 bg-white bg-opacity-20 rounded text-sm hover:bg-opacity-30"
          >
            Dismiss
          </button>
        </MuiBox>
      )}

      {/* Map component */}
      <ArcgisMap
        basemap="topo-vector"
        onArcgisViewReadyChange={handleArcgisViewReadyChange}
        style={{ width: '100%', height: '100%' }}
      />


    </MuiBox>
  );
}