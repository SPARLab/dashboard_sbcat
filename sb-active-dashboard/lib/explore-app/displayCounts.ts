"use client";

import Field from "@arcgis/core/layers/support/Field";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import * as math from "mathjs";
import { DataFrame, Str, toJSON } from "danfojs";
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import CustomContent from "@arcgis/core/popup/content/CustomContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import { UniqueValueRenderer } from "@arcgis/core/renderers";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";

// display count locations, change color by average counts/day (?)
// async function createTotalDailyCountGraphics(countPoints: __esri.FeatureLayer, countTable: __esri.FeatureLayer, query: string, title: string) {

//     let tableQuery = countTable.createQuery();
//     tableQuery.where = query // query either only bikes or only peds
//     tableQuery.outFields = ["*"]
//     tableQuery.groupByFieldsForStatistics = ["site_id", "date"]
//     tableQuery.outStatistics = [
//         {
//             onStatisticField: "counts",
//             outStatisticFieldName: "total_daily_count",
//             statisticType: "sum"
//         }
//     ]

//     let tableArr = []
//     const tableResults = await countTable.queryFeatures(tableQuery)

//     let tableFeatures = tableResults.features
//     tableFeatures.forEach((feature: any) => {
//         tableArr.push({...feature.attributes})
//     })

//     const tableDf = new DataFrame(tableArr)
//     const dailyAvgCounts = tableDf.groupby(["site_id"]).agg({total_daily_count: "mean"}).rename({total_daily_count_mean: "avg_daily_count"})
//     const dailyAvgsObj = toJSON(dailyAvgCounts)

//     // querying count location point geometry attributes
//     let geomQuery = countPoints.createQuery()
//     geomQuery.where = ""
//     geomQuery.outFields = "*"
//     geomQuery.returnGeometry = true

//     let geomArr = []
//     const geomResults = await countPoints.queryFeatures(geomQuery)

//     let geomFeatures = geomResults.features

//     geomFeatures.forEach((feature) => {

//         let id = feature.attributes.id
//         let source = feature.attributes.source
//         let locality = feature.attributes.locality
//         let edges = feature.attributes.site_edges_arr
//         let numEdges

//         if (edges == null) {
//             numEdges = 2
//         } else {
//             let edges_array = edges.split(',').map((edge: Str) => edge.trim())
//             numEdges = edges_array.length
//         }

//         let geometry = feature.geometry

//         geomArr.push({id: id, geometry: geometry, locality: locality, source: source, num_site_edges: numEdges})
//     })

//     // joining geometries with daily average counts table
//     const mergedData = dailyAvgsObj.map((tableData) => {
//         const geomData = geomArr.find((data) => data.id === tableData.site_id)
//         return {
//             ...tableData,
//             ...(geomData ? geomData : {})
//         }
//     })

//     // creating a new graphics layer
//     const graphics: Graphic[] = []
//     let graphic
//     let countArr: number[] = []
//     for (let i=0; i<mergedData.length; i++) {
//         // if the source is video counts, divide total daily counts by 2 so we're keeping one count per rider
//         if (mergedData[i].source = "SB Video Counts") {
//             mergedData[i].avg_daily_count = mergedData[i].avg_daily_count/2

//         }
//         graphic = new Graphic({
//             geometry: mergedData[i].geometry,
//             attributes: mergedData[i]
//         })
//         graphics.push(graphic)
//         countArr.push(mergedData[i].avg_daily_count)
//     }

//     const layerFields = [
//         {
//             name: "OBJECTID",
//             type: "oid"
//         },
//         {
//             name: "name",
//             type: "string"
//         },
//         {
//             name: "source",
//             type: "string"
//         },
//         {
//             name: "locality",
//             type: "string"
//         },
//         {
//             name: "edges",
//             type: "double"
//         },
//         {
//             name: "type",
//             type: "string"
//         },
//         {
//             name: "avg_daily_count",
//             type: "double"
//         },

//     ]

//     // calculate metrics for visualization
//     // count_mean = math.mean()

//     const countMean = math.mean(countArr)
//     const countStd = math.std(countArr)
//     let highStop = Math.round(countMean + countStd)
//     let lowStop = Math.round(countMean - countStd)
//     lowStop = lowStop < 10 ? 10 : lowStop

