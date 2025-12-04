"use client";

import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import * as bufferOperator from "@arcgis/core/geometry/operators/bufferOperator";
import * as projection from "@arcgis/core/geometry/projection";
import StatisticDefinition from "@arcgis/core/rest/support/StatisticDefinition";

import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import FeatureReductionCluster from "@arcgis/core/layers/support/FeatureReductionCluster";

const colors = [
  "rgba(115, 0, 115, 0)",
  "#820082",
  "#910091",
  "#a000a0",
  "#af00af",
  "#c300c3",
  "#d700d7",
  "#eb00eb",
  "#ff00ff",
  "#ff58a0",
  "#ff896b",
  "#ffb935",
  "#ffea00",
];

const heatmapRenderer = new HeatmapRenderer({
  colorStops: [
    { color: colors[0], ratio: 0 },
    { color: colors[1], ratio: 0.083 },
    { color: colors[2], ratio: 0.166 },
    { color: colors[3], ratio: 0.249 },
    { color: colors[4], ratio: 0.332 },
    { color: colors[5], ratio: 0.415 },
    { color: colors[6], ratio: 0.498 },
    { color: colors[7], ratio: 0.581 },
    { color: colors[8], ratio: 0.664 },
    { color: colors[9], ratio: 0.747 },
    { color: colors[10], ratio: 0.83 },
    { color: colors[11], ratio: 0.913 },
    { color: colors[12], ratio: 1 },
  ],
  radius: 15,
  maxDensity: 0.015,
  minDensity: 0.005,
  referenceScale: 35000,
  legendOptions: {
    title: "Incidents",
    minLabel: "Few crashes",
    maxLabel: "Frequent crashes",
  },
});

// async function createSafetyCensusGraphics(safetyPoints: __esri.FeatureLayer, censusBlocks: __esri.FeatureLayer, query: string, title: string) {

//     const incidentsQuery = safetyPoints.createQuery();

//     incidentsQuery.where = query
//     incidentsQuery.outFields = ["*"]

//     const queryResults = await safetyPoints.queryFeatures(incidentsQuery)
//     const incidentFeatures = queryResults.features
//     const graphics: Graphic[] = []
//     let graphic

//     incidentFeatures.forEach((incident) => {
//         // const timestamp = new Date(incident.attributes.timestamp)
//         // incident.attributes.timestamp = timestamp
//         graphic = new Graphic({
//             geometry: incident.geometry,
//             attributes: incident.attributes
//         })
//         graphics.push(graphic)
//     })

//     const layerFields = [
//         {
//             name: "OBJECTID",
//             type: "oid"
//         },
//         {
//             name: "data_source",
//             type: "string"
//         },
//         {
//             name: "age",
//             type: "double"
//         },
//         {
//             name: "gender",
//             type: "string"
//         },
//         {
//             name: "incident_type",
//             type: "string"
//         },
//         {
//             name: "pedestrian",
//             type: "string"
//         },
//         {
//             name: "bicyclist",
//             type: "string"
//         },
//         {
//             name: "timestamp",
//             type: "date"
//         }
//     ]

//     const layer = new FeatureLayer({
//         source: graphics,
//         title: title,
//         objectIdField: "OBJECTID",
//         fields: layerFields,
//         timeInfo: {
//             startField: "timestamp",
//             interval: {
//                 unit: "days",
//                 value: 1
//             }
//         },
//         // renderer: heatmapRenderer
//         renderer: pointRenderer,

//     })

//     return layer

// }

export function changeIncidentRenderer(
  groupLayer: __esri.GroupLayer,
  type: string
) {
  groupLayer.layers.forEach((layer: __esri.Layer) => {
    if (layer instanceof FeatureLayer) {
      if (type === "heatmap") {
        layer.featureReduction = null as unknown as FeatureReductionCluster;
        layer.renderer = heatmapRenderer;
        layer.opacity = 0.6;
        console.log(layer);
      }
      // } else if (type === "simple") {
      //     layer.featureReduction = null
      //     layer.renderer = pointRenderer
      //     layer.opacity = 0.8

      //     console.log(layer)

      // } else if (type === "cluster") {
      //     layer.renderer = clusterRenderer
      //     layer.featureReduction = clusterReduction
      // }
    }
  });
}

// export async function createSafetyLayers() {

//     // count number of pedestrian and bike incidents occuring within each Census tract
//     const censusPolygons = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer"})
//     const safetyPoints = new FeatureLayer({url: 'https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Saftey_Incidents/FeatureServer'})

//     // query census polygons then buffer by 10m
//     const censusQuery = censusPolygons.createQuery();
//     censusQuery.where = ""
//     censusQuery.outFields = ["id"]
//     censusQuery.returnGeometry = true

