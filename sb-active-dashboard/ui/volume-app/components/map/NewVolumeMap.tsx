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
import { createAADTLayer, createHexagonLayer } from "../../../../lib/volume-app/volumeLayers";
import { VOLUME_LEVEL_CONFIG } from "../../../theme/volumeLevelColors";

import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";

interface NewVolumeMapProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
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
  const { selectedCountSite, setMapView: setStoreMapView } = useVolumeAppStore();
  const mapViewRef = useRef<any>(null);
  const [viewReady, setViewReady] = useState(false);

  // Layer state
  const [aadtLayer, setAadtLayer] = useState<FeatureLayer | null>(null);
  const [hexagonLayer, setHexagonLayer] = useState<GroupLayer | null>(null);
  
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
          const hexagon = createHexagonLayer(modelCountsBy, selectedYear);
          
          // Add volume layers to map
          mapViewRef.current.map.add(aadt);
          mapViewRef.current.map.add(hexagon);
          
          // Add modeled volume service layers for spatial querying (invisible but queryable)
          const modeledLayers = modeledVolumeService.getLayers();
          modeledLayers.forEach(layer => {
            mapViewRef.current.map.add(layer);
            console.log(`✅ Added modeled volume layer: ${layer.title}`);
          });
          
          // Add boundary layers to map
          const boundaryLayers = boundaryService.getBoundaryLayers();
          boundaryLayers.forEach(layer => mapViewRef.current.map.add(layer));
          
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

  // Update hexagon layer when model type or year changes
  useEffect(() => {
    if (viewReady && mapViewRef.current && hexagonLayer && activeTab === 'modeled-data') {
      // Remove existing hexagon layer
      mapViewRef.current.map.remove(hexagonLayer);
      
      // Create new hexagon layer with updated parameters  
      const newHexagonLayer = createHexagonLayer(modelCountsBy, selectedYear);
      mapViewRef.current.map.add(newHexagonLayer);
      
      // Update the layer reference
      setHexagonLayer(newHexagonLayer);
    }
  }, [modelCountsBy, selectedYear, activeTab, viewReady]); // Removed hexagonLayer from dependencies

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
      } else { // 'modeled-data' tab
        aadtLayer.visible = false;
        // Visibility of hexagon layer depends on the modeled data source
        hexagonLayer.visible = modelCountsBy === 'cost-benefit';
      }
    }
  }, [activeTab, modelCountsBy, aadtLayer, hexagonLayer]);

  // Control hexagon layer visibility based on road user switches
  useEffect(() => {
    if (hexagonLayer) {
      const bikeLayer = hexagonLayer.layers.find(layer => layer.title === "Modeled Biking Volumes");
      const pedLayer = hexagonLayer.layers.find(layer => layer.title === "Modeled Walking Volumes");
      
      if (bikeLayer) {
        bikeLayer.visible = showBicyclist;
      }
      if (pedLayer) {
        pedLayer.visible = showPedestrian;
      }
    }
  }, [hexagonLayer, showBicyclist, showPedestrian]);

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
  }, [viewReady, aadtLayer, selectedCountSite]); // Removed highlightGraphic from dependencies to prevent infinite loop

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
          <div className="flex items-center gap-4">
            <div id="legend-low" className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: VOLUME_LEVEL_CONFIG.low.color }}
              ></div>
              <span className="text-xs text-gray-600">Low</span>
            </div>
            <div id="legend-medium" className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: VOLUME_LEVEL_CONFIG.medium.color }}
              ></div>
              <span className="text-xs text-gray-600">Medium</span>
            </div>
            <div id="legend-high" className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: VOLUME_LEVEL_CONFIG.high.color }}
              ></div>
              <span className="text-xs text-gray-600">High</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
