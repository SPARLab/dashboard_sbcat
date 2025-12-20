"use client";

import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";
import { UniqueValueRenderer } from "@arcgis/core/renderers";

const censusTitle = "Demographics";
// function creates a graphics layer for the census data based on a chosen table

async function createCensusGraphics(
  geomLayer: any,
  tableLayer: any,
  layerName: any
) {
  // create an array of graphics and array of table attribute fields
  const tableQuery = tableLayer.createQuery();
  tableQuery.where = ""; // No filter, query all records
  tableQuery.outFields = ["*"];

  const tableArr: Record<string, any>[] = []; // Array of attribute objects
  const tableResults: FeatureSet = await tableLayer.queryFeatures(tableQuery);

  const tableFeatures = tableResults.features;
  tableFeatures.forEach((feature: any) => {
    tableArr.push(feature.attributes);
  });
  let tableAttributes = Object.keys(tableFeatures[0].attributes);

  // querying census for geometry attributes
  // querying census block and tract geometries
  const geomQuery = geomLayer.createQuery();
  geomQuery.where = "";
  geomQuery.outFields = ["id"];
  geomQuery.returnGeometry = true;

  const geomArr: Record<string, any>[] = []; // Array of attribute objects
  const geomResults: FeatureSet = await geomLayer.queryFeatures(geomQuery);

  const geomFeatures = geomResults.features;
  geomFeatures.forEach((feature: any) => {
    const id = feature.attributes.id;
    const geometry = feature.geometry;

    geomArr.push({ id: id, geometry: geometry });
  });

  // joining geometries with census table
  const mergedData = tableArr.map((tableData) => {
    const geomData = geomArr.find((data) => data.id === tableData.geo_id);
    return {
      ...tableData,
      ...(geomData ? geomData : {}),
    };
  });

  // creating a new graphics layer
  const graphics = [];
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
      type: "oid",
    }),
    new Field({
      name: "tract",
      type: "string",
    }),
    new Field({
      name: "block_group",
      type: "string",
    }),
  ];

  tableAttributes = tableAttributes.filter(
    (name) => !new Set(["objectid", "geo_id", "tract", "block_group"]).has(name)
  );
  let medianField = "";
  tableAttributes.forEach((attr) => {
    const field = new Field({
      name: attr,
      type: "double",
    });

    layerFields.push(field);
    if (attr.includes("median")) {
      medianField = attr;
    }
  });

  // determine initial rendering based on whether there's a median field or not
  let displayField = "";
  let normField = "";
  let lowStop = 0.1;
  let highStop = 0.5;
  let lowLabel = "<10%";
  let highLabel = ">50%";

  if (medianField !== "") {
    displayField = medianField;
    const medianValues = mergedData
      .map((obj) => obj[medianField])
      .filter((value) => value !== null);

    lowStop = Math.min(...medianValues);
    highStop = Math.max(...medianValues);

    lowLabel = `$${lowStop}/year`;
    highLabel = `$${highStop}/year`;
    console.log(lowStop, highStop);
  } else {
    displayField = layerFields[4].name;
    normField = layerFields[3].name;
  }

  // create new feature layer with graphics
  const layer = new FeatureLayer({
    source: graphics,
    title: layerName,
    objectIdField: "OBJECTID",
    fields: layerFields,
    // popupTemplate: {
    //     content: "<p>heyo! '{tract}' '{block_group}'</p>"
    // },
    opacity: 0.6,
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        outline: {
          color: "lightgray",
          width: 0.5,
        },
      }),
      // label: "fill this in later",
      visualVariables: [
        new ColorVariable({
          field: displayField,
          normalizationField: normField,
          stops: [
            {
              value: lowStop,
              color: "#FFFCD4",
              label: lowLabel,
            },
            {
              value: highStop,
              color: "#350242",
              label: highLabel,
            },
          ],
        }),
      ],
    }),
  });

  return layer;
}

