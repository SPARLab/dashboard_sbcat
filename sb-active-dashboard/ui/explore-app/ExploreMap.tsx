"use client";
import React, { useRef, useState, useEffect } from "react";

// import global state variables
import { useMapContext } from "@/lib/context/MapContext";

// import custom components
import ExploreMenu from "./ExploreMenu";
import ExploreDataDisplay from "./ExploreDataDisplay";

// import custom functions
import { createCensusGroupLayer } from "@/lib/explore-app/displayCensus";
import {
  createCountGroupLayer,
  createModeledVolumeLayer,
} from "@/lib/explore-app/displayCounts";
import { createIncidentGroupLayer } from "@/lib/explore-app/displayIncidents";
import { addVisualizationOptions } from "@/lib/utils";
import { changeIncidentRenderer } from "@/lib/explore-app/displayIncidents";

// import arcgis and calcite components
// import "@esri/calcite-components";
// import "@arcgis/map-components/dist/components/arcgis-map";
// import "@arcgis/map-components/dist/components/arcgis-legend";
// import "@arcgis/map-components/dist/components/arcgis-expand";
// import "@arcgis/map-components/dist/components/arcgis-layer-list";
// import "@arcgis/map-components/dist/components/arcgis-time-slider";
// import "@arcgis/map-components/dist/components/arcgis-print";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import Print from "@arcgis/core/widgets/Print";
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import TimeInterval from "@arcgis/core/time/TimeInterval";
import { ArcgisMap } from "@arcgis/map-components-react";

import GroupLayer from "@arcgis/core/layers/GroupLayer";

// import mui components
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";
import { Grid } from "@mui/material";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

// import { setAssetPath as setCalciteComponentsAssetPath } from '@esri/calcite-components/dist/components';
// setCalciteComponentsAssetPath("https://js.arcgis.com/calcite-components/2.13.2/assets");

export default function ExploreMap() {
  const {
    mapRef,
    setMapRef,
    viewRef,
    setViewRef,
    countGroupLayer,
    setCountGroupLayer,
    censusGroupLayer,
    setCensusGroupLayer,
    incidentGroupLayer,
    setIncidentGroupLayer,
    AADTHexagonLayer,
    setAADTHexagonLayer,
    setLayerList,
    setTimeSlider,
  } = useMapContext();

  const [showWidgetPanel, setShowWidgetPanel] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showLayerList, setShowLayerList] = useState<boolean>(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [showPrint, setShowPrint] = useState<boolean>(false);
  const [mapElRef, setMapElRef] = useState(null);

  const [hexagonTile, setHexagonTile] = useState<VectorTileLayer | null>(null);

  // once map is generated, load feature layers and add to the map
  useEffect(() => {
    if (mapRef !== null) {
      const createLayers = async () => {
        const censusGroupLayer = await createCensusGroupLayer();
        const countGroupLayer = await createCountGroupLayer();
        const incidentGroupLayer = await createIncidentGroupLayer();
        const modeledAADTHexagons = createModeledVolumeLayer();

        setCensusGroupLayer(censusGroupLayer);
        setCountGroupLayer(countGroupLayer);
        setIncidentGroupLayer(incidentGroupLayer);
        setAADTHexagonLayer(modeledAADTHexagons);
      };

      createLayers();
    }
  }, [mapRef]);

  // set map center and zoom once view has been set and add custom widgets
  useEffect(() => {
    if (viewRef !== null) {
      viewRef.goTo({
        center: [-120, 34.7],
        zoom: 9,
      });

      if (
        censusGroupLayer !== null &&
        countGroupLayer !== null &&
        incidentGroupLayer !== null
      ) {
        console.log(censusGroupLayer);
        const layerList = new LayerList({
          view: viewRef,
          container: "layer-list-container",
          // listItemCreatedFunction: addVisualizationOptions,
          visible: false,
          dragEnabled: true,
        });

        layerList.on("trigger-action", (event) => {
          console.log("pressed");
          const id = event.action.id;

          if (id === "change-incident-points") {
            changeIncidentRenderer(incidentGroupLayer, "simple");
          } else if (id === "change-incident-heatmap") {
            changeIncidentRenderer(incidentGroupLayer, "heatmap");
          } else if (id === "change-incident-clusters") {
            changeIncidentRenderer(incidentGroupLayer, "cluster");
          }
        });
        setLayerList(layerList);

        const legend = new Legend({
          view: viewRef,
          container: "legend-container",
        });

        // const print = new Print({
        //     view: viewRef,
        //     container: 'print-container',

        //     printServiceUrl:
        //        "https://spatialcenter.grit.ucsb.edu/server/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
        //   });

        const timeSlider = new TimeSlider({
          view: viewRef,
          container: "explore-time-slider-container",
          mode: "time-window",
          timeZone: "system",
          stops: {
            interval: new TimeInterval({
              value: 1,
              unit: "years",
            }),
          },
          fullTimeExtent: {
            start: new Date(2012, 1, 1),
            end: new Date(),
          },
          timeExtent: {
            start: new Date(2012, 1, 1),
            end: new Date(),
          },
        });
        setTimeSlider(timeSlider);

        setShowLegend(false);
        setShowLayerList(true);
        setShowPrint(false);
        setShowWidgetPanel(true);
      }
    }
  }, [viewRef, incidentGroupLayer, countGroupLayer, censusGroupLayer]);

  const assignMap = (event: any) => {
    setMapElRef(event.target);
    setMapRef(event.target.map);
    setViewRef(event.target.view);
  };

  // menu rendering
  const [leftMenuOpen, setLeftMenuOpen] = useState(true);
  const leftMenuWidth = 450;
  const handleLeftMenu = () => {
    setLeftMenuOpen((prev) => !prev);
  };

  const [rightMenuOpen, setRightMenuOpen] = useState(true);
  const rightMenuWidth = 450;
  const handleRightMenu = () => {
    setRightMenuOpen((prev) => !prev);
  };

  return (
    <Box
      id="app-container"
      sx={{ position: "relative", height: "calc(100vh - 70px)" }}
    >
      <CssBaseline />

      <ExploreMenu
        drawerOpen={leftMenuOpen}
        handleDrawer={handleLeftMenu}
        menuWidth={leftMenuWidth}
      />

      <Box
        component="main"
        sx={{
          position: "block",
          zIndex: 1100,
          height: "100%",
          width: `calc(100vw - ${leftMenuOpen ? leftMenuWidth : 0}px - ${rightMenuOpen ? rightMenuWidth : 0}px )`, //
          transition: "width 0.5s ease-in-out, margin 0.5s ease-in-out",
          marginRight: rightMenuOpen ? `${rightMenuWidth}px` : "0px",
          marginLeft: leftMenuOpen ? `${leftMenuWidth}px` : "0px",
        }}
      >
        <ArcgisMap
          basemap="topo-vector"
          // itemId="d5dda743788a4b0688fe48f43ae7beb9"
          onArcgisViewReadyChange={assignMap}
        ></ArcgisMap>
      </Box>

      <ExploreDataDisplay
        drawerOpen={rightMenuOpen}
        handleDrawer={handleRightMenu}
        drawerWidth={rightMenuWidth}
      />
    </Box>
  );
}
