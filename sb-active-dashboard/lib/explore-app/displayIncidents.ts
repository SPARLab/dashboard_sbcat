"use client";
import Field from "@arcgis/core/layers/support/Field";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import TextSymbol from "@arcgis/core/symbols/TextSymbol";
import PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
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

const pointRenderer = new UniqueValueRenderer({
  field: "incident_type",
  uniqueValueInfos: [
    {
      value: "Collision",
      symbol: new PictureMarkerSymbol({
        url: "/icons/incident_marker.svg",
        width: "10px",
        height: "18px",
      }),
    },
    {
      value: "Near Collision",
      symbol: new PictureMarkerSymbol({
        url: "/icons/hazard_marker.svg",
        width: "10px",
        height: "18px",
      }),
    },
  ],
});

const clusterRenderer = new SimpleRenderer({
  symbol: new SimpleMarkerSymbol({
    size: 6,
    color: "red",
  }),
});

const clusterReduction = new FeatureReductionCluster({
  clusterMinSize: 16.5,
  // defines the label within each cluster
  labelingInfo: [
    {
      deconflictionStrategy: "none",
      labelExpressionInfo: {
        expression: "Text($feature.cluster_count, '#,###')",
      },
      symbol: new TextSymbol({
        color: "white",
        font: {
          family: "Noto Sans",
          size: "12px",
        },
      }),
      labelPlacement: "center-center",
    },
  ],
  // information to display when the user clicks a cluster
  popupTemplate: {
    title: "Cluster Summary",
    content: "This cluster represents <b>{cluster_count}</b> safety incidents.",
    fieldInfos: [
      {
        fieldName: "cluster_count",
        format: {
          places: 0,
          digitSeparator: true,
        },
      },
    ],
  },
});

async function createIncidentGraphics(
  incidentPoints: __esri.FeatureLayer,
  query: string,
  title: string
) {
  const incidentsQuery = incidentPoints.createQuery();
  incidentsQuery.where = query;
  incidentsQuery.outFields = ["*"];
  incidentsQuery.maxRecordCountFactor = 5;

  let incidentFeatures: Graphic[] = [];
  const queryResults: FeatureSet =
    await incidentPoints.queryFeatures(incidentsQuery);
  incidentFeatures.push(...queryResults.features);

  const graphics: Graphic[] = [];
  let graphic;

  incidentFeatures.forEach((incident) => {
    const timestamp = new Date(incident.attributes.timestamp);
    incident.attributes.dow = timestamp.getDay();
    graphic = new Graphic({
      geometry: incident.geometry,
      attributes: incident.attributes,
    });
    graphics.push(graphic);
  });

  const layerFields = [
    new Field({ name: "OBJECTID", type: "oid" }),
    new Field({ name: "data_source", type: "string" }),
    new Field({ name: "age", type: "double" }),
    new Field({ name: "gender", type: "string" }),
    new Field({ name: "incident_type", type: "string" }),
    new Field({ name: "pedestrian", type: "double" }),
    new Field({ name: "bicyclist", type: "double" }),
    new Field({ name: "timestamp", type: "date" }),
    new Field({ name: "dow", type: "double" }),
  ];

  const popupTemplate = {
    title: `{incident_type} Safety Incident`,
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "incident_type",
            label: "Type of Incident",
          },
          {
            fieldName: "expression/timestamp",
            label: "Date & Time",
          },
          {
            fieldName: "expression/dow",
          },
          {
            fieldName: "expression/pedestrianStatus",
          },
          {
            fieldName: "expression/bicyclistStatus",
          },
          {
            fieldName: "data_source",
            label: "Data Source",
          },
        ],
      },
    ],

    expressionInfos: [
      {
        name: "timestamp",
        title: "Date & Time (PDT)",
        expression: `
                    var localDate = $feature.timestamp; // Timestamps are already in PDT
                    return Text(localDate, 'MMM D, YYYY, h:mm a');
                `,
      },
      {
        name: "dow",
        title: "Day of Week",
        expression:
          "When( $feature.dow == 0, 'Sunday', $feature.dow == 1, 'Monday', $feature.dow == 2, 'Tuesday', $feature.dow == 3, 'Wednesday', $feature.dow == 4, 'Thursday', $feature.dow == 5, 'Friday', $feature.dow == 6, 'Saturday', 'NA')",
      },
      {
        name: "pedestrianStatus",
        title: "Pedestrian Involved",
        expression: "IIF($feature.pedestrian == 1, 'Yes', 'No')",
      },
      {
        name: "bicyclistStatus",
        title: "Bicyclist Involved",
        expression: "IIF($feature.bicyclist == 1, 'Yes', 'No')",
      },
    ],
  };
  console.log(graphics);
  const layer = new FeatureLayer({
    source: graphics,
    title: title,
    objectIdField: "OBJECTID",
    fields: layerFields,
    timeInfo: {
      startField: "timestamp",
      interval: {
        unit: "days",
        value: 1,
      },
    },
    popupTemplate: popupTemplate,
    renderer: clusterRenderer,
    featureReduction: clusterReduction,
    outFields: ["*"], // necessary to ensure that all attributes are present when making queries against layerview
  });

  return layer;
}

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
      } else if (type === "simple") {
        layer.featureReduction = null as unknown as FeatureReductionCluster;
        layer.renderer = pointRenderer;
        layer.opacity = 1;
      } else if (type === "cluster") {
        layer.renderer = clusterRenderer;
        layer.featureReduction = clusterReduction;
        layer.opacity = 1;
      }
    }
  });
}

export async function createIncidentGroupLayer() {
  const incidentsLayer = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents_2025/FeatureServer",
  });

  const combinedIncidentsLayer = await createIncidentGraphics(
    incidentsLayer,
    "",
    "All Incidents"
  );
  const bikeIncidentsLayer = await createIncidentGraphics(
    incidentsLayer,
    "bicyclist = 1",
    "Biking Incidents"
  );
  const pedIncidentsLayer = await createIncidentGraphics(
    incidentsLayer,
    "pedestrian = 1",
    "Walking Incidents"
  );

  const incidentGroupLayer = new GroupLayer({
    layers: [combinedIncidentsLayer, bikeIncidentsLayer, pedIncidentsLayer],
    title: "Safety",
    visibilityMode: "independent",
  });

  return incidentGroupLayer;
}
