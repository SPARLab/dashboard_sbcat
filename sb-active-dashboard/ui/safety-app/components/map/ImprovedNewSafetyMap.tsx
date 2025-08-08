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
  
  // Sketch functionality state (same as volume page)
  const [sketchViewModel, setSketchViewModel] = useState<SketchViewModel | null>(null);
  const [sketchLayer, setSketchLayer] = useState<GraphicsLayer | null>(null);
  
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


    if (mapView) {
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
  };

  // Initialize improved layer service when both layers are ready
  useEffect(() => {
    if (!viewReady || !mapViewRef.current || !incidentsLayer) return;

    const initializeLayerService = async () => {
      try {


        // Initialize the safety layer service for efficient DATA SOURCE filtering
        // This provides instant filtering for Police Reports vs BikeMaps.org toggles
        await safetyLayerService.initialize(mapViewRef.current!, incidentsLayer);

        // Add boundary layers
        const boundaryLayers = boundaryService.current.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapViewRef.current!.map.add(layer));

        // Create and add sketch layer for custom draw tool
        const graphicsLayer = new GraphicsLayer();
        mapViewRef.current!.map.add(graphicsLayer);
        setSketchLayer(graphicsLayer);

        // Initialize geographic boundaries
        boundaryService.current.switchGeographicLevel(geographicLevel as any, mapViewRef.current!);



      } catch (error) {

        setDataError(error instanceof Error ? error.message : 'Failed to initialize filtering service');
      }
    };

    initializeLayerService();
  }, [viewReady, incidentsLayer, geographicLevel, safetyLayerService]);



  const [rawIncidentsLayer, setRawIncidentsLayer] = useState<__esri.FeatureLayer | null>(null);

  // This single effect handles ALL filter changes by applying a client-side FeatureFilter.
  // It is completely decoupled from the visualization logic and does NOT trigger data reloads.
  useEffect(() => {
    if (!safetyLayerService) return;

    const applyFilters = () => {

      
      // Apply filter to the main incidents layer (for heatmaps)
      safetyLayerService.applyAdditionalFilters({
        dataSources: filters.dataSource || [],
        severityTypes: filters.severityTypes || [],
        conflictTypes: filters.conflictType || [],
        dateRange: filters.dateRange,
        timeOfDay: filters.timeOfDay,
        weekdayFilter: filters.weekdayFilter,
      });

      // Also apply the same filter to the client-side raw incidents layer
      if (rawIncidentsLayer) {
        const whereClauses: string[] = [];
        
        // Data source filter
        const dataSources = filters.dataSource || [];
        if (dataSources.length === 0) {
          whereClauses.push("1=0"); // Hide all
        } else if (dataSources.length === 1) {
          const source = dataSources[0];
          if (source === 'SWITRS') {
            whereClauses.push("(data_source = 'SWITRS' OR data_source = 'Police')");
          } else {
            whereClauses.push("(data_source = 'BikeMaps.org' OR data_source = 'BikeMaps')");
          }
        }
        // If both sources selected, no need to add data source filter
        
        // Severity filter
        const severityTypes = filters.severityTypes || [];
        if (severityTypes.length === 0) {
          // If no severity types selected, show nothing
          whereClauses.push('1=0');
        } else if (severityTypes.length < 5) {
          // Use severity values directly - no special handling needed
          const severityConditions = severityTypes.map(type => `maxSeverity = '${type}'`);
          
          if (severityConditions.length > 0) {
            whereClauses.push(`(${severityConditions.join(' OR ')})`);
          }
        }
        
        // Conflict type filter
        const conflictTypes = filters.conflictType || [];
        if (conflictTypes.length === 0) {
          // If no conflict types selected, show nothing
          whereClauses.push('1=0');
        } else if (conflictTypes.length < 7) {
          // Only add filter if not all conflict types are selected
          const conflictConditions = conflictTypes.map(type => `conflict_type = '${type}'`);
          
          if (conflictConditions.length > 0) {
            whereClauses.push(`(${conflictConditions.join(' OR ')})`);
          }
        }
        
        // Date range filter
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          // Format dates for ArcGIS TIMESTAMP queries (YYYY-MM-DD HH:MI:SS)
          const startStr = start.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
          const endStr = end.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
          whereClauses.push(`(timestamp >= TIMESTAMP '${startStr}' AND timestamp <= TIMESTAMP '${endStr}')`);
        }
        
        // Time of day filter
        if (filters.timeOfDay?.enabled && filters.timeOfDay.periods.length > 0) {
          if (filters.timeOfDay.periods.length < 3) {
            // Only add filter if not all time periods are selected
            const timeConditions: string[] = [];
            
            filters.timeOfDay.periods.forEach(period => {
              switch (period) {
                case 'morning':
                  // Morning: 00:00 to 11:59 (midnight to noon)
                  timeConditions.push("EXTRACT(HOUR FROM timestamp) >= 0 AND EXTRACT(HOUR FROM timestamp) < 12");
                  break;
                case 'afternoon':
                  // Afternoon: 12:00 to 16:59 (noon to 5pm)
                  timeConditions.push("EXTRACT(HOUR FROM timestamp) >= 12 AND EXTRACT(HOUR FROM timestamp) < 17");
                  break;
                case 'evening':
                  // Evening: 17:00 to 23:59 (5pm to midnight)
                  timeConditions.push("EXTRACT(HOUR FROM timestamp) >= 17 AND EXTRACT(HOUR FROM timestamp) <= 23");
                  break;
              }
            });
            
            if (timeConditions.length > 0) {
              whereClauses.push(`(${timeConditions.join(' OR ')})`);
            }
          }
        }
        
        // Weekday filter
        if (filters.weekdayFilter?.enabled) {
          let weekdayClause = '';
          if (filters.weekdayFilter.type === 'weekdays') {
            // Weekdays: Monday(2) through Friday(6)
            weekdayClause = "MOD(CAST((timestamp - DATE '2000-01-01') AS INT) + 6, 7) + 1 BETWEEN 2 AND 6";
          } else {
            // Weekends: Saturday(7) and Sunday(1)  
            weekdayClause = "MOD(CAST((timestamp - DATE '2000-01-01') AS INT) + 6, 7) + 1 IN (1, 7)";
          }
          whereClauses.push(`(${weekdayClause})`);
        }
        
        const whereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : "1=1";
        rawIncidentsLayer.definitionExpression = whereClause;

      }
    };

    applyFilters();
  }, [filters, safetyLayerService, rawIncidentsLayer]);

  // Handle visualization type changes using original logic
  useEffect(() => {
    if (!incidentsLayer || !viewReady || !mapViewRef.current) return;

    const updateVisualization = async () => {

      try {
        setDataLoading(true);

        // Hide all layers before showing the active one
        if (incidentsLayer) incidentsLayer.visible = false;
        if (rawIncidentsLayer) rawIncidentsLayer.visible = false;
        if (cachedWeightedLayer) cachedWeightedLayer.visible = false;

        switch (activeVisualization) {
          case 'raw-incidents':
            const clientSideLayer = await RawIncidentsVisualization.getLayer(
              mapViewRef.current!, filters, setDataLoading
            );
            if (clientSideLayer) {
              setRawIncidentsLayer(clientSideLayer);
              clientSideLayer.visible = true;
            }
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

        setDataError(error instanceof Error ? error.message : `Failed to update to ${activeVisualization}`);
      } finally {
        setDataLoading(false);
      }
    };

    updateVisualization();
    // Re-run this effect when the visualization type changes. Filter changes are handled separately.
  }, [activeVisualization, incidentsLayer, weightsLayer, viewReady]);

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
              onSelectionChange(event.graphic.geometry as Polygon);
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
            popupEnabled={true}
          />
      </MuiBox>
    </div>
  );
}