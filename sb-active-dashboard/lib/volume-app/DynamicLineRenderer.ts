/**
 * Dynamic Line Renderer - Clean, Fast Approach
 * Uses enriched line segment attributes for instant styling
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import { getVolumeLevelColor } from "../../ui/theme/volumeLevelColors";

interface DynamicRenderConfig {
  modelCountsBy: 'cost-benefit' | 'strava-bias';
  selectedYear: number;
  countType: 'bike' | 'ped';
}

/**
 * Get the attribute field name based on config
 */
function getAttributeFieldName(config: DynamicRenderConfig): string {
  const modelPrefix = config.modelCountsBy === 'cost-benefit' ? 'cos' : 'str';
  return `${modelPrefix}_${config.selectedYear}_${config.countType}`;
}

/**
 * Create volume level symbol
 */
function createVolumeSymbol(volumeLevel: 'Low' | 'Medium' | 'High'): SimpleLineSymbol {
  const colorMap = {
    'Low': getVolumeLevelColor('low'),
    'Medium': getVolumeLevelColor('medium'),
    'High': getVolumeLevelColor('high')
  };

  const widthMap = {
    'Low': 2,
    'Medium': 3,
    'High': 4
  };

  return new SimpleLineSymbol({
    color: colorMap[volumeLevel],
    width: widthMap[volumeLevel],
    style: "solid",
    cap: "round",
    join: "round"
  });
}

/**
 * INSTANT STYLING: Apply dynamic renderer to line layer
 */
export async function applyDynamicLineRenderer(
  lineLayer: FeatureLayer,
  config: DynamicRenderConfig
): Promise<void> {
  try {
    const fieldName = getAttributeFieldName(config);

    // Create unique value renderer
    const renderer = new UniqueValueRenderer({
      field: fieldName,
      defaultSymbol: new SimpleLineSymbol({
        color: '#cccccc',
        width: 1,
        style: "solid"
      }),
      uniqueValueInfos: [
        {
          value: "Low",
          symbol: createVolumeSymbol('Low'),
          label: "Low Volume (< 50)"
        },
        {
          value: "Medium", 
          symbol: createVolumeSymbol('Medium'),
          label: "Medium Volume (50-200)"
        },
        {
          value: "High",
          symbol: createVolumeSymbol('High'), 
          label: "High Volume (≥ 200)"
        }
      ],
      legendOptions: {
        title: `${config.countType === 'bike' ? 'Bicycle' : 'Pedestrian'} Volume (${config.selectedYear})`
      }
    });

    // Apply renderer instantly
    lineLayer.renderer = renderer;

  } catch (error) {
    console.error('❌ Error applying dynamic renderer:', error);
  }
}

/**
 * Create line segment layer with proper configuration
 */
export function createDynamicLineLayer(): FeatureLayer {
  return new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer/0",
    title: "Line Segments (Dynamic)",
    visible: false,
    outFields: [
      // Only include fields that actually exist in the service
      // Cost-benefit attributes
      "cos_2019_bike", "cos_2019_ped",
      "cos_2020_bike", "cos_2020_ped", 
      "cos_2021_bike", "cos_2021_ped",
      "cos_2022_bike", "cos_2022_ped",
      "cos_2023_bike", "cos_2023_ped",
      // Strava-bias attributes
      "str_2023_bike", "str_2023_ped"
    ],
    popupTemplate: {
      title: "Street Segment",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "OBJECTID", label: "Segment ID" }
          ]
        }
      ]
    }
  });
}

/**
 * Get available years for a model type
 */
export function getAvailableYears(modelCountsBy: 'cost-benefit' | 'strava-bias'): number[] {
  if (modelCountsBy === 'cost-benefit') {
    return [2019, 2020, 2021, 2022, 2023];
  } else {
    return [2023]; // Only 2023 available for strava-bias
  }
}

/**
 * Check if a configuration is supported
 */
export function isConfigurationSupported(config: DynamicRenderConfig): boolean {
  const availableYears = getAvailableYears(config.modelCountsBy);
  return availableYears.includes(config.selectedYear);
}