//     const layer = new FeatureLayer({
//         source: graphics,
//         title: title,
//         objectIdField: "OBJECTID",
//         fields: layerFields,
//         // popupTemplate: {
//         //     content: "<p>heyo! '{tract}' '{block_group}'</p>"
//         // },
//         renderer: {
//             type: "simple",
//             symbol: {
//                 type: "simple-marker",
//                 size: 5,
//                 // color: "red",
//                 outline: {
//                     width: 0.5,
//                     color: "gray"
//                 }
//             },
//             visualVariables: [
//                 {
//                     type: "color",
//                     field: "avg_daily_count",
//                     stops: [
//                         {
//                           value: lowStop,
//                           color: "#D4EFFF",
//                           label: `low daily traffic`
//                         },
//                         {
//                           value: highStop,
//                           color: "#FF6E00",
//                           label: `high daily traffic`
//                         }
//                     ]
//                 }

//             ]

//         }
//     })

//     return layer

// }

// Display count sites by either ped or bike aadt
async function createAADTGraphics(
  countPoints: __esri.FeatureLayer,
  countTable: __esri.FeatureLayer,
  query: string,
  title: string
) {
  const tableQuery = countTable.createQuery();
  tableQuery.where = query; // query either only bikes or only peds
  tableQuery.outFields = ["*"];

  const tableArr: Record<string, any>[] = [];
  const tableResults: FeatureSet = await countTable.queryFeatures(tableQuery);

  const tableFeatures = tableResults.features;
  tableFeatures.forEach((feature: any) => {
    tableArr.push({ ...feature.attributes });
  });

  // querying count location point geometry attributes
  const geomQuery = countPoints.createQuery();
  geomQuery.where = "";
  geomQuery.outFields = ["*"];
  geomQuery.returnGeometry = true;

  const geomArr: Record<string, any>[] = [];
  const geomResults = await countPoints.queryFeatures(geomQuery);

  const geomFeatures = geomResults.features;

  geomFeatures.forEach((feature) => {
    const id = feature.attributes.id;
    const name = feature.attributes.name;
    const source = feature.attributes.source;
    const locality = feature.attributes.locality;
    const edges = feature.attributes.site_edges_arr;
    let numEdges;

    if (edges == null) {
      numEdges = 2;
    } else {
      const edges_array = edges.split(",").map((edge: Str) => edge.trim());
      numEdges = edges_array.length;
    }

    const geometry = feature.geometry;

    geomArr.push({
      id: id,
      geometry: geometry,
      name: name,
      locality: locality,
      source: source,
      num_site_edges: numEdges,
    });
  });

  // joining geometries with daily average counts table
  const mergedData = tableArr.map((tableData) => {
    const geomData = geomArr.find((data) => data.id === tableData.site_id);
    return {
      ...tableData,
      ...(geomData ? geomData : {}),
    };
  });

  // creating a new graphics layer
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
      name: "edges",
      alias: "Replica Edge Ids",
      type: "double",
    }),
    new Field({
      name: "start_date",
      alias: "First Date",
      type: "date-only",
    }),
    new Field({
      name: "end_date",
      alias: "Last Date",
      type: "date-only",
    }),
    new Field({
      name: "year",
      alias: "Year",
      type: "double",
    }),
    new Field({
      name: "count_type",
      alias: "User",
      type: "string",
    }),
    new Field({
      name: "subset",
      alias: "Survey Limitations",
      type: "string",
    }),
    new Field({
      name: "all_aadt",
      alias: "All Days",
      type: "double",
    }),
    new Field({
      name: "weekday_aadt",
      alias: "Weekdays",
      type: "double",
    }),
    new Field({
      name: "weekend_aadt",
      alias: "Weekends",
      type: "double",
    }),
  ];

  const countType = query.includes("ped") ? "Pedestrian" : "Bike";

  const popupTemplate = {
    // autocasts as new PopupTemplate()
    title: `${countType} Counts at {name}`,
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "name",
            label: "Location",
          },
          {
            fieldName: "start_date",
            label: "First Count Date",
            format: {
              dateFormat: "short-date",
            },
          },
          {
            fieldName: "end_date",
            label: "Last Count Date",
            format: {
              dateFormat: "short-date",
            },
          },
          {
            fieldName: "all_aadt",
            label: "Average Annual Daily Volume (AADV)",
          },
          {
            fieldName: "weekday_aadt",
            label: "Weekday AADV",
          },
          {
            fieldName: "weekend_aadt",
            label: "Weekend AADV",
          },
        ],
      },
    ],
  };

  const layer = new FeatureLayer({
    source: graphics,
    title: title,
    objectIdField: "OBJECTID",
    fields: layerFields,
    timeInfo: {
      startField: "start_date",
      endField: "end_date",
      interval: {
        unit: "years",
        value: 1,
      },
    },
    popupTemplate: popupTemplate,
    renderer: new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        size: 5,
        // color: "red",
        outline: {
          width: 0.5,
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
              label: `low daily traffic`,
            },
            {
              value: 1000,
              color: "#FF6E00",
              label: `high daily traffic`,
            },
          ],
        }),
      ],
    }),
  });

  return layer;
}