//     // spatial stats
//     const countStats = new StatisticDefinition({
//         onStatisticField: "objectid",
//         outStatisticFieldName: "incident_count",
//         statisticType: "count"
//     })

//     // function counts number of incidents within the polygon
//     const countIncidentsInCensusPolygons = async (polygon) => {
//         let query = safetyPoints.createQuery();
//         query.geometry = polygon.geometry;
//         query.spatialRelationship = "intersects";
//         query.returnGeometry = false;
//         query.outStatistics = [countStats];

//         const safetyCountResults = await safetyPoints.queryFeatures(query)

//         if (safetyCountResults.features.length > 0) {
//             let incidentCount = safetyCountResults.features[0].attributes.incident_count || 0
//             polygon.attributes.incident_count = incidentCount
//         } else {
//             polygon.attributes.incident_count = 0
//         }

//     }

//     const censusResults = await censusPolygons.queryFeatures(censusQuery)
//     const bufferedCensusResults = censusResults

//     // load projection module
//     await projection.load()
//     bufferedCensusResults.features.forEach(feature => {
//         const geometry = projection.project(feature.geometry, {wkid: 2229})
//         feature.geometry = bufferOperator.execute(geometry, 10)
//         countIncidentsInCensusPolygons(feature)
//     })

//     let graphics: Graphic[] = []

//     bufferedCensusResults.features.forEach(feature => {
//         const graphic = new Graphic({
//             geometry: feature.geometry,
//             attributes: feature.attributes
//         })
//         graphics.push(graphic)
//     })

//     const layerFields = [
//         new Field({
//             name: "OBJECTID",
//             type: "oid"
//         }),
//         new Field({
//             name: "tract",
//             type: "string"
//         }),
//         new Field({
//             name: "block_group",
//             type: "string"
//         }),
//     ]

//     const layer = new FeatureLayer({
//         source: graphics,
//         title: "Buggered GRaphics",
//         objectIdField: "OBJECTID",
//         fields: layerFields,

//         renderer: new SimpleRenderer({
//             symbol: new SimpleFillSymbol({
//                 color: 'red'
//             })
//         })

//     })

//     return layer

//     // const intersectionBufferedGeoms = bufferedCensusGeoms.forEach(geom => {

//     // })
//     // bufferedCensusGeoms.forEach()
//     // graphic = new Graphic({
//     //     geometry: incident.geometry,
//     //     attributes: incident.attributes
//     // })
//     // graphics.push(graphic)

//     // const censusIncomeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1"})
//     // const censusRaceTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/2"})
//     // const censusAgeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/3"})
//     // const censusTransportationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/4"})
//     // const censusEducationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/5"})
//     // const censusGenderTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/6"})

//     // const incidentsLayer = new FeatureLayer({url: 'https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Saftey_Incidents/FeatureServer'})

//     // const bikeIncidentsLayer = await createIncidentSafetyGraphics(incidentsLayer, "bicyclist = 1", "Bike Incidents")
//     // const pedIncidentsLayer = await createIncidentGraphics(incidentsLayer, "pedestrian = 1", "Pedestrian Incidents")

//     // const incidentGroupLayer = new GroupLayer({
//     //     layers: [
//     //         bikeIncidentsLayer,
//     //         // pedIncidentsLayer
//     //     ],
//     //     title: "Safety Incidents",
//     //     visibilityMode: "exclusive"
//     // })
//     // console.log(incidentGroupLayer)

//     // return bikeIncidentsLayer

// }

