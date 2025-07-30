import React, { useState, useEffect, useRef } from "react";
import { Box as MuiBox } from "@mui/material";
import { ArcgisMap } from "@arcgis/map-components-react";
import { createAADTLayer, createHexagonLayer } from "../../../../lib/volume-app/volumeLayers";
import { queryHourlyCounts, HourlyData } from "../../../../lib/volume-app/hourlyStats";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import { GeographicBoundariesService } from "../../../../lib/data-services/GeographicBoundariesService";

interface NewVolumeMapProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
  onMapViewReady?: (mapView: __esri.MapView) => void;
}

export default function NewVolumeMap({ 
  activeTab, 
  showBicyclist, 
  showPedestrian, 
  modelCountsBy,
  onMapViewReady
}: NewVolumeMapProps) {
  const mapViewRef = useRef<any>(null);
  const [viewReady, setViewReady] = useState(false);

  // Layer state
  const [aadtLayer, setAadtLayer] = useState<FeatureLayer | null>(null);
  const [hexagonLayer, setHexagonLayer] = useState<GroupLayer | null>(null);
  
  // Boundary service state
  const [boundaryService] = useState(() => new GeographicBoundariesService());

  // Hourly data for Cost Benefit Tool (AADT)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);

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
          
          // Switch to city level to enable interactive boundaries
          try {
            const result = await boundaryService.switchGeographicLevel('city', mapViewRef.current);
            if (result.success) {

            } else {
              console.warn('⚠️ City boundaries warning:', result.warning);
            }
          } catch (boundaryError) {
            console.warn('City boundaries loaded without default selection:', boundaryError.message);
          }
          
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
    const watcher = mapViewRef.current.watch("extent", debouncedHandler);

    return () => {
      clearTimeout(timeoutId);
      if (watcher) {
        watcher.remove(); // Clean up watcher
      }
    };
  }, [viewReady, activeTab, showBicyclist, showPedestrian]);

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