// I want to visualize my count sites by presence of bike counts and presence of pedestrian counts. In my popup, I want to give a summary of when surveys were conducted and who conducted them

// function that creates new count site layer with attributes: Ped Data, Bike Data, Earliest Data, Last Data

async function createSiteGraphics() {
  const countPoints = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0",
  });
  const aadtTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2",
  });

  const geomQuery = countPoints.createQuery();
  geomQuery.where = "";
  geomQuery.outFields = ["*"];
  geomQuery.returnGeometry = true;

  const geomArr: Record<string, any>[] = [];
  const geomResults = await countPoints.queryFeatures(geomQuery);

  const geomFeatures = geomResults.features;

  const typeQuery = aadtTable.createQuery();
  typeQuery.where = "1=1";
  const aadtResults = await aadtTable.queryFeatures();
  const aadtFeatures = aadtResults.features;
  for (const feature of geomFeatures) {
    const id = feature.attributes.id;
    const name = feature.attributes.name;
    const source = feature.attributes.source;
    const locality = feature.attributes.locality;
    const geometry = feature.geometry;

    // query aadt table to determin if there are ped and bike counts

    const typeResults = aadtFeatures.filter(
      (feature) => feature.attributes.site_id === id
    );
    let bikeData = false;
    let pedData = false;
    let firstSurvey: number | string | null = null;
    let lastSurvey: number | string | null = null;
    typeResults.forEach((feature) => {
      if (feature.attributes.count_type === "bike") {
        bikeData = true;
      }
      if (feature.attributes.count_type === "ped") {
        pedData = true;
      }

      if (!firstSurvey) {
        firstSurvey = feature.attributes.start_date;
      } else if (firstSurvey < feature.attributes.start_date) {
        firstSurvey = feature.attributes.start_date;
      }

      if (!lastSurvey) {
        lastSurvey = feature.attributes.end_date;
      } else if (lastSurvey < feature.attributes.end_date) {
        lastSurvey = feature.attributes.end_date;
      }
    });

    let countTypes = "Biking & Walking";
    if (bikeData && !pedData) {
      countTypes = "Biking";
    }
    if (!bikeData && pedData) {
      countTypes = "Walking";
    }

    geomArr.push({
      id,
      geometry,
      name,
      locality,
      source,
      countTypes,
      firstSurvey,
      lastSurvey,
    });
  }

  // creating a new graphics layer
  const graphics: Graphic[] = [];
  let graphic;

  for (let i = 0; i < geomArr.length; i++) {
    graphic = new Graphic({
      geometry: geomArr[i].geometry,
      attributes: geomArr[i],
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
      name: "id",
      alias: "Site ID",
      type: "string",
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
      name: "countTypes",
      alias: "Data Collected",
      type: "string",
    }),
    new Field({
      name: "firstSurvey",
      alias: "First Survey",
      type: "date-only",
    }),
    new Field({
      name: "lastSurvey",
      alias: "Last Survey",
      type: "date-only",
    }),
  ];

  const siteInfo = {
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
        fieldName: "source",
        label: "Source",
      },
      {
        fieldName: "countTypes",
        label: "Data Collected",
      },
      {
        fieldName: "firstSurvey",
        label: "First Surveyed",
        format: {
          dateFormat: "short-date",
        },
      },
      {
        fieldName: "lastSurvey",
        label: "Last Surveyed",
        format: {
          dateFormat: "short-date",
        },
      },
    ],
  };

  const surveyContent = new CustomContent({
    outFields: ["*"],
    creator: (event) => {
      if (event?.graphic) {
        const siteId = event.graphic.attributes.id;
        const siteName = event.graphic.attributes.name;
        const source = event.graphic.attributes.source;
        const query = aadtTable.createQuery();
        query.where = "site_id = " + siteId;
        return aadtTable.queryFeatures(query).then((results: FeatureSet) => {
          const tableArr: Record<string, any>[] = [];
          results.features.forEach((feature: any) => {
            tableArr.push({ ...feature.attributes });
          });

          const typeDict: Record<string, string> = {
            ped: "Walking",
            bike: "Biking",
          };
          const tableContent = tableArr.map((record) => {
            return {
              ...record,
              start_date: new Date(record.start_date).toDateString(),
              end_date: new Date(record.end_date).toDateString(),
              start_year: new Date(record.start_date).getFullYear(),
              count_type: typeDict[record.count_type],
            };
          });

          const numSurveys = Array.from(
            new Set(tableArr.map((record) => record.start_date))
          ).length;
          const startYears = Array.from(
            new Set(
              tableArr.map((record) =>
                new Date(record.start_date).getFullYear()
              )
            )
          );
          const endYears = Array.from(
            new Set(
              tableArr.map((record) => new Date(record.end_date).getFullYear())
            )
          );
          const uniqueYears = Array.from(new Set(startYears.concat(endYears)));

          const countTypes = Array.from(
            new Set(tableArr.map((record) => record.count_type))
          )
            .join(" and ")
            .replace("ped", "<b>Walking</b>")
            .replace("bike", "<b>Biking</b>");

          const buildStyledTable = (tableInfo: any) => {
            const attributes = [
              "start_date",
              "end_date",
              "count_type",
              "all_aadt",
              "weekday_aadt",
              "weekend_aadt",
            ];

            const labels: Record<string, string> = {
              start_date: "Start Date",
              end_date: "End Date",
              count_type: "Count Type",
              all_aadt: "Everyday AADT",
              weekday_aadt: "Weekday AADT",
              weekend_aadt: "Weekend AADT",
            };

            return `
                        <br/><br/>
                        <details>
                        <summary><b>${tableInfo.start_year} ${tableInfo.count_type} Survey</b></summary>
                        <div class="esri-feature-fields">
                            
                            <table class="esri-widget__table">
                                <tbody>
                                ${attributes
                                  .map(
                                    (attr) =>
                                      `
                                        <tr>
                                            <th class="esri-feature-fields__field-header">${labels[attr]}</th>
                                            <td class="esri-feature-fields__field-data">${tableInfo[attr]}</td>
                                        </tr>`
                                  )
                                  .join("")}
                                </tbody>
                        
                            </table>
                        </div>
                        </details>
                        `;
          };

          // Format the returned values and display this in the popup content
          return `
                    <b>Site Summary</b>
                    <br/><br/>
                    <b>${numSurveys}</b> ${source} survey${numSurveys > 1 ? "s have" : " has"} been conducted at ${siteName}.
                    Surveys collected ${countTypes} volume data ${
                      uniqueYears.length > 1
                        ? "over the following years: <ul>" +
                          uniqueYears
                            .map((year) => "<li>" + year + "</li>")
                            .join("") +
                          "</ul>"
                        : "during " + uniqueYears[0]
                    }
                    
                    ${tableContent.map((survey) => buildStyledTable(survey)).join("")}
                    
                `;
        });
      }
      // return "hey"
    },
  });

  const layer = new FeatureLayer({
    source: graphics,
    title: "All Sites",
    objectIdField: "OBJECTID",
    fields: layerFields,
    timeInfo: {
      startField: "firstSurvey",
      endField: "lastSurvey",
      interval: {
        unit: "years",
        value: 1,
      },
    },
    popupTemplate: new PopupTemplate({
      outFields: ["*"],
      title: "{name}",
      content: [siteInfo, surveyContent],
    }),
    renderer: new UniqueValueRenderer({
      field: "countTypes",
      defaultSymbol: new SimpleMarkerSymbol({
        style: "circle",
        color: "gray",
        size: 6,
      }),
      uniqueValueInfos: [
        {
          value: "Biking & Walking",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: "blue",
            size: 6,
          }),
        },
        {
          value: "Biking",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: "green",
            size: 6,
          }),
        },
        {
          value: "Walking",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: "purple",
            size: 6,
          }),
        },
      ],
    }),
  });
  console.log(layer);
  return layer;
}

