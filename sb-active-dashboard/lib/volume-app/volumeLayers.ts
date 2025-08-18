"use client";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import Field from "@arcgis/core/layers/support/Field";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import CIMSymbol from "@arcgis/core/symbols/CIMSymbol";
import { getVolumeLevelColor } from "../../ui/theme/volumeLevelColors";

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
              "High", getVolumeLevelColor('high', true),
              "Medium", getVolumeLevelColor('medium', true), 
              "Low", getVolumeLevelColor('low', true),
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
              "High", getVolumeLevelColor('high', true),
              "Medium", getVolumeLevelColor('medium', true),
              "Low", getVolumeLevelColor('low', true), 
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

/**
 * Create line segment layers for modeled volume visualization
 * Uses the StravaNetwork geometry layer with client-side data joining for styling
 */
export function createLineSegmentLayer(modelCountsBy: string = "cost-benefit", selectedYear: number = 2023, countType: 'bike' | 'ped' = 'bike') {
  // Base URL for the modeled volumes service
  const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";
  
  // Layer 0: StravaNetwork (geometry)
  const geometryLayerUrl = `${BASE_URL}/0`;
  
  // Create the geometry layer title
  const layerTitle = `Modeled ${countType === 'bike' ? 'Biking' : 'Walking'} Network (${modelCountsBy === 'cost-benefit' ? 'Cost Benefit' : 'Strava Bias'})`;
  
  // Create the layer with default styling (will be enhanced with data-driven styling)
  const lineSegmentLayer = new FeatureLayer({
    url: geometryLayerUrl,
    title: layerTitle,
    visible: true,
    opacity: 0.8,
    outFields: ["edgeuid", "streetName"],
    popupTemplate: {
      title: "Street Segment: {streetName}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            {
              fieldName: "streetName",
              label: "Street Name",
            },
            {
              fieldName: "edgeuid",
              label: "Edge ID",
            }
          ],
        },
        {
          type: "text", 
          text: `<p><em>Volume data for ${countType === 'bike' ? 'cycling' : 'walking'} in ${selectedYear} (${modelCountsBy === 'cost-benefit' ? 'Cost Benefit Tool' : 'Strava Bias Corrected'} model)</em></p>`
        }
      ],
    },
    // Start with a simple renderer (will be enhanced with data joins)
    renderer: createBasicLineRenderer(),
    // Performance optimization
    maxScale: 0,
    minScale: 0,
    // Filter out null edge IDs for performance
    definitionExpression: `edgeuid IS NOT NULL AND edgeuid > 0`,
  });

  return lineSegmentLayer;
}

/**
 * Create a basic line renderer for the geometry layer
 * This will be the fallback when no data is available
 */
function createBasicLineRenderer(): SimpleRenderer {
  const symbol = new SimpleLineSymbol({
    color: '#888888', // Gray fallback color
    width: 2,
    style: "solid",
    cap: "round",
    join: "round"
  });

  return new SimpleRenderer({
    symbol: symbol
  });
}

/**
 * Create a line renderer that colors line segments based on volume levels
 */
function createVolumeLineRenderer(): SimpleRenderer {
  // Create line symbols for each volume level
  const createLineSymbol = (color: string, width: number = 3): SimpleLineSymbol => {
    return new SimpleLineSymbol({
      color: color,
      width: width,
      style: "solid",
      cap: "round",
      join: "round"
    });
  };

  // For now, create a simple renderer that will be enhanced with data joins
  // We'll use a ColorVariable to map AADT values to colors
  const renderer = new SimpleRenderer({
    symbol: createLineSymbol('#cccccc', 2), // Default fallback color
    visualVariables: [
      new ColorVariable({
        field: "aadt", // This field will come from the joined data
        stops: [
          {
            value: 0,
            color: getVolumeLevelColor('low'), // Green for low volume
            label: "Low Volume (< 50)"
          },
          {
            value: 50,
            color: getVolumeLevelColor('medium'), // Orange for medium volume  
            label: "Medium Volume (50-200)"
          },
          {
            value: 200,
            color: getVolumeLevelColor('high'), // Red for high volume
            label: "High Volume (≥ 200)"
          }
        ],
        legendOptions: {
          title: "Daily Volume (AADT)"
        }
      })
    ]
  });

  return renderer;
}

