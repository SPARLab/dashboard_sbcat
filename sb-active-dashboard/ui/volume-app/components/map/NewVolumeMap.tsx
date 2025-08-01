import React, { useState, useEffect, useRef } from "react";
import { Box as MuiBox } from "@mui/material";
import { ArcgisMap } from "@arcgis/map-components-react";
import { createAADTLayer, createHexagonLayer } from "../../../../lib/volume-app/volumeLayers";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import { queryHourlyCounts, HourlyData } from "../../../../lib/volume-app/hourlyStats";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import { GeographicBoundariesService } from "../../../../lib/data-services/GeographicBoundariesService";
import Polygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";

interface NewVolumeMapProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  geographicLevel: string;
  onSelectionChange?: (geometry: Polygon | null) => void;
  selectedCountSite?: string | null;
}

export default function NewVolumeMap({ 
  activeTab, 
  showBicyclist, 
  showPedestrian, 
  modelCountsBy,
  onMapViewReady,
  geographicLevel,
  onSelectionChange,
  selectedCountSite,
}: NewVolumeMapProps) {
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

  // Hourly data for Cost Benefit Tool (AADT)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  
  // Ref for highlighting selected count site (using ref to avoid dependency issues)
  const highlightGraphicRef = useRef<Graphic | null>(null);

  // Handler to set map center/zoom when view is ready
  const handleArcgisViewReadyChange = (event: any) => {
    if (event?.target?.view) {
      event.target.view.goTo({
        center: [-120, 34.7],
        zoom: 9,
      });
      mapViewRef.current = event.target.view;
      setViewReady(true);
      
      // Pass mapView back to parent component  
      if (onMapViewReady) {
        onMapViewReady(event.target.view);
      }
    }
  };

  // Load layers when map view is ready
  useEffect(() => {
    if (viewReady && mapViewRef.current) {
      const loadLayers = async () => {
        try {
          const aadt = await createAADTLayer();
          const hexagon = createHexagonLayer();
          
          // Add volume layers to map
          mapViewRef.current.map.add(aadt);
          mapViewRef.current.map.add(hexagon);
          
          // Add boundary layers to map
          const boundaryLayers = boundaryService.getBoundaryLayers();
          boundaryLayers.forEach(layer => mapViewRef.current.map.add(layer));
          
          // Store layer references
          setAadtLayer(aadt);
          setHexagonLayer(hexagon);
          
        } catch (error) {
          console.error("Error loading layers:", error);
        }
      };
      
      loadLayers();
    }
  }, [viewReady, boundaryService]);

  useEffect(() => {
    if (viewReady && boundaryService && geographicLevel && mapViewRef.current) {
      boundaryService.switchGeographicLevel(geographicLevel as any, mapViewRef.current);
    }
  }, [viewReady, boundaryService, geographicLevel]);

  // Update selection callback when it changes
  useEffect(() => {
    if (onSelectionChange) {
      boundaryService.setSelectionChangeCallback(onSelectionChange);
    }
  }, [boundaryService, onSelectionChange]);

  // Control layers based on tab and model counts selection
  useEffect(() => {
    if (aadtLayer && hexagonLayer) {
      if (activeTab === 'raw-data') {
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
    // Only query when the raw data tab is active and view is ready
    if (activeTab !== "raw-data" || !viewReady || !mapViewRef.current) {
      setHourlyData([]); // Clear data when not on raw tab
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
    if (!viewReady || !mapViewRef.current || !aadtLayer || !selectedCountSite) {
      // Clear any existing highlight and close popup
      if (highlightGraphicRef.current && mapViewRef.current?.graphics) {
        mapViewRef.current.graphics.remove(highlightGraphicRef.current);
        highlightGraphicRef.current = null;
      }
      if (mapViewRef.current?.popup) {
        mapViewRef.current.popup.visible = false;
      }
      return;
    }

    const highlightCountSite = async () => {
      try {
        // Remove any existing highlight graphic first
        if (highlightGraphicRef.current && mapViewRef.current.graphics) {
          mapViewRef.current.graphics.remove(highlightGraphicRef.current);
          highlightGraphicRef.current = null;
        }

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
      
      {/* Map Legend */}
      <div id="volume-map-legend" className="absolute bottom-5 right-5 bg-white p-3 rounded border border-gray-300 shadow-sm min-w-[200px]">
        <h4 id="legend-title" className="text-sm font-medium text-gray-700 mb-2">
          {modelCountsBy === "cost-benefit" ? "Cost Benefit Tool Legend" : "Volume Legend"}
        </h4>
        <div className="flex items-center gap-4">
          <div id="legend-low" className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
            <span className="text-xs text-gray-600">Low</span>
          </div>
          <div id="legend-medium" className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div id="legend-high" className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
