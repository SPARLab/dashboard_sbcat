"use client";

import React, { useRef, useState, useEffect } from "react";
import "@esri/calcite-components";
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import "@arcgis/map-components/dist/components/arcgis-time-slider";
import "@arcgis/map-components/dist/components/arcgis-print";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import LayerList from "@arcgis/core/widgets/LayerList";
import TimeInterval from "@arcgis/core/time/TimeInterval";
import Legend from "@arcgis/core/widgets/Legend";
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import Print from "@arcgis/core/widgets/Print";

import { ArcgisMap } from "@arcgis/map-components-react";
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";

import { setAssetPath as setCalciteComponentsAssetPath } from "@esri/calcite-components/dist/components";
setCalciteComponentsAssetPath(
  "https://js.arcgis.com/calcite-components/2.13.2/assets"
);

import { createHeatmaps } from "@/app/lib/safety-app/handleSafety";

import SafetyMenu from "./SafetyMenu";
import SafetyFilterPanel from "./SafetyFilterPanel";
import Grid from "@mui/material/Grid";

export default function SafetyMap() {
  const [showWidgetPanel, setShowWidgetPanel] = useState<Boolean>(false);
  const [showLegend, setShowLegend] = useState<Boolean>(false);
  const [showLayerList, setShowLayerList] = useState<Boolean>(false);
  const [showPrint, setShowPrint] = useState<Boolean>(false);
  const [showFilter, setShowFilter] = useState<Boolean>(false);
  const [mapElRef, setMapElRef] = useState(null);
  const [mapRef, setMapRef] = useState<Map | null>(null);
  const [viewRef, setViewRef] = useState<MapView | null>(null);
  const [heatmapLayer, setHeatmapLayer] = useState<FeatureLayer | null>(null);
  const [timeSlider, setTimeSlider] = useState<TimeSlider | null>(null);

  const menuProps = {
    showWidgetPanel,
    setShowWidgetPanel,
    showLegend,
    setShowLegend,
    showLayerList,
    setShowLayerList,
    showFilter,
    setShowFilter,
    showPrint,
    setShowPrint,
  };

  const filterProps = {
    timeSlider,
    viewRef,
    heatmapLayer,
  };

  // once map is generated, load feature layers and add to the map
  useEffect(() => {
    if (mapRef !== null) {
      const createLayers = async () => {
        // const safetyLayer = await createSafetyLayers()
        const safetyHeatmapLayer = await createHeatmaps();
        mapRef.add(safetyHeatmapLayer);

        setHeatmapLayer(safetyHeatmapLayer);
        // setCensusGroupLayer(censusGroupLayer)
        // setCountGroupLayer(countGroupLayer)
        // setIncidentGroupLayer(incidentGroupLayer)
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

      if (heatmapLayer !== null) {
        // const layerList = new LayerList({
        //     view: viewRef,
        //     container: 'layer-list-container',
        //     listItemCreatedFunction: addHeatmapVisOptions
        // })

        const legend = new Legend({
          view: viewRef,
          container: "legend-container",
        });

        const print = new Print({
          view: viewRef,
          container: "safety-print-container",

          printServiceUrl:
            "https://spatialcenter.grit.ucsb.edu/server/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
        });

        // time filter

        const timeSlider = new TimeSlider({
          container: "safety-time-slider-container",
          mode: "time-window",
          timeZone: "system",
          stops: {
            interval: new TimeInterval({
              value: 1,
              unit: "years",
            }),
          },
        });
        if (heatmapLayer.timeInfo?.fullTimeExtent) {
          const { start, end } = heatmapLayer.timeInfo.fullTimeExtent;

          timeSlider.fullTimeExtent = {
            start: start,
            end: end,
          };
          timeSlider.timeExtent = {
            start: start,
            end: end,
          };
        }
        setTimeSlider(timeSlider);

        setShowLegend(true);
        setShowLayerList(true);
        setShowFilter(true);
      }
    }
  }, [viewRef, heatmapLayer]);

  const assignMap = (event: any) => {
    setMapElRef(event.target);
    setMapRef(event.target.map);
    setViewRef(event.target.view);
  };

  return (
    <Box
      id="app-container"
      sx={{ display: "flex", height: "calc(100vh - 70px)" }}
    >
      <CssBaseline />
      {/* <Header open={open} handleDrawerOpen={handleDrawerOpen} /> */}
      <Box sx={{ height: "100%" }}>
        <SafetyMenu {...menuProps} />
      </Box>

      {/* Widget Panel */}

      <Box
        sx={{
          display:
            showLegend || showLayerList || showFilter || showPrint
              ? "flex"
              : "none", // Always render, visibility controlled via `display`
          flexDirection: "column", // Stack vertically first
          flexWrap: "wrap", // Wrap into another column when needed
          alignItems: "stretch", // Aligns properly to the left
          // maxHeight: "100vh", // Prevents overflow
          // maxWidth: "80vw", // Shrinks to only needed width
          padding: 1,
          flexShrink: 3,
          maxHeight: "calc(100vh - 70px)", // Prevents it from growing indefinitely
          maxWidth: "none",
        }}
      >
        {/* Layer List */}
        {/* <Grid justifyContent="center" className="esri-widget" sx={{display: showLayerList ? 'block': 'none'}}>
                    <Grid size={12} my={2}>
                        <Typography align='center' variant='h5'>Layers</Typography>
                    </Grid>
                    <div id="layer-list-container"></div>
                </Grid>   */}

        {/* Filter Panel */}
        <Grid
          justifyContent="center"
          className="esri-widget"
          sx={{ display: showFilter ? "block" : "none" }}
        >
          <Grid size={12} my={2}>
            <Typography align="center" variant="h5">
              Filters
            </Typography>
          </Grid>
          <SafetyFilterPanel {...filterProps} />
        </Grid>

        {/* Legend Panel */}
        <Grid
          justifyContent="center"
          className="esri-widget"
          sx={{ display: showLegend ? "block" : "none" }}
        >
          <Grid size={12} my={2}>
            <Typography align="center" variant="h5">
              Legend
            </Typography>
          </Grid>
          <div id="legend-container"></div>
        </Grid>

        {/* Print Panel */}
        <Grid
          justifyContent="center"
          className="esri-widget"
          sx={{ display: showPrint ? "block" : "none" }}
        >
          <Grid size={12} my={2}>
            <Typography align="center" variant="h5">
              Print Map
            </Typography>
          </Grid>
          <div id="safety-print-container"></div>
        </Grid>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, flexShrink: 1 }}>
        <ArcgisMap
          basemap="topo-vector"
          // itemId="d5dda743788a4b0688fe48f43ae7beb9"
          onArcgisViewReadyChange={assignMap}
        ></ArcgisMap>
      </Box>
    </Box>
  );
}
