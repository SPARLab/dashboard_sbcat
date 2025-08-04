"use client";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import Field from "@arcgis/core/layers/support/Field";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";

// Create AADT Feature Layer for count sites
export async function createAADTLayer() {
  const countPoints = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0",
  });
  
  const aadtTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2",
  });

  // Define fields for the layer
  const layerFields = [
    new Field({
      name: "OBJECTID",
      alias: "ObjectId",
      type: "oid",
    }),
    new Field({
      name: "name",
      alias: "Count Site",
      type: "string",
    }),
    new Field({
      name: "source",
      alias: "Survey",
      type: "string",
    }),
    new Field({
      name: "locality",
      alias: "Locality",
      type: "string",
    }),
    new Field({
      name: "all_aadt",
      alias: "All Days AADT",
      type: "double",
    }),
    new Field({
      name: "weekday_aadt",
      alias: "Weekday AADT",
      type: "double",
    }),
    new Field({
      name: "weekend_aadt",
      alias: "Weekend AADT",
      type: "double",
    }),
  ];

  // Create popup template
  const popupTemplate = {
    title: "Count Site: {name}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "name",
            label: "Location",
          },
          {
            fieldName: "locality",
            label: "Locality",
          },
          {
            fieldName: "all_aadt",
            label: "Average Annual Daily Traffic (AADT)",
          },
          {
            fieldName: "weekday_aadt",
            label: "Weekday AADT",
          },
          {
            fieldName: "weekend_aadt",
            label: "Weekend AADT",
          },
        ],
      },
    ],
  };

  // Create renderer with color coding based on AADT values
  const renderer = new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      size: 8,
      outline: {
        width: 1,
        color: "gray",
      },
    }),
    visualVariables: [
      new ColorVariable({
        field: "all_aadt",
        stops: [
          {
            value: 50,
            color: "#D4EFFF",
            label: "Low daily traffic",
          },
          {
            value: 1000,
            color: "#FF6E00",
            label: "High daily traffic",
          },
        ],
      }),
    ],
  });

  // Create the feature layer
  const aadtLayer = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0",
    title: "AADT Count Sites",
    objectIdField: "OBJECTID",
    fields: layerFields,
    popupTemplate: popupTemplate,
    renderer: renderer,
    outFields: ["*"],
  });

  return aadtLayer;
}

// Create Hexagon Vector Tile Layer for modeled volumes
export function createHexagonLayer() {
  const bikeHexagonTile = new VectorTileLayer({
    style: {
      version: 8,
      sources: {
        esri: {
          url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/ModeledVolumes/VectorTileServer",
          type: "vector",
        },
      },
      layers: [
        {
          id: "AADBT",
          type: "fill",
          source: "esri",
          "source-layer": "HexagonAADT",
          layout: {},
          paint: {
            "fill-color": [
              "step",
              ["get", "aadt_2023_bike"],
              "#ffffb2",
              100,
              "#fecc5c",
              300,
              "#fd8d3c",
              600,
              "#e31a1c",
            ],
            "fill-outline-color": "#6E6E6E",
            "fill-opacity": 0.6,
          },
        },
      ],
    },
    title: "Modeled Biking Volumes",
    visible: true,
    opacity: 0.5,
  });

  const pedHexagonTile = new VectorTileLayer({
    style: {
      version: 8,
      sources: {
        esri: {
          url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/ModeledVolumes/VectorTileServer",
          type: "vector",
        },
      },
      layers: [
        {
          id: "AADPT",
          type: "fill",
          source: "esri",
          "source-layer": "HexagonAADT",
          layout: {},
          paint: {
            "fill-color": [
              "step",
              ["get", "aadt_2023_ped"],
              "#ffffb2",
              100,
              "#fecc5c",
              300,
              "#fd8d3c",
              600,
              "#e31a1c",
            ],
            "fill-outline-color": "#6E6E6E",
            "fill-opacity": 0.6,
          },
        },
      ],
    },
    title: "Modeled Walking Volumes",
    visible: true,
    opacity: 0.5,
  });

  // Create a group layer for the hexagon layers
  const hexagonGroupLayer = new GroupLayer({
    layers: [bikeHexagonTile, pedHexagonTile],
    title: "Modeled Volumes",
    visibilityMode: "independent",
  });

  return hexagonGroupLayer;
}

// Function to get AADT statistics for charts
export async function getAADTStats(aadtLayer: FeatureLayer) {
  try {
    const results = await aadtLayer.queryFeatures({
      where: "1=1",
      outFields: ["all_aadt", "weekday_aadt", "weekend_aadt", "name"],
      returnGeometry: false,
    });

    return results.features.map(feature => feature.attributes);
  } catch (error) {
    console.error("Error querying AADT stats:", error);
    return [];
  }
} 