async function createGraphics(tableLayer: FeatureLayer) {
  const geomLayer = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer",
  });

  const tableQuery = tableLayer.createQuery();
  tableQuery.where = ""; // No filter, query all records
  tableQuery.outFields = ["*"];

  const tableArr: Record<string, any>[] = []; // Array of attribute objects
  const tableResults: FeatureSet = await tableLayer.queryFeatures(tableQuery);

  const tableFeatures = tableResults.features;
  tableFeatures.forEach((feature: any) => {
    tableArr.push(feature.attributes);
  });

  // querying census for geometry attributes
  // querying census block and tract geometries
  const geomQuery = geomLayer.createQuery();
  geomQuery.where = "";
  geomQuery.outFields = ["id"];
  geomQuery.returnGeometry = true;

  const geomArr: Record<string, any>[] = []; // Array of attribute objects
  const geomResults: FeatureSet = await geomLayer.queryFeatures(geomQuery);

  const geomFeatures = geomResults.features;
  geomFeatures.forEach((feature: any) => {
    const id = feature.attributes.id;
    const geometry = feature.geometry;

    geomArr.push({ id: id, geometry: geometry });
  });

  // joining geometries with census table
  const mergedData = tableArr.map((tableData) => {
    const geomData = geomArr.find((data) => data.id === tableData.geo_id);
    return {
      ...tableData,
      ...(geomData ? geomData : {}),
    };
  });

  // creating a new graphics layer
  const graphics = [];
  let graphic;
  for (let i = 0; i < mergedData.length; i++) {
    graphic = new Graphic({
      geometry: mergedData[i].geometry,
      attributes: mergedData[i],
    });
    graphics.push(graphic);
  }
  console.log(graphics);
  return graphics;
}

async function createEducationLayer() {
  const educationTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/5",
  });
  const graphics = await createGraphics(educationTable);

  const layerFields = [
    new Field({
      name: "OBJECTID",
      alias: "Object ID",
      type: "oid",
    }),
    new Field({
      name: "tract",
      alias: "Tract",
      type: "string",
    }),
    new Field({
      name: "block_group",
      alias: "Block Group",
      type: "string",
    }),
    new Field({
      name: "educ_total",
      alias: "Total Population",
      type: "double",
    }),
    new Field({
      name: "educ_less_high_school",
      alias: "Less than High School",
      type: "double",
    }),
    new Field({
      name: "educ_high_school",
      alias: "High School",
      type: "double",
    }),
    new Field({
      name: "educ_some_college",
      alias: "Some College",
      type: "double",
    }),
    new Field({
      name: "educ_college",
      alias: "College",
      type: "double",
    }),
  ];

  const layer = new FeatureLayer({
    source: graphics,
    title: "Education",
    objectIdField: "OBJECTID",
    fields: layerFields,
    popupTemplate: {
      title: "Highest Level of Education",
      content: [
        {
          type: "fields",
          fieldInfos: [
            {
              fieldName: "tract",
              label: "Tract",
            },
            {
              fieldName: "block_group",
              label: "Block Group",
            },
            {
              fieldName: "educ_total",
              label: "Total Population",
            },
            {
              fieldName: "educ_less_high_school",
              label: "Less than High School",
            },
            {
              fieldName: "educ_high_school",
              label: "High School",
            },
            {
              fieldName: "educ_some_college",
              label: "Some College",
            },
            {
              fieldName: "educ_college",
              label: "College",
            },
          ],
        },
      ],
    },
    opacity: 0.6,
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        outline: {
          color: "lightgray",
          width: 0.5,
        },
      }),
      label: "Highest Education Level",
      visualVariables: [
        new ColorVariable({
          field: "educ_less_high_school",
          normalizationField: "educ_total",
          stops: [
            {
              value: 0.1,
              color: "#FFFCD4",
              label: "< 10%",
            },
            {
              value: 0.5,
              color: "#350242",
              label: "> 50%",
            },
          ],
        }),
      ],
    }),
  });

  return layer;
}

async function createRaceLayer() {
  const raceTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/2",
  });

  const graphics = await createGraphics(raceTable);

  const layerFields = [
    new Field({
      name: "OBJECTID",
      alias: "Object ID",
      type: "oid",
    }),
    new Field({
      name: "tract",
      alias: "Tract",
      type: "string",
    }),
    new Field({
      name: "block_group",
      alias: "Block Group",
      type: "string",
    }),
    new Field({
      name: "race_total",
      alias: "Total Population",
      type: "double",
    }),
    new Field({
      name: "race_white",
      alias: "White Population",
      type: "double",
    }),
    new Field({
      name: "race_black",
      alias: "Black Population",
      type: "double",
    }),
    new Field({
      name: "race_indigenous",
      alias: "Indigenous Population",
      type: "double",
    }),
    new Field({
      name: "race_asian",
      alias: "Asian Population",
      type: "double",
    }),
    new Field({
      name: "race_hispanic",
      alias: "Hispanic Population",
      type: "double",
    }),
  ];

  const layer = new FeatureLayer({
    source: graphics,
    title: "Race",
    objectIdField: "OBJECTID",
    fields: layerFields,
    popupTemplate: {
      title: "Race ACS Data",
      content: [
        {
          type: "fields",
          fieldInfos: [
            {
              fieldName: "tract",
              label: "Tract",
            },
            {
              fieldName: "block_group",
              label: "Block Group",
            },
            {
              fieldName: "race_total",
              label: "Total Population",
            },
            {
              fieldName: "race_white",
              label: "White Population",
            },
            {
              fieldName: "race_black",
              label: "Black Population",
            },
            {
              fieldName: "race_indigenous",
              label: "Indigenous Population",
            },
            {
              fieldName: "race_asian",
              label: "Asian Population",
            },
            {
              fieldName: "race_hispanic",
              label: "Hispanic Population",
            },
          ],
        },
      ],
    },
    opacity: 0.6,
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        outline: {
          color: "lightgray",
          width: 0.5,
        },
      }),
      // label: "fill this in later",
      visualVariables: [
        new ColorVariable({
          field: "race_white",
          normalizationField: "race_total",
          stops: [
            {
              value: 0.1,
              color: "#FFFCD4",
              label: "< 10%",
            },
            {
              value: 0.5,
              color: "#350242",
              label: "> 50%",
            },
          ],
        }),
      ],
    }),
  });

  return layer;
}