export async function createHeatmaps() {
  const safetyPoints = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents_2025/FeatureServer/0",
  });
  const safetyWeights = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents_2025/FeatureServer/1",
  });

  // paginate queries since over 2000 records
  let weightResultLength = 10000;
  let weightArr: Record<string, any>[] = [];
  let weightObjectIds: string[] = [];
  while (weightResultLength === 10000) {
    let queryWeights = safetyWeights.createQuery();
    queryWeights.where = "";
    queryWeights.outFields = ["*"];
    queryWeights.maxRecordCountFactor = 5;
    if (weightObjectIds.length > 0) {
      queryWeights.objectIds = weightObjectIds;
    }

    const weightResults = await safetyWeights.queryFeatures(queryWeights);
    const weightFeatures = weightResults.features;

    weightFeatures.forEach((feature: any) => {
      weightArr.push({ ...feature.attributes });
      weightObjectIds.push(feature.attributes.objectid);
    });
    weightResultLength = weightFeatures.length;
    weightObjectIds = weightObjectIds.map((id) => id + weightResultLength);
  }

  let earliestIncidentDate = new Date();
  let pointResultLength = 10000;
  let pointArr: Record<string, any>[] = [];
  let pointObjectIds: string[] = [];
  while (pointResultLength === 10000) {
    let pointQuery = safetyPoints.createQuery();
    pointQuery.where = "";
    pointQuery.outFields = ["*"];
    pointQuery.returnGeometry = true;
    pointQuery.maxRecordCountFactor = 5;
    if (pointObjectIds.length > 0) {
      pointQuery.objectIds = pointObjectIds;
    }

    const pointResults = await safetyPoints.queryFeatures(pointQuery);
    let pointFeatures = pointResults.features;

    pointFeatures.forEach((feature) => {
      const attributes = feature.attributes;
      if (attributes.timestamp < earliestIncidentDate) {
        earliestIncidentDate = attributes.timestamp;
      }
      const geometry = feature.geometry;
      pointArr.push({ ...attributes, geometry: geometry });

      pointObjectIds.push(feature.attributes.objectid);
    });
    pointResultLength = pointFeatures.length;
    pointObjectIds = pointObjectIds.map((id) => id + pointResultLength);
  }

  console.log(pointArr.length);
  const mergedData = pointArr.map((point) => {
    const weightData = weightArr.filter(
      (weight) => weight.incident_id === point.id
    );
    return {
      ...(weightData ? weightData[0] : {}),
      ...point,
    };
  });

  const graphics: Graphic[] = [];
  let graphic;

  for (let i = 0; i < mergedData.length; i++) {
    graphic = new Graphic({
      geometry: mergedData[i].geometry,
      attributes: mergedData[i],
    });
    graphics.push(graphic);
  }

  const layerFields = [
    new Field({
      name: "OBJECTID",
      alias: "ObjectId",
      type: "oid",
    }),
    new Field({
      name: "incident_type",
      alias: "Incident Type",
      type: "string",
    }),
    new Field({
      name: "timestamp",
      alias: "Timestamp",
      type: "date",
    }),
    new Field({
      name: "pedestrian",
      alias: "Pedestrian Involved",
      type: "small-integer",
    }),
    new Field({
      name: "bicyclist",
      alias: "Bicyclist Involved",
      type: "small-integer",
    }),
    new Field({
      name: "ebike",
      alias: "E-Bike Involved",
      type: "small-integer",
    }),
    new Field({
      name: "age",
      alias: "Age",
      type: "string",
    }),
    new Field({
      name: "gender",
      alias: "Gender",
      type: "string",
    }),
    // {
    //     name: "x",
    //     alias: "Longitude",
    //     type: "double"
    // },
    // {
    //     name: "y",
    //     alias: "Latitude",
    //     type: "double"
    // },
    new Field({
      name: "location",
      alias: "Location",
      type: "geometry",
    }),
    new Field({
      name: "data_source",
      alias: "Data Source",
      type: "string",
    }),
    new Field({
      name: "exposure",
      alias: "Bike Counts",
      type: "double",
    }),
  ];

  const layer = new FeatureLayer({
    source: graphics,
    title: "Exposure Risk",
    fields: layerFields,
    timeInfo: {
      startField: "timestamp",
      interval: {
        unit: "days",
        value: 1,
      },
      fullTimeExtent: {
        start: earliestIncidentDate,
        end: new Date(),
      },
    },
    renderer: new HeatmapRenderer({
      field: "exposure",
      colorStops: [
        { color: colors[0], ratio: 0 },
        { color: colors[0], ratio: 0.083 },
        { color: colors[0], ratio: 0.166 },
        { color: colors[0], ratio: 0.249 },
        { color: colors[0], ratio: 0.332 },
        { color: colors[0], ratio: 0.415 },
        { color: colors[0], ratio: 0.498 },
        { color: colors[2], ratio: 0.581 },
        { color: colors[4], ratio: 0.664 },
        { color: colors[6], ratio: 0.747 },
        { color: colors[8], ratio: 0.83 },
        { color: colors[10], ratio: 0.913 },
        { color: colors[12], ratio: 1 },
      ],

      radius: 15,
      maxDensity: 0.015,
      minDensity: 0.005,
      referenceScale: 35000,
      legendOptions: {
        title: "High Risk Areas",
        minLabel: "",
        maxLabel: "Greatest Risk",
      },
    }),
  });

  return layer;
}

import addHeatmapRenderPanel from "@/ui/safety-app/components/map/HeatmapRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";

export const addHeatmapVisOptions = (event: any) => {
  const { item } = event;
  console.log(item);

  if (item.title === "Exposure Risk") {
    item.open = true;
    console.log(item);
    addHeatmapRenderPanel(item);
  }
};
