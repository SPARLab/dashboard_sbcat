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
      name: "id",
      alias: "Site ID",
      type: "integer",
    }),
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
export function createHexagonLayer(modelCountsBy: string = "cost-benefit", selectedYear: number = 2023) {
  // Determine field names based on model type and year
  const getFieldName = (countType: 'bike' | 'ped') => {
    if (modelCountsBy === "cost-benefit") {
      return `cos_${selectedYear}_${countType}`;
    } else if (modelCountsBy === "strava-bias") {
      return `str_${selectedYear}_${countType}`;
    }
    return `cos_${selectedYear}_${countType}`; // fallback
  };

  const bikeFieldName = getFieldName("bike");
  const pedFieldName = getFieldName("ped");
  const bikeHexagonTile = new VectorTileLayer({
    style: {
      version: 8,
      sources: {
        esri: {
          url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/HexagonModeledVolumes/VectorTileServer",
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
              "match",
              ["get", bikeFieldName],
              "High", "#d7191c",
              "Medium", "#fdae61", 
              "Low", "#a6d96a",
              "#cccccc"  // fallback color if value doesn't match
            ],
            "fill-outline-color": "#6E6E6E",
            "fill-opacity": 0.7,
          },
        },
      ],
    },
    title: "Modeled Biking Volumes",
    visible: true,
    opacity: 1,
  });

  const pedHexagonTile = new VectorTileLayer({
    style: {
      version: 8,
      sources: {
        esri: {
          url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/HexagonModeledVolumes/VectorTileServer",
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
              "match",
              ["get", pedFieldName],
              "High", "#d7191c",
              "Medium", "#fdae61",
              "Low", "#a6d96a", 
              "#cccccc"  // fallback color if value doesn't match
            ],
            "fill-outline-color": "#6E6E6E",
            "fill-opacity": 0.7,
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