async function createIncomeLayer() {
  const incomeTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1",
  });

  const graphics = await createGraphics(incomeTable);

  const layerFields = [
    new Field({
      name: "OBJECTID",
      alias: "Object ID",
      type: "oid",
    }),
    new Field({
      name: "tract",
      alias: "Tract",
      type: "string",
    }),
    new Field({
      name: "block_group",
      alias: "Block Group",
      type: "string",
    }),
    new Field({
      name: "income_median",
      alias: "Median Income",
      type: "double",
    }),
    new Field({
      name: "income_total",
      alias: "Total Residents",
      type: "double",
    }),
    new Field({
      name: "income_less_than_10k",
      alias: "< 10k",
      type: "double",
    }),
    new Field({
      name: "income_10k_to_20k",
      alias: "10k - 20k",
      type: "double",
    }),
    new Field({
      name: "income_20k_to_35k",
      alias: "20k - 35k",
      type: "double",
    }),
    new Field({
      name: "income_35k_to_50k",
      alias: "35k - 50k",
      type: "double",
    }),
    new Field({
      name: "income_50k_to_75k",
      alias: "50k - 75k",
      type: "double",
    }),
    new Field({
      name: "income_75k_to_100k",
      alias: "75k - 100k",
      type: "double",
    }),
    new Field({
      name: "income_100k_and_over",
      alias: "> 100k",
      type: "double",
    }),
  ];

  // create new feature layer with graphics
  const layer = new FeatureLayer({
    source: graphics,
    title: "Income",
    objectIdField: "OBJECTID",
    fields: layerFields,
    popupTemplate: {
      title: "Income ACS Data",
      content: [
        {
          type: "fields",
          fieldInfos: [
            {
              fieldName: "tract",
              label: "Tract",
            },
            {
              fieldName: "block_group",
              label: "Block Group",
            },
            {
              fieldName: "income_median",
              label: "Median Income",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_total",
              label: "Total Residents",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_less_than_10k",
              label: "< 10k",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_10k_to_20k",
              label: "10k - 20k",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_20k_to_35k",
              label: "20k - 35k",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_35k_to_50k",
              label: "35k - 50k",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_50k_to_75k",
              label: "50k - 75k",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_75k_to_100k",
              label: "75k - 100k",
              format: { digitSeparator: true, places: 0 },
            },
            {
              fieldName: "income_100k_and_over",
              label: "> 100k",
              format: { digitSeparator: true, places: 0 },
            },
          ],
        },
      ],
    },
    opacity: 0.6,
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        outline: {
          color: "lightgray",
          width: 0.5,
        },
      }),

      visualVariables: [
        new ColorVariable({
          field: "income_median",
          stops: [
            {
              value: 50000,
              color: "#FFFCD4",
              label: "< $50,000",
            },
            {
              value: 200000,
              color: "#350242",
              label: "> $200,000",
            },
          ],
        }),
      ],
    }),
  });

  return layer;
}

// funciton loads all census feature layers (polygons, tables) and create new client side feature layers then groups them into a single group layer
export async function createCensusGroupLayer() {
  const incomeLayer = await createIncomeLayer();

  const raceLayer = await createRaceLayer();

  // const censusAgeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/3"})
  // const ageLayer = await createCensusGraphics(censusPolygons, censusAgeTable, "Age")

  // const censusTransportationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/4"})
  // const transportationLayer = await createCensusGraphics(censusPolygons, censusTransportationTable, "Transportation")

  const educationLayer = await createEducationLayer();

  // const censusGenderTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/6"})
  // const genderLayer = await createCensusGraphics(censusPolygons, censusGenderTable, "Gender")

  const censusGroupLayer = new GroupLayer({
    layers: [
      incomeLayer,
      raceLayer,
      // ageLayer,
      // transportationLayer,
      educationLayer,
      // gendegrLayer
    ],
    title: censusTitle,
    visibilityMode: "exclusive",
  });
  return censusGroupLayer;
}

// arcgisLayerList.
