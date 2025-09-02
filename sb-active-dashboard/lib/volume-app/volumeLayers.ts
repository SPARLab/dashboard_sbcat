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
import { aadtCache } from "../data-services/AADTCacheService";
import CustomContent from "@arcgis/core/popup/content/CustomContent";

// ========================================
// SMART VIEWPORT-BASED LOADING SYSTEM
// ========================================

// Viewport-specific cache for line segments and volume data
const viewportLineCache = new Map<string, Map<number, __esri.Graphic>>();
const viewportVolumeCache = new Map<string, Map<number, string>>();
let isViewportLoadingActive = false;

// Track current viewport extent for cache management
let lastViewportExtent: __esri.Extent | null = null;
const VIEWPORT_CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

interface ViewportCacheEntry {
  data: Map<number, string> | Map<number, __esri.Graphic>;
  timestamp: number;
  extent: __esri.Extent;
}

// Create cache key for viewport-based data
function createViewportCacheKey(
  modelCountsBy: string, 
  selectedYear: number, 
  countType: 'bike' | 'ped', 
  extent: __esri.Extent
): string {
  // Create a simplified extent key for caching
  const extentKey = `${Math.round(extent.xmin)}_${Math.round(extent.ymin)}_${Math.round(extent.xmax)}_${Math.round(extent.ymax)}`;
  return `${modelCountsBy}_${selectedYear}_${countType}_${extentKey}`;
}

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

  // Create enhanced popup template with cached AADT data
  const enrichedAADTContent = new CustomContent({
    outFields: ["*"],
    creator: (event) => {
      if (!event?.graphic) {
        return "No site data available.";
      }

      const siteId = event.graphic.attributes.id;
      const siteName = event.graphic.attributes.name || `Site ${siteId}`;
      const locality = event.graphic.attributes.locality || '';
      const dataSource = event.graphic.attributes.source || '';
      
      // Get cached AADT data
      const siteData = aadtCache.getSiteData(siteId);
      
      if (!siteData || siteData.yearlyData.length === 0) {
        return `
          <div style="padding: 8px 0;">
            <h4 style="margin: 0 0 8px 0; color: #666;">Survey History</h4>
            <p style="margin: 0; color: #999; font-style: italic;">No AADT data available for this site.</p>
          </div>
        `;
      }

      // Sort data by year (most recent first) and count type
      const sortedData = siteData.yearlyData.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Year descending
        return a.countType.localeCompare(b.countType); // Then by count type
      });
      
      // Build survey timeline - one row per observation period
      const timelineRows = sortedData.map(data => {
        const dataTypeIcon = data.countType === 'bike' ? '🚴' : '🚶';
        const dataTypeName = data.countType === 'bike' ? 'Biking' : 'Walking';
        
        let periodText = '';
        if (data.startDate && data.endDate) {
          const start = new Date(data.startDate).toLocaleDateString('en-US');
          const end = new Date(data.endDate).toLocaleDateString('en-US');
          periodText = start === end ? start : `${start} - ${end}`;
        } else if (data.startDate) {
          periodText = new Date(data.startDate).toLocaleDateString('en-US');
        }

        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 6px 8px; font-weight: 500;">${data.year}</td>
            <td style="padding: 6px 8px; font-size: 12px;">${dataTypeIcon} ${dataTypeName}</td>
            <td style="padding: 6px 8px; font-size: 11px; color: #666;">${periodText}</td>
          </tr>
        `;
      }).join('');

      // Group data by year for AADT table
      const dataByYear = new Map<number, { bike?: any; ped?: any }>();
      siteData.yearlyData.forEach(data => {
        if (!dataByYear.has(data.year)) {
          dataByYear.set(data.year, {});
        }
        dataByYear.get(data.year)![data.countType] = data;
      });

      const years = Array.from(dataByYear.keys()).sort((a, b) => b - a); // Most recent first

      // Build AADT summary table
      const aadtRows = years.map(year => {
        const yearData = dataByYear.get(year)!;
        const bikeData = yearData.bike;
        const pedData = yearData.ped;
        
        let bikeAADT = bikeData ? `${Math.round(bikeData.allAadt)}` : '-';
        let pedAADT = pedData ? `${Math.round(pedData.allAadt)}` : '-';
        
        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 4px 8px; font-weight: 500;">${year}</td>
            <td style="padding: 4px 8px; text-align: center;">${bikeAADT}</td>
            <td style="padding: 4px 8px; text-align: center;">${pedAADT}</td>
          </tr>
        `;
      }).join('');

      // Calculate observation periods by type
      const bikeObservations = siteData.yearlyData.filter(d => d.countType === 'bike').length;
      const pedObservations = siteData.yearlyData.filter(d => d.countType === 'ped').length;
      
      // Format survey date range
      const firstSurvey = siteData.firstSurvey ? new Date(siteData.firstSurvey).getFullYear() : 'Unknown';
      const lastSurvey = siteData.lastSurvey ? new Date(siteData.lastSurvey).getFullYear() : 'Unknown';
      const surveyRange = firstSurvey === lastSurvey ? `${firstSurvey}` : `${firstSurvey} - ${lastSurvey}`;

      // Build observation period summary
      let observationSummary = [];
      if (bikeObservations > 0) {
        observationSummary.push(`🚴 ${bikeObservations} biking period${bikeObservations !== 1 ? 's' : ''}`);
      }
      if (pedObservations > 0) {
        observationSummary.push(`🚶 ${pedObservations} walking period${pedObservations !== 1 ? 's' : ''}`);
      }

      return `
        <div style="padding: 0; max-height: 700px; overflow-y: auto;">
          <div style="margin-bottom: 12px;">
            <h4 style="margin: 0 0 6px 0; color: #333;">Site Information</h4>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tbody>
                <tr>
                  <th style="padding: 2px 8px 2px 0; text-align: left; font-weight: 500; color: #666; width: 30%;">Location</th>
                  <td style="padding: 2px 0; font-size: 13px;">${siteName}</td>
                </tr>
                ${locality ? `<tr>
                  <th style="padding: 2px 8px 2px 0; text-align: left; font-weight: 500; color: #666;">Locality</th>
                  <td style="padding: 2px 0; font-size: 13px;">${locality}</td>
                </tr>` : ''}
                <tr>
                  <th style="padding: 2px 8px 2px 0; text-align: left; font-weight: 500; color: #666;">Data Source</th>
                  <td style="padding: 2px 0; font-size: 13px;">${dataSource}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div id="survey-summary" style="margin-bottom: 12px;">
            <h4 style="margin: 0 0 4px 0; color: #333;">Survey Summary</h4>
            <p style="margin: 0; font-size: 13px; color: #666;">
              <strong>${siteData.totalObservationPeriods}</strong> total observation period${siteData.totalObservationPeriods !== 1 ? 's' : ''} 
              from <strong>${surveyRange}</strong>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #888;">
              ${observationSummary.join(' • ')}
            </p>
          </div>

          <div style="margin-bottom: 12px;">
            <h4 style="margin: 0 0 6px 0; color: #333;">Survey Timeline</h4>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="padding: 4px 8px; text-align: left; font-weight: 600;">Year</th>
                  <th style="padding: 4px 8px; text-align: left; font-weight: 600;">Data Types</th>
                  <th style="padding: 4px 8px; text-align: left; font-weight: 600;">Period</th>
                </tr>
              </thead>
              <tbody>
                ${timelineRows}
              </tbody>
            </table>
          </div>

          <div>
            <h4 style="margin: 0 0 6px 0; color: #333;">Average Annual Daily Volume (AADV)</h4>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="padding: 4px 8px; text-align: left; font-weight: 600;">Year</th>
                  <th style="padding: 4px 8px; text-align: center; font-weight: 600;">🚴 Biking</th>
                  <th style="padding: 4px 8px; text-align: center; font-weight: 600;">🚶 Walking</th>
                </tr>
              </thead>
              <tbody>
                ${aadtRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },
  });

  const popupTemplate = {
    title: "Count Site: {name}",
    content: [enrichedAADTContent],
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
export function createHexagonLayer(modelCountsBy: string = "cost-benefit", selectedYear: number = 2023, countType: 'bike' | 'ped' = 'bike') {
  // Determine field names based on model type and year
  const getFieldName = (countType: 'bike' | 'ped') => {
    if (modelCountsBy === "cost-benefit") {
      return `cos_${selectedYear}_${countType}`;
    } else if (modelCountsBy === "strava-bias") {
      return `str_${selectedYear}_${countType}`;
    }
    return `cos_${selectedYear}_${countType}`; // fallback
  };

  const fieldName = getFieldName(countType);
  const title = countType === 'bike' ? "Modeled Biking Volumes" : "Modeled Walking Volumes";
  const layerId = countType === 'bike' ? "AADBT" : "AADPT";
  
  const hexagonTile = new VectorTileLayer({
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
          id: layerId,
          type: "fill",
          source: "esri",
          "source-layer": "HexagonAADT",
          layout: {},
          paint: {
            "fill-color": [
              "match",
              ["get", fieldName],
              "High", getVolumeLevelColor('high', false),
              "Medium", getVolumeLevelColor('medium', false), 
              "Low", getVolumeLevelColor('low', false),
              "#cccccc"  // fallback color if value doesn't match
            ],
            "fill-outline-color": "#6E6E6E",
            "fill-opacity": 1.0,
          },
        },
      ],
    },
    title: title,
    visible: true,
    opacity: 1,
  });

  // Create a group layer for the single hexagon layer (for consistency with existing code)
  const hexagonGroupLayer = new GroupLayer({
    layers: [hexagonTile],
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
export const ZOOM_PRELOAD_THRESHOLD = 13; // Start pre-loading at zoom 13

/**
 * SMART LOADING: Pre-load line segments for current viewport at zoom 13
 * This ensures smooth experience when user reaches zoom 16
 */
export async function preloadViewportLines(
  mapView: __esri.MapView,
  modelCountsBy: string,
  selectedYear: number,
  countType: 'bike' | 'ped'
): Promise<void> {
  if (isViewportLoadingActive) {
    console.log('🔄 Viewport loading already in progress...');
    return;
  }

  const currentExtent = mapView.extent;
  const cacheKey = createViewportCacheKey(modelCountsBy, selectedYear, countType, currentExtent);

  // Check if we already have this viewport cached
  if (viewportLineCache.has(cacheKey) && viewportVolumeCache.has(cacheKey)) {
    console.log('📦 Viewport data already cached');
    return;
  }

  isViewportLoadingActive = true;
  console.log(`🎯 SMART LOADING: Pre-loading lines for viewport at zoom ${mapView.zoom}`);

  try {
    // Step 1: Query line segments within current viewport
    const geometryLayer = new FeatureLayer({
      url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer/0",
      outFields: ["edgeuid"]
    });

    const geometryQuery = geometryLayer.createQuery();
    geometryQuery.geometry = currentExtent;
    geometryQuery.spatialRelationship = "intersects";
    geometryQuery.where = "edgeuid IS NOT NULL AND edgeuid > 0";
    geometryQuery.outFields = ["edgeuid"];
    geometryQuery.returnGeometry = false;

    const geometryResult = await geometryLayer.queryFeatures(geometryQuery);
    console.log(`🎯 Found ${geometryResult.features.length} line segments in viewport`);

    if (geometryResult.features.length === 0) {
      isViewportLoadingActive = false;
      return;
    }

    // Step 2: Get volume data for these specific segments
    const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";
    const tableLayerNumber = modelCountsBy === 'cost-benefit' 
      ? (countType === 'bike' ? 1 : 2) 
      : (countType === 'bike' ? 3 : 4);

    const dataTableLayer = new FeatureLayer({
      url: `${BASE_URL}/${tableLayerNumber}`,
      outFields: ["edge_uid", "aadt_bin", "model_year"]
    });

    // Create WHERE clause for only the segments in viewport
    const edgeIds = geometryResult.features
      .map(f => f.attributes.edgeuid)
      .filter(id => id != null);

    if (edgeIds.length === 0) {
      isViewportLoadingActive = false;
      return;
    }

    const whereClause = `model_year = ${selectedYear} AND aadt_bin IS NOT NULL AND edge_uid IN (${edgeIds.join(',')})`;

    const volumeQuery = dataTableLayer.createQuery();
    volumeQuery.where = whereClause;
    volumeQuery.outFields = ["edge_uid", "aadt_bin"];
    volumeQuery.returnGeometry = false;

    const volumeResult = await dataTableLayer.queryFeatures(volumeQuery);

    // Step 3: Cache the results
    const lineSegmentMap = new Map<number, __esri.Graphic>();
    geometryResult.features.forEach(feature => {
      const edgeuid = feature.attributes.edgeuid;
      if (edgeuid) {
        lineSegmentMap.set(edgeuid, feature);
      }
    });

    const volumeDataMap = new Map<number, string>();
    volumeResult.features.forEach(feature => {
      const edge_uid = feature.attributes.edge_uid;
      const aadtBin = feature.attributes.aadt_bin;
      if (edge_uid && aadtBin) {
        volumeDataMap.set(edge_uid, aadtBin);
      }
    });

    // Cache both datasets
    viewportLineCache.set(cacheKey, lineSegmentMap);
    viewportVolumeCache.set(cacheKey, volumeDataMap);
    lastViewportExtent = currentExtent;

    console.log(`✅ SMART LOADING: Cached ${lineSegmentMap.size} line segments and ${volumeDataMap.size} volume records for viewport`);

  } catch (error) {
    console.error('❌ Error pre-loading viewport lines:', error);
  } finally {
    isViewportLoadingActive = false;
  }
}

/**
 * INSTANT DISPLAY: Apply styling using pre-loaded viewport data
 */
export async function applyViewportStyling(
  lineSegmentLayer: FeatureLayer,
  mapView: __esri.MapView,
  modelCountsBy: string,
  selectedYear: number,
  countType: 'bike' | 'ped'
): Promise<void> {
  const currentExtent = mapView.extent;
  const cacheKey = createViewportCacheKey(modelCountsBy, selectedYear, countType, currentExtent);

  // Check if we have cached data for this viewport
  const cachedLines = viewportLineCache.get(cacheKey);
  const cachedVolume = viewportVolumeCache.get(cacheKey);

  if (!cachedLines || !cachedVolume) {
    console.log('📥 No cached viewport data, loading now...');
    await preloadViewportLines(mapView, modelCountsBy, selectedYear, countType);
    return applyViewportStyling(lineSegmentLayer, mapView, modelCountsBy, selectedYear, countType);
  }

  console.log(`⚡ INSTANT: Applying styling from cached viewport data (${cachedLines.size} segments)`);
  const startTime = performance.now();

  try {
    // Create unique value infos for renderer
    const uniqueValueInfos: any[] = [];

    cachedLines.forEach((feature, edgeuid) => {
      const volumeLevel = cachedVolume.get(edgeuid);

      if (volumeLevel) {
        let color = '#888888';
        let label = 'Unknown Volume';

        switch (volumeLevel) {
          case 'Low':
            color = getVolumeLevelColor('low');
            label = 'Low Volume (< 50)';
            break;
          case 'Medium':
            color = getVolumeLevelColor('medium');
            label = 'Medium Volume (50-200)';
            break;
          case 'High':
            color = getVolumeLevelColor('high');
            label = 'High Volume (≥ 200)';
            break;
        }

        uniqueValueInfos.push({
          value: edgeuid,
          symbol: new SimpleLineSymbol({
            color: color,
            width: 3,
            style: "solid",
            cap: "round",
            join: "round"
          }),
          label: label
        });
      }
    });

    // Apply the renderer
    const renderer = new UniqueValueRenderer({
      field: "edgeuid",
      defaultSymbol: new SimpleLineSymbol({
        color: '#cccccc',
        width: 1,
        style: "solid"
      }),
      uniqueValueInfos: uniqueValueInfos,
      legendOptions: {
        title: "Volume Level"
      }
    });

    lineSegmentLayer.renderer = renderer;

    const endTime = performance.now();
    console.log(`⚡ INSTANT: Applied viewport styling in ${Math.round(endTime - startTime)}ms (${uniqueValueInfos.length} styled segments)`);

  } catch (error) {
    console.error('❌ Error applying viewport styling:', error);
  }
}

/**
 * Clear viewport cache (useful for debugging)
 */
export function clearViewportCache(): void {
  viewportLineCache.clear();
  viewportVolumeCache.clear();
  lastViewportExtent = null;
  console.log('🗑️ Cleared viewport cache');
}

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