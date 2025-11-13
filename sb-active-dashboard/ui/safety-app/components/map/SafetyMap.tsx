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
import { SchoolDistrictFilter } from "../../../components/filters/GeographicLevelSection";
import { VolumeWeightConfig, RiskCategoryFilters } from "../../../../lib/safety-app/utils/incidentRiskMatrix";

interface SafetyMapProps {
  activeVisualization: SafetyVisualizationType;
  filters: Partial<SafetyFilters>;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  onIncidentsLayerReady?: (layer: __esri.FeatureLayer) => void;
  geographicLevel: string;
  schoolDistrictFilter?: SchoolDistrictFilter;
  onSelectionChange?: (data: { geometry: Polygon | null; areaName?: string | null } | null) => void;
  showLoadingOverlay?: boolean;
  riskFilters?: RiskCategoryFilters;
  selectedGeometry?: __esri.Polygon | null;
}

export default function SafetyMap({ 
  activeVisualization,
  filters,
  onMapViewReady,
  onIncidentsLayerReady,
  geographicLevel,
  schoolDistrictFilter,
  onSelectionChange,
  showLoadingOverlay = true,
  riskFilters,
  selectedGeometry
}: SafetyMapProps) {
  // Map and state management
  const mapViewRef = useRef<__esri.MapView | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const highwayFilterTimeoutRef = useRef<number | null>(null);
  const [serviceReady, setServiceReady] = useState(false);
  
  // Services
  const boundaryService = useRef(new GeographicBoundariesService());
  const safetyLayerService = useMemo(() => new SafetyLayerService(), []);
  
  // Layer references - keep both improved and original layers
  const [safetyGroupLayer, setSafetyGroupLayer] = useState<__esri.GroupLayer | null>(null);
  
  // Sketch functionality state (same as volume page)
  const [sketchViewModel, setSketchViewModel] = useState<SketchViewModel | null>(null);
  const [sketchLayer, setSketchLayer] = useState<GraphicsLayer | null>(null);
  
  // SIMPLIFIED: Only use cache for weighted visualization
  const {
    cachedWeightedLayer,
    setCachedWeightedLayer,
    cachedExtentKey,
    setCachedExtentKey,
    generateCacheKey,
    cachedVolumeLayers,
    setCachedVolumeLayers,
    volumeLayersCacheKey,
    setVolumeLayersCacheKey
  } = useLayerCache();

  // Use safety layers hook for the original layer infrastructure
  const { incidentsLayer } = useSafetyLayers(
    viewReady,
    mapViewRef.current,
    boundaryService.current,
    setDataLoading,
    setDataError
  );

  // Notify parent when incidents layer is ready
  useEffect(() => {
    if (incidentsLayer && onIncidentsLayerReady) {
      onIncidentsLayerReady(incidentsLayer);
    }
  }, [incidentsLayer, onIncidentsLayerReady]);

  // Handle ArcGIS view ready
  const handleArcgisViewReadyChange = (event: CustomEvent) => {
    if (event.target) {
      const mapView = (event.target as any).view as __esri.MapView;
      mapViewRef.current = mapView;

      if (mapView) {
        // Ensure popups are enabled
        if (mapView.popup) {
          mapView.popup.autoCloseEnabled = false; // We'll handle popup opening manually
        }
        mapView.popupEnabled = true;
        
        // Note: Removed zoom listener - using referenceScale in renderer for consistent visualization
        
        mapView.goTo({
          center: [-120, 34.7],
          zoom: 9,
        }).then(() => {
          setViewReady(true);
          
          // Expose MapView globally for testing purposes
          if (typeof window !== 'undefined' && (import.meta as any).env.MODE !== 'production') {
            (window as any).__testMapView = mapView;
            (window as any).__testBoundaryService = boundaryService.current;
          }
          
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
        setServiceReady(true);

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
    if (!safetyLayerService || !serviceReady) {
      return;
    }

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

      // Raw incidents now use the same incidentsLayer with different renderer,
      // so they get filtered automatically by the SafetyLayerService above
    };

    applyFilters();
    
    // CRITICAL: Force layer refresh when switching from e-bike to all
    if (incidentsLayer && !filters.ebikeMode) {
      setTimeout(() => {
        incidentsLayer.refresh();
      }, 200);
    }
  }, [filters, safetyLayerService, serviceReady, incidentsLayer]);

  // Separate effect for highway filtering - only runs when highway filter or geometry changes
  useEffect(() => {
    if (!incidentsLayer || !serviceReady) {
      return;
    }

    // Clear any pending highway filter operation
    if (highwayFilterTimeoutRef.current) {
      clearTimeout(highwayFilterTimeoutRef.current);
    }

    const applyHighwayFilter = async () => {
      // 🛣️ Apply highway filtering if enabled and geometry is selected
      if (filters.excludeHighwayIncidents && selectedGeometry) {
        console.log('🛣️ [NewSafetyMap] Applying highway exclusion filter to map layer...');
        const startTime = performance.now();
        try {
          const { HighwayFilterService } = await import('../../../../lib/data-services/HighwayFilterService');
          
          // Get the highway buffer (will use cache if available)
          const bufferStartTime = performance.now();
          const highwayBuffer = await HighwayFilterService.createCombinedHighwayBuffer(
            selectedGeometry,
            75 // 75 feet buffer distance
          );
          console.log(`🛣️ [NewSafetyMap] Got highway buffer in ${(performance.now() - bufferStartTime).toFixed(0)}ms`);
          
          if (!highwayBuffer) {
            console.log('🛣️ [NewSafetyMap] No highways found in area');
            return;
          }
          
          // OPTIMIZATION: Query for incidents IN the highway buffer (typically small set)
          // Then EXCLUDE those IDs - much faster than querying for 'disjoint'
          const query = incidentsLayer.createQuery();
          query.where = '1=1'; // Get all features that pass the current filters
          query.geometry = highwayBuffer as any;
          query.spatialRelationship = 'intersects'; // Get incidents IN the highway buffer
          query.outFields = ['id'];
          query.returnGeometry = false; // Don't need geometry, just IDs
          
          const spatialStartTime = performance.now();
          const result = await incidentsLayer.queryFeatures(query);
          console.log(`🛣️ [NewSafetyMap] ArcGIS spatial query completed in ${(performance.now() - spatialStartTime).toFixed(0)}ms`);
          
          // Get IDs of highway incidents to EXCLUDE
          const highwayIncidentIds = result.features.map(f => f.attributes.id);
          
          if (highwayIncidentIds.length > 0) {
            // Exclude highway incidents
            const definitionExpression = `id NOT IN (${highwayIncidentIds.join(',')})`;
            incidentsLayer.definitionExpression = definitionExpression;
            const totalTime = (performance.now() - startTime).toFixed(0);
            console.log(`🛣️ [NewSafetyMap] ✅ Applied highway filter in ${totalTime}ms - excluded ${highwayIncidentIds.length} highway incidents`);
          } else {
            // No highway incidents found - show all incidents
            incidentsLayer.definitionExpression = '';
            console.log('🛣️ [NewSafetyMap] No highway incidents found - showing all incidents');
          }
        } catch (error) {
          console.error('🛣️ [NewSafetyMap] Failed to apply highway filter:', error);
        }
      } else {
        // Clear highway filter if it was previously applied
        if (incidentsLayer.definitionExpression && incidentsLayer.definitionExpression.includes('id NOT IN (')) {
          incidentsLayer.definitionExpression = '';
          console.log('🛣️ [NewSafetyMap] Cleared highway exclusion filter from map layer');
        }
      }
    };

    // Debounce the highway filter application slightly
    highwayFilterTimeoutRef.current = setTimeout(() => {
      applyHighwayFilter();
    }, 100);

    return () => {
      if (highwayFilterTimeoutRef.current) {
        clearTimeout(highwayFilterTimeoutRef.current);
      }
    };
  }, [filters.excludeHighwayIncidents, selectedGeometry, incidentsLayer, serviceReady]);

  // SIMPLIFIED: Handle visualization changes using single layer approach
  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;
    
    // All visualizations now use the main incidentsLayer
    if (!incidentsLayer) return;

    const updateVisualization = async () => {

      try {
        setDataLoading(true);

        // SIMPLIFIED: Only hide weighted layer, keep main layer visible
        
        // Hide old weighted layer (deprecated)
        if (cachedWeightedLayer) {
          cachedWeightedLayer.visible = false;
        }
        
        // Hide volume category layers when switching away from that visualization
        if (activeVisualization !== 'incident-to-volume-ratio') {
          if (cachedVolumeLayers.low) cachedVolumeLayers.low.visible = false;
          if (cachedVolumeLayers.medium) cachedVolumeLayers.medium.visible = false;
          if (cachedVolumeLayers.high) cachedVolumeLayers.high.visible = false;
        }

        // SIMPLIFIED: Use only the main incidents layer for all visualizations
        if (incidentsLayer) {
          
          // CRITICAL: Always refresh the renderer to ensure proper display
          let newRenderer;
          
          switch (activeVisualization) {
            case 'raw-incidents':
              newRenderer = RawIncidentRenderer.getRenderer('severity', filters as SafetyFilters);
              break;
              
            case 'incident-heatmap':
              newRenderer = IncidentHeatmapRenderer.getRenderer('density', filters as SafetyFilters);
              break;
              
            case 'incident-to-volume-ratio':
              // For volume-categorized visualization, create layers once and cache them
              // Layer visibility is controlled separately via the riskFilters effect
              await WeightedVisualization.createVisualization(
                mapViewRef.current!, filters, incidentsLayer,
                cachedWeightedLayer, cachedExtentKey, generateCacheKey,
                setCachedWeightedLayer, setCachedExtentKey,
                undefined, // deprecated volumeWeights
                riskFilters,
                cachedVolumeLayers,
                setCachedVolumeLayers,
                volumeLayersCacheKey,
                setVolumeLayersCacheKey
              );
              return; // Early return for volume-categorized visualization
              
            default:
              console.warn(`Unknown visualization type: ${activeVisualization}`);
              return;
          }
          
          // Force renderer update
          incidentsLayer.renderer = newRenderer;
          
          // CRITICAL: Force layer refresh to ensure all features are visible
          incidentsLayer.refresh();
          
          // Make sure the main layer is visible for all non-weighted visualizations
          incidentsLayer.visible = true;
          
          // Hide weighted layer if it exists
          if (cachedWeightedLayer) {
            cachedWeightedLayer.visible = false;
          }
          
        }
        
        
      } catch (error) {

        setDataError(error instanceof Error ? error.message : `Failed to update to ${activeVisualization}`);
      } finally {
        setDataLoading(false);
      }
    };

    updateVisualization();
    // Re-run this effect when the visualization type changes. Filter changes are handled separately.
    // NOTE: riskFilters is intentionally NOT in the dependency array to prevent layer recreation on toggle
  }, [activeVisualization, incidentsLayer, viewReady]);

  // Update volume category layer visibility when filters change (performance optimized)
  // This effect only toggles layer visibility without recreating layers
  useEffect(() => {
    if (mapViewRef.current && riskFilters && activeVisualization === 'incident-to-volume-ratio' && viewReady) {
      // Only update visibility if we're viewing the volume-categorized visualization
      WeightedVisualization.updateRiskLayerVisibility(mapViewRef.current, riskFilters);
    }
  }, [riskFilters, activeVisualization, viewReady]);

  // Raw incidents now use the same layer as heatmaps, so no special cleanup needed

  // Handle geographic level changes and custom draw tool (combined like volume page)
  useEffect(() => {
    if (viewReady && boundaryService.current && geographicLevel && mapViewRef.current) {
      // Clear any existing selection when switching geographic levels
      if (onSelectionChange) {
        onSelectionChange(null);
      }
      
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
            const polygon = event.graphic.geometry as Polygon;
            
            // 🔍 DEBUG: Log detailed polygon coordinates
            console.group('🔍 [SAFETY DEBUG] Custom Draw Tool - Polygon Created');
            console.log('Raw polygon object:', polygon);
            console.log('Polygon type:', polygon.type);
            console.log('Spatial Reference WKID:', polygon.spatialReference?.wkid);
            console.log('Number of rings:', polygon.rings?.length);
            
            if (polygon.rings && polygon.rings.length > 0) {
              console.log('First ring coordinates (first 5 points):');
              polygon.rings[0].slice(0, 5).forEach((point, index) => {
                console.log(`  Point ${index}: [${point[0]}, ${point[1]}]`);
              });
              console.log('Polygon extent:', {
                xmin: polygon.extent?.xmin,
                ymin: polygon.extent?.ymin,
                xmax: polygon.extent?.xmax,
                ymax: polygon.extent?.ymax
              });
            }
            console.groupEnd();
            
            if (onSelectionChange) {
              // Match the working VolumeMap.tsx implementation exactly
              onSelectionChange({ 
                geometry: polygon,
                areaName: 'Custom Selected Area'
              });
            }
          }
        });

        sketchVM.create('polygon');

      } else {
        // Switching away from custom draw tool - clean up
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

  // Apply school district filtering when filter changes
  useEffect(() => {
    if (geographicLevel === 'school-districts' && schoolDistrictFilter && boundaryService.current) {
      boundaryService.current.applySchoolDistrictFilter(schoolDistrictFilter);
    }
  }, [schoolDistrictFilter, geographicLevel]);

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