/**
 * Create line segment group layer containing both bike and pedestrian layers
 */
export function createLineSegmentGroupLayer(modelCountsBy: string = "cost-benefit", selectedYear: number = 2023): GroupLayer {
  const bikeLayer = createLineSegmentLayer(modelCountsBy, selectedYear, 'bike');
  const pedLayer = createLineSegmentLayer(modelCountsBy, selectedYear, 'ped');
  
  // Initially show both layers (visibility controlled by UI toggles)
  bikeLayer.visible = true;
  pedLayer.visible = true;

  const groupLayer = new GroupLayer({
    title: "Modeled Volume Line Segments",
    layers: [bikeLayer, pedLayer],
    visibilityMode: "independent",
    visible: false, // Initially hidden, will be shown when zoomed in
  });

  return groupLayer;
}

/**
 * Optimal zoom level threshold for switching between hexagons and line segments
 * Based on analysis of typical street network density and visibility
 */
export const ZOOM_THRESHOLD_FOR_LINE_SEGMENTS = 16;

/**
 * Check if current zoom level should show line segments instead of hexagons
 */
export function shouldShowLineSegments(zoomLevel: number): boolean {
  return zoomLevel >= ZOOM_THRESHOLD_FOR_LINE_SEGMENTS;
}

/**
 * Apply data-driven styling to line segment layers using volume data
 * This function queries the data service and applies appropriate renderers
 */
export async function applyVolumeDataStyling(
  lineSegmentLayer: FeatureLayer, 
  modeledVolumeService: any, 
  modelCountsBy: string, 
  selectedYear: number, 
  countType: 'bike' | 'ped',
  mapView: any
): Promise<void> {
  try {
    // Create a configuration for the data service
    const config = {
      dataSource: 'dillon' as const,
      countTypes: [countType],
      dateRange: { start: new Date(selectedYear, 0, 1), end: new Date(selectedYear, 11, 31) },
      year: selectedYear,
      modelCountsBy: modelCountsBy as 'cost-benefit' | 'strava-bias'
    };

    // Get the volume data with current map extent
    const volumeData = await modeledVolumeService.getTrafficLevelDataWithGeometry(
      mapView, 
      config, 
      mapView.extent
    );

    // For now, apply a simple renderer based on the volume level distribution
    // This will be enhanced when we have better data join capabilities
    const renderer = createEnhancedLineRenderer(volumeData);
    lineSegmentLayer.renderer = renderer;

    console.log(`✅ Applied volume data styling to ${countType} line layer for ${modelCountsBy} model`);
  } catch (error) {
    console.warn(`⚠️ Could not apply volume data styling to line layer:`, error);
    // Keep the basic renderer as fallback
  }
}

/**
 * Create an enhanced line renderer that incorporates volume data patterns
 */
function createEnhancedLineRenderer(volumeData: any): SimpleRenderer {
  // Determine the dominant volume level based on the data
  const { low, medium, high } = volumeData.details || { low: { miles: 0 }, medium: { miles: 0 }, high: { miles: 0 } };
  const totalMiles = low.miles + medium.miles + high.miles;
  
  let dominantColor = getVolumeLevelColor('medium'); // Default to medium
  
  if (totalMiles > 0) {
    if (high.miles / totalMiles > 0.4) {
      dominantColor = getVolumeLevelColor('high');
    } else if (low.miles / totalMiles > 0.6) {
      dominantColor = getVolumeLevelColor('low');
    }
  }

  // Create a graduated symbol renderer for line segments
  const symbol = new SimpleLineSymbol({
    color: dominantColor,
    width: 3,
    style: "solid",
    cap: "round",
    join: "round"
  });

  return new SimpleRenderer({
    symbol: symbol
  });
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