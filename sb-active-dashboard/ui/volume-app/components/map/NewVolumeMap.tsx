import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Polygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import { ArcgisMap } from "@arcgis/map-components-react";
import { Box as MuiBox } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { GeographicBoundariesService } from "../../../../lib/data-services/GeographicBoundariesService";
import { ModeledVolumeDataService } from "../../../../lib/data-services/ModeledVolumeDataService";
import { useVolumeAppStore } from "../../../../lib/stores/volume-app-state";
import { HourlyData, queryHourlyCounts } from "../../../../lib/volume-app/hourlyStats";
import { createAADTLayer, createHexagonLayer, shouldShowLineSegments, ZOOM_THRESHOLD_FOR_LINE_SEGMENTS } from "../../../../lib/volume-app/volumeLayers";
import { createDynamicLineLayer, applyDynamicLineRenderer, isConfigurationSupported } from "../../../../lib/volume-app/DynamicLineRenderer";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { VOLUME_LEVEL_CONFIG } from "../../../theme/volumeLevelColors";

import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";

interface NewVolumeMapProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  selectedMode: 'bike' | 'ped';
  modelCountsBy: string;
  selectedYear: number;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  onAadtLayerReady?: (layer: FeatureLayer) => void;
  geographicLevel: string;
  onSelectionChange?: (data: { geometry: Polygon | null; areaName?: string | null } | Polygon | null) => void;
  selectedCountSite?: string | null;
  highlightedBinSites?: string[];
}

