import { Box as MuiBox } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { ArcgisMap } from "@arcgis/map-components-react";
// ArcGIS imports for TimeSlider
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import TimeInterval from "@arcgis/core/time/TimeInterval";
import VolumeLeftSidebar from "./VolumeLeftSidebar";
import VolumeRightSidebar from "./VolumeRightSidebar";
import VolumeLayerControls from "./VolumeLayerControls";
import { createAADTLayer, createHexagonLayer } from "../../lib/volume-app/volumeLayers";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";

const Volume = () => {
  const [leftMenuOpen, setLeftMenuOpen] = useState(true);
  const leftMenuWidth = 408;

  const [rightMenuOpen, setRightMenuOpen] = useState(true);
  const rightMenuWidth = 300;

  const mapViewRef = useRef<any>(null);
  const [timeSliderLoaded, setTimeSliderLoaded] = useState(false);
  const [viewReady, setViewReady] = useState(false);

  const [showBicyclist, setShowBicyclist] = useState(true);
  const [showPedestrian, setShowPedestrian] = useState(false);

  // Add state for model counts selection
  const [modelCountsBy, setModelCountsBy] = useState<string>("dillon"); // "strava", "dillon", "aadt"

  // Add state for layers
  const [aadtLayer, setAadtLayer] = useState<FeatureLayer | null>(null);
  const [hexagonLayer, setHexagonLayer] = useState<GroupLayer | null>(null);

  // Handler to set map center/zoom when view is ready
  const handleArcgisViewReadyChange = (event: any) => {
    if (event?.target?.view) {
      event.target.view.goTo({
        center: [-120, 34.7],
        zoom: 9,
      });
      mapViewRef.current = event.target.view;
      setViewReady(true);
    }
  };

  // Load layers when map view is ready
  useEffect(() => {
    if (viewReady && mapViewRef.current) {
      const loadLayers = async () => {
        try {
          const aadt = await createAADTLayer();
          const hexagon = createHexagonLayer();
          
          // Add layers to map
          mapViewRef.current.map.add(aadt);
          mapViewRef.current.map.add(hexagon);
          
          // Store layer references
          setAadtLayer(aadt);
          setHexagonLayer(hexagon);
          
          // Debug: Log detailed layer information
          console.log("=== LAYER DEBUG INFO ===");
          console.log("AADT Layer:", aadt);
          console.log("Hexagon Group Layer:", hexagon);
          console.log("Hexagon sub-layers:", hexagon.layers);
          
          // Try to inspect VectorTileLayer properties
          hexagon.layers.forEach((layer, index) => {
            console.log(`Sub-layer ${index}:`, {
              title: layer.title,
              type: layer.type,
              url: (layer as any).url,
              style: (layer as any).style,
              source: (layer as any).source,
            });
          });
          
          // Debug: Inspect AADT Feature Layer
          console.log("=== AADT FEATURE LAYER DEBUG ===");
          console.log("AADT Layer fields:", aadt.fields);
          console.log("AADT Layer objectIdField:", aadt.objectIdField);
          console.log("AADT Layer outFields:", aadt.outFields);
          
          // Query a few features to see the data
          try {
            const queryResult = await aadt.queryFeatures({
              where: "1=1",
              outFields: ["*"],
              returnGeometry: false,
              num: 5
            });
            console.log("AADT Sample Features:", queryResult.features.map(f => f.attributes));
          } catch (error) {
            console.error("Error querying AADT layer:", error);
          }
          
        } catch (error) {
          console.error("Error loading layers:", error);
        }
      };
      
      loadLayers();
    }
  }, [viewReady]);

  // Instantiate placeholder TimeSlider when map view is ready
  useEffect(() => {
    if (viewReady && mapViewRef.current && document.getElementById("volume-time-slider-container")) {
      if (document.getElementById("volume-time-slider-container")?.children.length === 0) {
        new TimeSlider({
          container: "volume-time-slider-container",
          view: mapViewRef.current,
          mode: "time-window",
          timeZone: "system",
          stops: {
            interval: new TimeInterval({ value: 1, unit: "years" })
          },
          fullTimeExtent: {
            start: new Date(2012, 1, 1),
            end: new Date(2025, 5, 25),
          },
          timeExtent: {
            start: new Date(2012, 1, 1),
            end: new Date(2025, 5, 25),
          },
        });
        setTimeSliderLoaded(true);
      }
    }
  }, [viewReady]);

  return (
    <MuiBox id="app-container" sx={{ position: "relative", height: "100%" }}>
      <VolumeLayerControls
        aadtLayer={aadtLayer}
        hexagonLayer={hexagonLayer}
        showBicyclist={showBicyclist}
        showPedestrian={showPedestrian}
        modelCountsBy={modelCountsBy}
      />
      <VolumeLeftSidebar
        leftMenuOpen={leftMenuOpen}
        leftMenuWidth={leftMenuWidth}
        showBicyclist={showBicyclist}
        setShowBicyclist={setShowBicyclist}
        showPedestrian={showPedestrian}
        setShowPedestrian={setShowPedestrian}
        timeSliderLoaded={timeSliderLoaded}
        modelCountsBy={modelCountsBy}
        setModelCountsBy={setModelCountsBy}
      />
      {/* Main Content */}
      <MuiBox
        component="main"
        sx={{
          position: "block",
          zIndex: 1100,
          height: "100%",
          width: `calc(100vw - ${leftMenuOpen ? leftMenuWidth : 0}px - ${rightMenuOpen ? rightMenuWidth : 0}px )`,
          transition: "width 0.5s ease-in-out, margin 0.5s ease-in-out",
          marginRight: rightMenuOpen ? `${rightMenuWidth}px` : "0px",
          marginLeft: leftMenuOpen ? `${leftMenuWidth}px` : "0px",
          background: "#fff",
        }}
      >
        <ArcgisMap
          basemap="topo-vector"
          onArcgisViewReadyChange={handleArcgisViewReadyChange}
        />
      </MuiBox>
      <VolumeRightSidebar
        rightMenuOpen={rightMenuOpen}
        rightMenuWidth={rightMenuWidth}
      />
    </MuiBox>
  );
}

export default Volume; 