"use client";

import React, { useEffect, useState } from "react";

// import global state variables
import { useMapContext } from "@/lib/context/MapContext";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import { Grid } from "@mui/material";
import { Box, Typography, Card, CardContent } from "@mui/material";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import TimeExtent from "@arcgis/core/time/TimeExtent";

function getDateForTimeZone(queryDate: any, timezone: any) {
  // adjust the given date field to the timezone of the date field
  const zonedDate = new Date(
    queryDate.toLocaleString("en-US", {
      timeZone: timezone,
    })
  );
  const pad = (value: any) => String(value).padStart(2, "0");
  const month = pad(zonedDate.getMonth() + 1);
  const day = pad(zonedDate.getDate());
  const year = zonedDate.getFullYear();
  const hour = pad(zonedDate.getHours());
  const minutes = pad(zonedDate.getMinutes());
  const seconds = pad(zonedDate.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`;
}

type PedCountStats = {
  filtered_ped: number | null;
  total_ped: number | null;
};

type CountStats = {
  filtered: number | null;
  total: number | null;
};

type StatsSetter = React.Dispatch<React.SetStateAction<any>>;

function setupCountLayerWatch({
  view,
  map,
  layer,
  reactiveUtils,
  setStats,
  statsKey,
  existingStats,
  startField,
  endField,
}: {
  view: MapView;
  map: Map;
  layer: FeatureLayer;
  reactiveUtils: typeof import("@arcgis/core/core/reactiveUtils");
  setStats: StatsSetter;
  statsKey: string;
  existingStats: any;
  startField: string;
  endField: string;
}) {
  view.whenLayerView(layer).then((layerView) => {
    reactiveUtils.watch(
      () => [layerView.updating, view.stationary],
      ([isUpdating, isStationary]) => {
        // if the layer isn't visible, turn it off
        // const countSiteGroup = map.allLayers.find((layer): layer is GroupLayer => layer.title === "Count Sites" && layer.type === "group") as GroupLayer
        // const allLayer = countSiteGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "All Sites") as FeatureLayer

        // if (!layer.visible && !allLayer.visible) {
        //     setStats({
        //       ...existingStats,
        //       [statsKey]: 0,
        //     });
        //     return
        // }
        if (!isUpdating || isStationary) {
          let where = "1=1";
          let timeWhere = "";
          // get time extent

          let fieldTimeZone = layer.fieldsIndex.getTimeZone(startField);
          if (!fieldTimeZone) {
            fieldTimeZone = "UTC";
          }
          const timeExtent = (layerView as any).timeExtent as TimeExtent;
          if (timeExtent) {
            const start = getDateForTimeZone(timeExtent.start, fieldTimeZone);
            const end = getDateForTimeZone(timeExtent.end, fieldTimeZone);

            if (start && end) {
              timeWhere = `${startField} > DATE '${start}' AND ${endField} < DATE '${end}'`;
            }
          }

          let filtersWhere = "";
          if (layerView.filter?.where) {
            filtersWhere = layerView.filter.where;
          }
          const wheres = [timeWhere, filtersWhere].filter(
            (where) => where.length > 0
          );
          if (wheres.length > 1) {
            where = wheres.join(" AND ");
          } else if (wheres.length == 1) {
            where = wheres[0];
          }

          layerView
            .queryFeatures({
              geometry: view.extent,
              where,
              spatialRelationship: "intersects",
              returnGeometry: false,
              outFields: ["*"],
            })
            .then((result) => {
              setStats({
                ...existingStats,
                [statsKey]: result.features.length,
              });
            });
        }
      }
    );
  });
}

export default function StatsView() {
  const {
    mapRef,
    viewRef,
    countGroupLayer,
    incidentGroupLayer,
    countSiteChecks,
    safetyChecks,
  } = useMapContext();

  const [countSitesOn, setCountSitesOn] = useState(countSiteChecks["toggled"]);
  useEffect(() => {
    setCountSitesOn(countSiteChecks["toggled"]);
  }, [countSiteChecks]);
  // Get Volume statistics by filters and extent
  const [pedCountStats, setPedCountStats] = useState<CountStats>({
    filtered: null,
    total: null,
  });
  const [bikeCountStats, setBikeCountStats] = useState<CountStats>({
    filtered: null,
    total: null,
  });
  useEffect(() => {
    if (!viewRef || !countGroupLayer || !mapRef) return;
    const countSiteGroup = mapRef.allLayers.find(
      (layer): layer is GroupLayer =>
        layer.title === "Count Sites" && layer.type === "group"
    ) as GroupLayer;
    if (!countSiteGroup) {
      setPedCountStats({
        ...pedCountStats,
        filtered: null,
      });
      setBikeCountStats({
        ...bikeCountStats,
        filtered: null,
      });
      return;
    }

    const allLayer = countSiteGroup.allLayers.find(
      (layer): layer is FeatureLayer => layer.title === "All Sites"
    ) as FeatureLayer;

    viewRef.whenLayerView(allLayer).then((layerView) => {
      reactiveUtils.watch(
        () => [layerView.updating, viewRef.stationary],
        ([isUpdating, isStationary]) => {
          if (!isUpdating || isStationary) {
            let where = "1=1";
            let timeWhere = "";
            // get time extent

            let fieldTimeZone = allLayer.fieldsIndex.getTimeZone("firstSurvey");
            if (!fieldTimeZone) {
              fieldTimeZone = "UTC";
            }
            const timeExtent = (layerView as any).timeExtent as TimeExtent;
            if (timeExtent) {
              const start = getDateForTimeZone(timeExtent.start, fieldTimeZone);
              const end = getDateForTimeZone(timeExtent.end, fieldTimeZone);

              if (start && end) {
                timeWhere = `firstSurvey > DATE '${start}' AND lastSurvey < DATE '${end}'`;
              }
            }

            let filtersWhere = "";
            if (layerView.filter?.where) {
              filtersWhere = layerView.filter.where;
            }
            const wheres = [timeWhere, filtersWhere].filter(
              (where) => where.length > 0
            );
            if (wheres.length > 1) {
              where = wheres.join(" AND ");
            } else if (wheres.length == 1) {
              where = wheres[0];
            }
            console.log(where);

            // get bike sites
            const bikeWhere =
              where + " AND countTypes IN ('Biking', 'Biking & Walking')";
            layerView
              .queryFeatures({
                geometry: viewRef.extent,
                where: bikeWhere,
                spatialRelationship: "intersects",
                returnGeometry: false,
                outFields: ["*"],
              })
              .then((result) => {
                console.log(result);
                setBikeCountStats({
                  ...bikeCountStats,
                  filtered: result.features.length,
                });
              });

            // get walk sites
            const walkWhere =
              where + " AND countTypes IN ('Walking', 'Biking & Walking')";
            layerView
              .queryFeatures({
                geometry: viewRef.extent,
                where: walkWhere,
                spatialRelationship: "intersects",
                returnGeometry: false,
                outFields: ["*"],
              })
              .then((result) => {
                console.log(result);
                setPedCountStats({
                  ...pedCountStats,
                  filtered: result.features.length,
                });
              });
          }
        }
      );
    });

    // const pedLayer = countSiteGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Walking Sites") as FeatureLayer
    // setupCountLayerWatch({
    //     view: viewRef,
    //     map: mapRef,
    //     layer: pedLayer,
    //     reactiveUtils,
    //     setStats: setPedCountStats,
    //     statsKey: "filtered",
    //     existingStats: pedCountStats,
    //     startField: "start_date",
    //     endField: "end_date"
    //     });

    // const bikeLayer = countSiteGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Biking Sites") as FeatureLayer

    // setupCountLayerWatch({
    //     view: viewRef,
    //     map: mapRef,
    //     layer: bikeLayer,
    //     reactiveUtils,
    //     setStats: setBikeCountStats,
    //     statsKey: "filtered",
    //     existingStats: bikeCountStats,
    //     startField: "start_date",
    //     endField: "end_date"
    //     });
  }, [viewRef, countGroupLayer, mapRef, countSitesOn]);

  const [safetyLayersOn, setSafetyLayersOn] = useState(safetyChecks["toggled"]);
  useEffect(() => {
    setSafetyLayersOn(safetyChecks["toggled"]);
  }, [safetyChecks]);

  // Get Safety statistics by filters and extent
  const [pedSafetyStats, setPedSafetyStats] = useState<CountStats>({
    filtered: null,
    total: null,
  });

  const [bikeSafetyStats, setBikeSafetyStats] = useState<CountStats>({
    filtered: null,
    total: null,
  });

  useEffect(() => {
    if (!viewRef || !incidentGroupLayer || !mapRef) return;
    const safetyGroup = mapRef.allLayers.find(
      (layer): layer is GroupLayer =>
        layer.title === "Safety" && layer.type === "group"
    ) as GroupLayer;

    if (!safetyGroup) {
      setPedSafetyStats({
        ...pedSafetyStats,
        filtered: null,
      });
      setBikeSafetyStats({
        ...bikeSafetyStats,
        filtered: null,
      });
      return;
    }

    const allIncidentsLayer = safetyGroup.allLayers.find(
      (layer): layer is FeatureLayer => layer.title === "All Incidents"
    ) as FeatureLayer;

    viewRef.whenLayerView(allIncidentsLayer).then((layerView) => {
      reactiveUtils.watch(
        () => [layerView.updating, viewRef.stationary],
        ([isUpdating, isStationary]) => {
          if (!isUpdating || isStationary) {
            console.log(layerView);
            console.log(layerView.layer.fields.map((f) => f.name));

            let where = "1=1";
            let timeWhere = "";
            // get time extent

            let fieldTimeZone =
              allIncidentsLayer.fieldsIndex.getTimeZone("timestamp");
            if (!fieldTimeZone) {
              fieldTimeZone = "UTC";
            }

            const timeExtent = (layerView as any).timeExtent as TimeExtent;
            if (timeExtent) {
              const start = getDateForTimeZone(timeExtent.start, fieldTimeZone);
              const end = getDateForTimeZone(timeExtent.end, fieldTimeZone);

              if (start && end) {
                timeWhere = `timestamp > DATE '${start}' AND timestamp < DATE '${end}'`;
              }
            }

            let filtersWhere = "";
            if (layerView.filter?.where) {
              filtersWhere = layerView.filter.where;
            }
            const wheres = [timeWhere, filtersWhere].filter(
              (where) => where.length > 0
            );
            if (wheres.length > 1) {
              where = wheres.join(" AND ");
            } else if (wheres.length == 1) {
              where = wheres[0];
            }

            // get bike incidents
            const bikeWhere = where + " AND bicyclist=1";
            // console.log(bikeWhere)
            layerView
              .queryFeatures({
                geometry: viewRef.extent,
                where: bikeWhere,
                spatialRelationship: "intersects",
                returnGeometry: false,
                outFields: ["*"],
              })
              .then((result) => {
                console.log(result.features);
                setBikeSafetyStats({
                  ...bikeSafetyStats,
                  filtered: result.features.length,
                });
              });

            // get walk incidents
            const walkWhere = where + " AND pedestrian = 1";
            layerView
              .queryFeatures({
                geometry: viewRef.extent,
                where: walkWhere,
                spatialRelationship: "intersects",
                returnGeometry: false,
                outFields: ["*"],
              })
              .then((result) => {
                console.log(result);
                setPedSafetyStats({
                  ...pedSafetyStats,
                  filtered: result.features.length,
                });
              });
          }
        }
      );
    });

    //     const pedLayer = safetyGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Walking Incidents") as FeatureLayer
    //     if (pedLayer.visible) {
    //         setupCountLayerWatch({
    //             view: viewRef,
    //             layer: pedLayer,
    //             reactiveUtils,
    //             setStats: setPedSafetyStats,
    //             statsKey: "filtered",
    //             existingStats: pedSafetyStats,
    //             startField: "timestamp",
    //             endField: "timestamp"
    //           });

    //     } else {
    //         setPedSafetyStats({
    //             ...pedSafetyStats,
    //             "filtered": null
    //         })
    //     }

    //     const bikeLayer = safetyGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Biking Incidents") as FeatureLayer
    //     if (bikeLayer.visible) {

    //         setupCountLayerWatch({
    //             view: viewRef,
    //             layer: bikeLayer,
    //             reactiveUtils,
    //             setStats: setBikeSafetyStats,
    //             statsKey: "filtered",
    //             existingStats: bikeSafetyStats,
    //             startField: "timestamp",
    //             endField: "timestamp"
    //           });

    //     } else {
    //         setBikeSafetyStats({
    //             ...bikeSafetyStats,
    //             "filtered": null,

    //         })
    //     }
  }, [viewRef, incidentGroupLayer, mapRef, safetyLayersOn]);

  // Get all data stats to display
  useEffect(() => {
    if (!countGroupLayer) return;

    const bikeSitesLayer = countGroupLayer.allLayers.find(
      (layer): layer is FeatureLayer => layer.title === "Biking Sites"
    ) as FeatureLayer;
    if (!bikeSitesLayer) return;
    const bikeQuery = bikeSitesLayer.createQuery();
    bikeQuery.where = "1=1";
    bikeSitesLayer.queryFeatures(bikeQuery).then((result) => {
      if (result) {
        setBikeCountStats({
          ...bikeCountStats,
          total: result.features.length,
        });
      }
    });

    const pedSitesLayer = countGroupLayer.allLayers.find(
      (layer): layer is FeatureLayer => layer.title === "Walking Sites"
    ) as FeatureLayer;
    if (!pedSitesLayer) return;
    const pedQuery = pedSitesLayer.createQuery();
    pedQuery.where = "1=1";
    pedSitesLayer.queryFeatures(pedQuery).then((result) => {
      if (result) {
        setPedCountStats({
          ...pedCountStats,
          total: result.features.length,
        });
      }
    });
  }, [countGroupLayer]);

  // Get all data stats to display
  useEffect(() => {
    if (!incidentGroupLayer) return;

    const bikeSafetyLayer = incidentGroupLayer.allLayers.find(
      (layer): layer is FeatureLayer => layer.title === "Biking Incidents"
    ) as FeatureLayer;
    if (!bikeSafetyLayer) return;
    const bikeQuery = bikeSafetyLayer.createQuery();
    bikeQuery.where = "1=1";
    bikeSafetyLayer.queryFeatures(bikeQuery).then((result) => {
      if (result) {
        setBikeSafetyStats({
          ...bikeSafetyStats,
          total: result.features.length,
        });
      }
    });

    const pedSafetyLayer = incidentGroupLayer.allLayers.find(
      (layer): layer is FeatureLayer => layer.title === "Walking Incidents"
    ) as FeatureLayer;
    if (!pedSafetyLayer) return;
    const pedQuery = pedSafetyLayer.createQuery();
    pedQuery.where = "1=1";
    pedSafetyLayer.queryFeatures(pedQuery).then((result) => {
      if (result) {
        setPedSafetyStats({
          ...pedSafetyStats,
          total: result.features.length,
        });
      }
    });
  }, [incidentGroupLayer]);

  return (
    <Card
      sx={{
        my: 3,
        width: "100%",
        borderRadius: 2,
        boxShadow: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
          Summary Stats
        </Typography>

        {/* Check if any filtered data exists */}
        {pedCountStats.filtered !== null ||
        bikeCountStats.filtered !== null ||
        pedSafetyStats.filtered !== null ||
        bikeSafetyStats.filtered !== null ? (
          <Grid container spacing={3}>
            {/* Walking Group */}
            {(pedCountStats.filtered !== null ||
              pedSafetyStats.filtered !== null) && (
              <Grid size={6}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  👟 Walking
                </Typography>

                {pedCountStats.filtered !== null && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Count Sites
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">
                        {pedCountStats.filtered}
                      </Typography>
                      <Typography variant="body2">in view</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6">
                        {pedCountStats.total}
                      </Typography>
                      <Typography variant="body2">total</Typography>
                    </Box>
                  </>
                )}

                {pedSafetyStats.filtered !== null && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Incidents
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">
                        {pedSafetyStats.filtered}
                      </Typography>
                      <Typography variant="body2">in view</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">
                        {pedSafetyStats.total}
                      </Typography>
                      <Typography variant="body2">total</Typography>
                    </Box>
                  </>
                )}
              </Grid>
            )}

            {/* Biking Group */}
            {(bikeCountStats.filtered !== null ||
              bikeSafetyStats.filtered !== null) && (
              <Grid size={6}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  🚲 Biking
                </Typography>

                {bikeCountStats.filtered !== null && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Count Sites
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">
                        {bikeCountStats.filtered}
                      </Typography>
                      <Typography variant="body2">in view</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6">
                        {bikeCountStats.total}
                      </Typography>
                      <Typography variant="body2">total</Typography>
                    </Box>
                  </>
                )}

                {bikeSafetyStats.filtered !== null && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Incidents
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">
                        {bikeSafetyStats.filtered}
                      </Typography>
                      <Typography variant="body2">in view</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        columnGap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">
                        {bikeSafetyStats.total}
                      </Typography>
                      <Typography variant="body2">total</Typography>
                    </Box>
                  </>
                )}
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Add data to the map to see summary stats.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
