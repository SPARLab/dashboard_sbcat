import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Polygon from "@arcgis/core/geometry/Polygon";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { ArcgisMap } from "@arcgis/map-components-react";
import { CircularProgress, Box as MuiBox } from "@mui/material";
import { useEffect, useRef, useState, useMemo } from "react";
import { GeographicBoundariesService } from "../../../../lib/data-services/GeographicBoundariesService";
import { SafetyFilters, SafetyVisualizationType } from "../../../../lib/safety-app/types";
import { SafetyLayerService } from "../../../../lib/safety-app/improvedSafetyLayers";
import { IncidentHeatmapRenderer } from "../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { RawIncidentRenderer } from "../../../../lib/safety-app/renderers/RawIncidentRenderer";

import { WeightedVisualization } from "./visualizations/WeightedVisualization";
import { useLayerCache } from "../../hooks/useLayerCache";
import { useSafetyLayers } from "../../hooks/useSafetyLayers";

interface NewSafetyMapProps {
  activeVisualization: SafetyVisualizationType;
  filters: Partial<SafetyFilters>;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  geographicLevel: string;
  onSelectionChange?: (data: { geometry: Polygon | null; areaName?: string | null } | null) => void;
  showLoadingOverlay?: boolean;
}

export default function NewSafetyMap({ 
  activeVisualization,
  filters,
  onMapViewReady,
  geographicLevel,
  onSelectionChange,
  showLoadingOverlay = true
}: NewSafetyMapProps) {
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
  
  // Sketch functionality state (same as volume page)
  const [sketchViewModel, setSketchViewModel] = useState<SketchViewModel | null>(null);
  const [sketchLayer, setSketchLayer] = useState<GraphicsLayer | null>(null);
  
  // Use layer cache hook for complex visualizations
  const {
    cachedWeightedLayer,
    setCachedWeightedLayer,
    cachedExtentKey,
    setCachedExtentKey,
    generateCacheKey
  } = useLayerCache();

  // Use safety layers hook for the original layer infrastructure
  const { incidentsLayer } = useSafetyLayers(
    viewReady,
    mapViewRef.current,
    boundaryService.current,
    setDataLoading,
    setDataError
  );

  // Handle ArcGIS view ready
  const handleArcgisViewReadyChange = (event: CustomEvent) => {
    if (event.target) {
      const mapView = (event.target as any).view as __esri.MapView;
      mapViewRef.current = mapView;

      if (mapView) {
        // Ensure popups are enabled
        mapView.popup.autoOpenEnabled = false; // We'll handle popup opening manually
        mapView.popupEnabled = true;
        
        mapView.goTo({
          center: [-120, 34.7],
          zoom: 9,
        }).then(() => {
          setViewReady(true);
          
          if (onMapViewReady) {
            onMapViewReady(mapView);
          }
          
        }).catch((error: Error) => {
          setViewReady(true);
          if (onMapViewReady) {
            onMapViewReady(mapView);
          }
        });
      }
    }
  };

  // Initialize improved layer service when both layers are ready
  useEffect(() => {
    if (!viewReady || !mapViewRef.current || !incidentsLayer) return;

    const initializeLayerService = async () => {
      try {
        if (!mapViewRef.current) return;
        // Initialize the safety layer service for efficient DATA SOURCE filtering
        // This provides instant filtering for Police Reports vs BikeMaps.org toggles
        await safetyLayerService.initialize(mapViewRef.current, incidentsLayer);

        // Add boundary layers
        const boundaryLayers = boundaryService.current.getBoundaryLayers();
        const map = mapViewRef.current?.map;
        if (map) {
          boundaryLayers.forEach(layer => map.add(layer));
        }

        // Create and add sketch layer for custom draw tool
        const graphicsLayer = new GraphicsLayer();
        if (mapViewRef.current.map) {
          mapViewRef.current.map.add(graphicsLayer);
        }
        setSketchLayer(graphicsLayer);

        // Initialize geographic boundaries
        boundaryService.current.switchGeographicLevel(geographicLevel as any, mapViewRef.current);



      } catch (error) {

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

      
      // Apply filter to the main incidents layer (for heatmaps)
      safetyLayerService.applyAdditionalFilters({
        dataSources: filters.dataSource || [],
        severityTypes: (filters.severityTypes as any) || [],
        conflictTypes: filters.conflictType || [],
        dateRange: filters.dateRange,
        timeOfDay: filters.timeOfDay,
        weekdayFilter: filters.weekdayFilter,
        ebikeMode: filters.ebikeMode,
      });
      
      // Debug: Check what's in the layer after filtering
      if (filters.ebikeMode && incidentsLayer) {
        setTimeout(() => {
          // Use timeout to ensure filter has been applied
          const query = incidentsLayer.createQuery();
          query.where = "hasEbike = 1";
          query.outFields = ["id", "hasEbike", "loc_desc"];
          query.returnGeometry = true;
          
          incidentsLayer.queryFeatures(query).then(result => {
            console.log('🔍 E-bike incidents in layer after filter:', {
              count: result.features.length,
              incidents: result.features.map(f => ({
                id: f.attributes.id,
                hasEbike: f.attributes.hasEbike,
                location: f.attributes.loc_desc,
                hasGeometry: !!f.geometry,
                x: f.geometry?.x,
                y: f.geometry?.y
              }))
            });
          });
        }, 100);
      }

      // Raw incidents now use the same incidentsLayer with different renderer,
      // so they get filtered automatically by the SafetyLayerService above
    };

    applyFilters();
  }, [filters, safetyLayerService]);

  // Handle visualization type changes using original logic
  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;
    
    // For raw incidents, we don't need incidentsLayer, so only check it for other visualizations
    if (activeVisualization !== 'raw-incidents' && !incidentsLayer) return;

    const updateVisualization = async () => {

      try {
        setDataLoading(true);

        // Hide all layers before showing the active one
        if (incidentsLayer) incidentsLayer.visible = false;

        if (cachedWeightedLayer) cachedWeightedLayer.visible = false;

        switch (activeVisualization) {
          case 'raw-incidents':
            // Use the same efficient pattern as incident-heatmap
            if (incidentsLayer) {
              incidentsLayer.renderer = RawIncidentRenderer.getRenderer('severity', filters as SafetyFilters);
              incidentsLayer.visible = true;
              setDataLoading(false);
            }
            break;

          case 'incident-heatmap':
            if (incidentsLayer) {
              incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as SafetyFilters);
              incidentsLayer.visible = true;
            }
            break;

          case 'incident-to-volume-ratio':
            await WeightedVisualization.createVisualization(
              mapViewRef.current!, filters, incidentsLayer,
              cachedWeightedLayer, cachedExtentKey, generateCacheKey,
              setCachedWeightedLayer, setCachedExtentKey
            );
            break;

          default:
            console.warn(`Unknown visualization type: ${activeVisualization}`);
            break;
        }
      } catch (error) {

        setDataError(error instanceof Error ? error.message : `Failed to update to ${activeVisualization}`);
      } finally {
        setDataLoading(false);
      }
    };

    updateVisualization();
    // Re-run this effect when the visualization type changes. Filter changes are handled separately.
  }, [activeVisualization, incidentsLayer, viewReady]);

  // Raw incidents now use the same layer as heatmaps, so no special cleanup needed

  // Handle geographic level changes and custom draw tool (combined like volume page)
  useEffect(() => {
    if (viewReady && boundaryService.current && geographicLevel && mapViewRef.current) {

      
      if (geographicLevel === 'custom' && sketchLayer) {

        // Disable boundary service interactivity and hide its layers
        boundaryService.current.cleanupInteractivity();
        // Also hide the layers associated with the service
        boundaryService.current.getBoundaryLayers().forEach(layer => {
          if (layer.type === 'feature' || layer.type === 'graphics') {
            layer.visible = false;
          }
        });

        // Mark that layer recreation will be needed after SketchViewModel usage
        boundaryService.current.markLayerRecreationNeeded();

        const sketchVM = new SketchViewModel({
          view: mapViewRef.current,
          layer: sketchLayer,
          polygonSymbol: new SimpleFillSymbol({
            color: [138, 43, 226, 0.2], // BlueViolet
            outline: {
              color: [138, 43, 226, 1],
              width: 2,
            },
          }),
        });

        setSketchViewModel(sketchVM);

        sketchVM.on('create', (event: __esri.SketchViewModelCreateEvent) => {
          if (event.state === 'complete') {
            if (onSelectionChange) {
              onSelectionChange({ geometry: event.graphic.geometry as Polygon });
            }
          }
        });

        sketchVM.create('polygon');

      } else {

        if (sketchViewModel) {
          sketchViewModel.destroy();
          setSketchViewModel(null);
        }
        if (sketchLayer) {
          sketchLayer.removeAll();
        }
        // Re-enable boundary service interactivity with layer recreation
        boundaryService.current.switchGeographicLevel(geographicLevel as any, mapViewRef.current);
      }
    }

    return () => {
      if (sketchViewModel) {
        sketchViewModel.destroy();
        setSketchViewModel(null);
      }
    };
  }, [geographicLevel, sketchLayer, viewReady]); // Removed sketchViewModel and onSelectionChange from dependencies

  // Popup handling is now done via popupTemplate on the layers themselves
  // No need for manual click handlers - ArcGIS handles this automatically
  // This approach is more reliable and follows the same pattern as the volume page

  // Handle selection changes
  useEffect(() => {
    if (!onSelectionChange) return;

        boundaryService.current.setSelectionChangeCallback(onSelectionChange as (data: Polygon | { geometry: Polygon | null; areaName?: string | null; } | null) => void);
  }, [onSelectionChange]);

  return (
    <div id="improved-safety-map-container" className="w-full h-full relative">
      {/* Loading Overlay */}
      {dataLoading && showLoadingOverlay && (
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