export function createModeledVolumeLayer() {
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
          },
        },
      ],
    },
    title: "Modeled Biking Volumes",
    visible: false,
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
          },
        },
      ],
    },
    title: "Modeled Walking Volumes",
    visible: false,
    opacity: 0.5,
  });

  const modeledVolumeGroupLayer = new GroupLayer({
    layers: [bikeHexagonTile, pedHexagonTile],
    title: "Modeled Volumes",
    visibilityMode: "exclusive",
  });
  return modeledVolumeGroupLayer;
}

export async function createCountGroupLayer() {
  const countPoints = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0",
  });
  const countTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1",
  });
  const aadtTable = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2",
  });

  const bikeLayer = await createAADTGraphics(
    countPoints,
    aadtTable,
    "count_type = 'bike'",
    "Biking Sites"
  );
  const pedLayer = await createAADTGraphics(
    countPoints,
    aadtTable,
    "count_type = 'ped'",
    "Walking Sites"
  );
  const combinedLayer = await createSiteGraphics();
  // const modelBikeLayer = await createModeledVolumeLayer()

  const countGroupLayer = new GroupLayer({
    layers: [bikeLayer, pedLayer, combinedLayer],
    title: "Count Sites",
    visibilityMode: "independent",
  });

  return countGroupLayer;
}