export default function NewVolumeMap({ 
  activeTab, 
  showBicyclist,
  showPedestrian,
  selectedMode,
  modelCountsBy,
  selectedYear,
  onMapViewReady,
  onAadtLayerReady,
  geographicLevel,
  onSelectionChange,
  selectedCountSite: selectedCountSiteProp, // Keep for compatibility
  highlightedBinSites: highlightedBinSitesProp = [], // Keep for compatibility
}: NewVolumeMapProps) {
  // Use Zustand store for state management
  const { selectedCountSite, highlightedBinSites, setMapView: setStoreMapView } = useVolumeAppStore();
  const mapViewRef = useRef<any>(null);
  const [viewReady, setViewReady] = useState(false);

  // Layer state
  const [aadtLayer, setAadtLayer] = useState<FeatureLayer | null>(null);
  const [hexagonLayer, setHexagonLayer] = useState<GroupLayer | null>(null);
  const [dynamicLineLayer, setDynamicLineLayer] = useState<FeatureLayer | null>(null);
  
  // Loading state for line layer
  const [isLineLayerLoading, setIsLineLayerLoading] = useState<boolean>(false);
  
  // Zoom level state for layer switching
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(9);
  
  // Boundary service state
  const [boundaryService] = useState(() => {
    const service = new GeographicBoundariesService();
    // Set up selection callback if provided
    if (onSelectionChange) {
      service.setSelectionChangeCallback(onSelectionChange);
    }
    return service;
  });

  // Modeled volume data service for line segment queries
  const [modeledVolumeService] = useState(() => new ModeledVolumeDataService());

  // Hourly data for Cost Benefit Tool (AADT)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  
  // Ref for highlighting selected count site (using ref to avoid dependency issues)
  const highlightGraphicRef = useRef<Graphic | null>(null);
  
  // Ref for highlighting multiple bin sites (using ref to avoid dependency issues)
  const highlightedBinGraphicsRef = useRef<Graphic[]>([]);

  // Handler to set map center/zoom when view is ready
  const handleArcgisViewReadyChange = (event: { target: { view: __esri.MapView } }) => {
    if (event?.target?.view) {
      const mapView = event.target.view;
      mapViewRef.current = mapView;
      
      // Set initial view with proper completion handling
      mapView.goTo({
        center: [-120, 34.7],
        zoom: 9,
      }).then(() => {
        // Only mark as ready after the initial navigation completes
        setViewReady(true);
        
        // Pass mapView back to parent component and update Zustand store
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
        setStoreMapView(mapView);
        
        // Set up zoom level watcher for layer switching
        const zoomWatcher = reactiveUtils.watch(
          () => mapView.zoom,
          (newZoom) => {
            setCurrentZoomLevel(newZoom);
          },
          { initial: true }
        );

      }).catch((error: Error) => {
        
        // Still mark as ready even if navigation fails
        setViewReady(true);
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
        setStoreMapView(mapView);
      });
    }
  };

  const [sketchViewModel, setSketchViewModel] = useState<SketchViewModel | null>(null);
  const [sketchLayer, setSketchLayer] = useState<GraphicsLayer | null>(null);

  // Load layers when map view is ready
  useEffect(() => {
    if (viewReady && mapViewRef.current) {
      const loadLayers = async () => {
        try {
          const aadt = await createAADTLayer();
          // For modeled data, use single mode; for raw data, default to bike
          const modeForHexagon = activeTab === 'modeled-data' ? selectedMode : 'bike';
          const hexagon = createHexagonLayer(modelCountsBy, selectedYear, modeForHexagon);
          
          // Add volume layers to map (bottom layers)
          mapViewRef.current.map.add(aadt);
          mapViewRef.current.map.add(hexagon);
          
          // Add dynamic line layer
          const dynamicLines = createDynamicLineLayer();
          mapViewRef.current.map.add(dynamicLines);
          setDynamicLineLayer(dynamicLines);
          
          // Add modeled volume service layers for spatial querying (invisible but queryable)
          const modeledLayers = modeledVolumeService.getLayers();
          modeledLayers.forEach(layer => {
            mapViewRef.current.map.add(layer);
          });
          
          // Add boundary layers to map (these should render OVER the hexagon layers)
          const boundaryLayers = boundaryService.getBoundaryLayers();
          boundaryLayers.forEach(layer => mapViewRef.current.map.add(layer));
          
          // Add graphics layer for custom drawing (top layer)
          const graphicsLayer = new GraphicsLayer();
          mapViewRef.current.map.add(graphicsLayer);
          setSketchLayer(graphicsLayer);
          
          // Store layer references
          setAadtLayer(aadt);
          setHexagonLayer(hexagon);
          if (onAadtLayerReady) {
            try {
              onAadtLayerReady(aadt);
            } catch (err) {
              console.warn('onAadtLayerReady callback failed:', err);
            }
          }
          
        } catch (error) {
          console.error("Error loading layers:", error);
        }
      };
      
      loadLayers();
    }
  }, [viewReady, boundaryService, modeledVolumeService]);

  // Update hexagon layer when model type, year, or mode changes
  useEffect(() => {
    if (viewReady && mapViewRef.current && hexagonLayer && activeTab === 'modeled-data') {
      // Remove existing hexagon layer
      mapViewRef.current.map.remove(hexagonLayer);
      
      // Create new hexagon layer with updated parameters
      const modeForHexagon = activeTab === 'modeled-data' ? selectedMode : 'bike';
      const newHexagonLayer = createHexagonLayer(modelCountsBy, selectedYear, modeForHexagon);
      
      // Find the position to insert the layer (before boundary layers)
      const allLayers = mapViewRef.current.map.layers;
      const boundaryLayers = boundaryService.getBoundaryLayers();
      let insertIndex = allLayers.length; // Default to end if no boundary layers found
      
      // Find the index of the first boundary layer
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers.getItemAt(i);
        if (boundaryLayers.includes(layer)) {
          insertIndex = i;
          break;
        }
      }
      
      // Add the layer at the calculated index (before boundary layers)
      mapViewRef.current.map.add(newHexagonLayer, insertIndex);
      
      // Update the layer reference
      setHexagonLayer(newHexagonLayer);
      
      // Clear existing line segment graphics when model changes
      // Dynamic line layer will update automatically
    }
  }, [modelCountsBy, selectedYear, selectedMode, activeTab, viewReady, boundaryService]);

    useEffect(() => {
    if (viewReady && boundaryService && geographicLevel && mapViewRef.current) {
      if (geographicLevel === 'custom' && sketchLayer) {
        // Disable boundary service interactivity and hide its layers
        boundaryService.cleanupInteractivity();
        // Also hide the layers associated with the service
        boundaryService.getBoundaryLayers().forEach(layer => {
          if (layer.type === 'feature' || layer.type === 'graphics') {
            layer.visible = false;
          }
        });

        // Mark that layer recreation will be needed after SketchViewModel usage
        boundaryService.markLayerRecreationNeeded();

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
        boundaryService.switchGeographicLevel(geographicLevel as any, mapViewRef.current);
      }
    }

    return () => {
      if (sketchViewModel) {
        sketchViewModel.destroy();
        setSketchViewModel(null);
      }
    };
  }, [geographicLevel, sketchLayer]);

  // Update selection callback when it changes
  useEffect(() => {
    if (onSelectionChange) {
      boundaryService.setSelectionChangeCallback(onSelectionChange);
    }
  }, [boundaryService, onSelectionChange]);

  // Control layers based on tab and model counts selection
  useEffect(() => {
    if (aadtLayer && hexagonLayer) {
      if (activeTab === 'raw-data' || activeTab === 'data-completeness') {
        // Show raw AADT data for both Raw Data and Data Completeness tabs
        aadtLayer.visible = true;
        hexagonLayer.visible = false;
        // Dynamic line layer visibility controlled by zoom effect
        // Dynamic line layer will update automatically
      } else { // 'modeled-data' tab
        aadtLayer.visible = false;
        // Show appropriate layer based on zoom level
        const showLineSegments = shouldShowLineSegments(currentZoomLevel);
        hexagonLayer.visible = !showLineSegments;
        
        if (showLineSegments) {
          // Set visibility based on user toggles
          // Dynamic line layer visibility controlled by zoom effect
        } else {
          // Hide line segments and clear graphics when showing hexagons
          // Dynamic line layer visibility controlled by zoom effect
          // Dynamic line layer will update automatically
        }
      }
    }
  }, [activeTab, modelCountsBy, aadtLayer, hexagonLayer, currentZoomLevel, selectedMode, showBicyclist, showPedestrian]);

  // DYNAMIC STYLING: Instant switch between hexagon and line views
  useEffect(() => {
    if (activeTab === 'modeled-data' && hexagonLayer && dynamicLineLayer) {
      const showLineSegments = shouldShowLineSegments(currentZoomLevel);
      
      if (showLineSegments) {
        // ZOOM 16+: Show line segments with dynamic styling
        const applyDynamicStyling = async () => {
          try {
            setIsLineLayerLoading(true);
            
            // For modeled data, use single selected mode
            // For raw data, determine based on toggles (default to bike if both or neither)
            let countType: 'bike' | 'ped';
            if (activeTab === 'modeled-data') {
              countType = selectedMode;
            } else {
              // Raw data logic: prefer bike if both enabled, or use whichever is enabled
              if (showBicyclist && !showPedestrian) {
                countType = 'bike';
              } else if (showPedestrian && !showBicyclist) {
                countType = 'ped';
              } else {
                // Both enabled or neither enabled - default to bike
                countType = 'bike';
              }
            }

            const config = {
              modelCountsBy: modelCountsBy as 'cost-benefit' | 'strava-bias',
              selectedYear,
              countType
            };

            // Check if configuration is supported
            if (!isConfigurationSupported(config)) {
              console.warn(`⚠️ Configuration not supported: ${JSON.stringify(config)}`);
              hexagonLayer.visible = true;
              dynamicLineLayer.visible = false;
              setIsLineLayerLoading(false);
              return;
            }

            // Apply dynamic styling instantly
            await applyDynamicLineRenderer(dynamicLineLayer, config);
            
            // Switch visibility
            hexagonLayer.visible = false;
            dynamicLineLayer.visible = true;
            
          } catch (error) {
            console.error('❌ Error applying dynamic styling:', error);
          } finally {
            setIsLineLayerLoading(false);
          }
        };

        applyDynamicStyling();
        
      } else {
        // ZOOM < 16: Show hexagons, hide line segments
        hexagonLayer.visible = true;
        dynamicLineLayer.visible = false;
        setIsLineLayerLoading(false);
      }
    }
  }, [currentZoomLevel, activeTab, hexagonLayer, dynamicLineLayer, modelCountsBy, selectedYear, selectedMode, showBicyclist, showPedestrian]);

  // Note: Layer visibility is now controlled by the single mode selection
  // The hexagon layer is recreated when mode changes, so no additional visibility control needed

  // Dynamic line layer handles extent changes automatically via ArcGIS FeatureLayer

  // Listen to map view changes to query hourly data for raw count sites
  useEffect(() => {
    // Only query when raw data or data completeness tabs are active and view is ready
    if ((activeTab !== "raw-data" && activeTab !== "data-completeness") || !viewReady || !mapViewRef.current) {
      setHourlyData([]); // Clear data when not on raw data or data completeness tabs
      return;
    }

    const handleViewChange = async () => {
      try {
        const stats = await queryHourlyCounts(
          mapViewRef.current,
          showBicyclist,
          showPedestrian
        );
        setHourlyData(stats.hourlyData);
      } catch (error) {
        console.error("Error fetching hourly data on view change:", error);
      }
    };

    // Debounce the view change handler
    let timeoutId: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleViewChange, 500);
    };

    // Initial fetch
    handleViewChange(); 
    
    // Watch for extent changes
    const watcher = reactiveUtils.watch(
      () => mapViewRef.current.extent,
      debouncedHandler
    );

    return () => {
      clearTimeout(timeoutId);
      if (watcher) {
        watcher.remove(); // Clean up watcher
      }
    };
  }, [viewReady, activeTab, showBicyclist, showPedestrian]);

  // Handle count site highlighting
  useEffect(() => {
    // IMMEDIATELY clear any existing highlight and close popup when selection changes
    if (highlightGraphicRef.current && mapViewRef.current?.graphics) {
      mapViewRef.current.graphics.remove(highlightGraphicRef.current);
      highlightGraphicRef.current = null;
    }
    
    // Also clear any bin highlights when selecting individual sites
    if (highlightedBinGraphicsRef.current.length > 0 && mapViewRef.current?.graphics) {
      highlightedBinGraphicsRef.current.forEach(graphic => {
        mapViewRef.current.graphics.remove(graphic);
      });
      highlightedBinGraphicsRef.current = [];
    }
    
    if (mapViewRef.current?.popup) {
      mapViewRef.current.popup.visible = false;
    }

    // If no site selected or prerequisites not met, stop here
    if (!viewReady || !mapViewRef.current || !aadtLayer || !selectedCountSite) {
      return;
    }

    const highlightCountSite = async () => {
      try {
        // Note: highlight was already cleared above for immediate feedback

        // Query the AADT layer for the selected count site by name
        const query = aadtLayer.createQuery();
        query.where = `name = '${selectedCountSite}'`;
        query.outFields = ["*"];
        query.returnGeometry = true;

        const results = await aadtLayer.queryFeatures(query);
        
        if (results.features.length > 0) {
          const feature = results.features[0];
          
          // Create a highlight graphic with a distinct symbol
          const highlightSymbol = new SimpleMarkerSymbol({
            size: 16,
            color: [0, 150, 255, 0.8], // Bright blue
            outline: {
              width: 3,
              color: [255, 255, 255, 1] // White outline
            }
          });
          
          const graphic = new Graphic({
            geometry: feature.geometry,
            symbol: highlightSymbol
          });
          
          // Add the highlight graphic to the map
          if (mapViewRef.current.graphics) {
            mapViewRef.current.graphics.add(graphic);
            highlightGraphicRef.current = graphic;
          }
          
          // Zoom to the selected count site and then show popup
          await mapViewRef.current.goTo({
            target: feature.geometry,
            zoom: 15
          });
          
          // Add a small delay to ensure zoom completes, then show popup
          setTimeout(() => {
            if (mapViewRef.current) {
              mapViewRef.current.popup.open({
                features: [feature],
                location: feature.geometry
              });
            }
          }, 300);
        }
      } catch (error) {
        console.error("Error highlighting count site:", error);
      }
    };

    highlightCountSite();
  }, [viewReady, aadtLayer, selectedCountSite]);

  // Handle multiple bin sites highlighting
  useEffect(() => {
    // Clear any existing bin highlights
    if (highlightedBinGraphicsRef.current.length > 0 && mapViewRef.current?.graphics) {
      highlightedBinGraphicsRef.current.forEach(graphic => {
        mapViewRef.current.graphics.remove(graphic);
      });
      highlightedBinGraphicsRef.current = [];
    }

    // If no sites to highlight or prerequisites not met, stop here
    if (!viewReady || !mapViewRef.current || !aadtLayer || !highlightedBinSites || highlightedBinSites.length === 0) {
      return;
    }

    const highlightBinSites = async () => {
      try {
        // Query the AADT layer for all highlighted sites
        const siteNames = highlightedBinSites.map(name => `'${name}'`).join(',');
        const query = aadtLayer.createQuery();
        query.where = `name IN (${siteNames})`;
        query.outFields = ["*"];
        query.returnGeometry = true;

        const results = await aadtLayer.queryFeatures(query);
        
        if (results.features.length > 0) {
          console.log(`🗺️ Highlighting ${results.features.length} shared sites on map:`, results.features.map(f => f.attributes.name));
          
          // Create highlight graphics for each site
          const newGraphics: Graphic[] = [];
          
          results.features.forEach(feature => {
            const graphic = new Graphic({
              geometry: feature.geometry,
              symbol: new SimpleMarkerSymbol({
                style: "circle",
                color: [34, 197, 94, 0.8], // Green color for shared sites
                size: "16px",
                outline: {
                  color: [22, 163, 74, 1], // Darker green outline
                  width: 2
                }
              })
            });
            
            newGraphics.push(graphic);
            if (mapViewRef.current?.graphics) {
              mapViewRef.current.graphics.add(graphic);
            }
          });
          
          // Store references for cleanup
          highlightedBinGraphicsRef.current = newGraphics;
        } else {
          console.log('🗺️ No sites found to highlight for:', highlightedBinSites);
        }
      } catch (error) {
        console.error('Error highlighting bin sites:', error);
      }
    };

    highlightBinSites();
  }, [viewReady, aadtLayer, highlightedBinSites]); // Removed highlightGraphic from dependencies to prevent infinite loop

  return (
    <div id="volume-map-container" className="flex-1 bg-gray-200 relative">
      <MuiBox
        component="main"
        sx={{
          position: "relative",
          height: "100%",
          width: "100%",
          background: "#fff",
        }}
      >
        <ArcgisMap
          basemap="topo-vector"
          onArcgisViewReadyChange={handleArcgisViewReadyChange}
        />
      </MuiBox>
      
      {/* Map Legend - Hidden for Raw Data View */}
      {activeTab !== 'raw-data' && (
        <div id="volume-map-legend" className="absolute bottom-5 right-5 bg-white p-3 rounded border border-gray-300 shadow-sm min-w-[200px]">
          <h4 id="legend-title" className="text-sm font-medium text-gray-700 mb-2">
            {modelCountsBy === "cost-benefit" ? "Cost Benefit Tool Legend" : "Volume Legend"}
          </h4>
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
            {shouldShowLineSegments(currentZoomLevel) ? (
              <>
                {isLineLayerLoading ? (
                  <>
                    <LoadingSpinner size="small" message="" />
                    <span>Loading Line Segments (Zoom {currentZoomLevel.toFixed(1)})</span>
                  </>
                ) : (
                  <span>⚡ Line Segments (Zoom {currentZoomLevel.toFixed(1)})</span>
                )}
              </>
            ) : (
              <span>📊 Hexagon Areas (Zoom {currentZoomLevel.toFixed(1)})</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div id="legend-low" className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: VOLUME_LEVEL_CONFIG.low.color }}
              ></div>
              <span className="text-xs text-gray-600">Low (&lt;50)</span>
            </div>
            <div id="legend-medium" className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: VOLUME_LEVEL_CONFIG.medium.color }}
              ></div>
              <span className="text-xs text-gray-600">Medium (50-200)</span>
            </div>
            <div id="legend-high" className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: VOLUME_LEVEL_CONFIG.high.color }}
              ></div>
              <span className="text-xs text-gray-600">High (≥200)</span>
            </div>
          </div>
          {shouldShowLineSegments(currentZoomLevel) && (
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
              Zoom out to level {ZOOM_THRESHOLD_FOR_LINE_SEGMENTS - 1} to see hexagon view
            </div>
          )}
        </div>
      )}
    </div>
  );
}

