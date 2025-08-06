/**
 * Raw Incident Renderer
 * Creates point-based visualization for safety incidents with severity-based symbology
 */

import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import { SafetyFilters } from "../types";

export class RawIncidentRenderer {
  /**
   * Create a renderer for raw safety incidents based on severity
   */
  static createSeverityRenderer(): UniqueValueRenderer {
    return new UniqueValueRenderer({
      field: "maxSeverity", // This will be computed from joined parties data
      defaultSymbol: new SimpleMarkerSymbol({
        style: "circle",
        color: [128, 128, 128, 0.8], // Gray for unknown severity
        size: 6,
        outline: {
          color: [255, 255, 255, 0.8],
          width: 1
        }
      }),
      uniqueValueInfos: [
        // Handle both formats: original lowercase and actual Title Case from data
        {
          value: "Fatal",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [0, 0, 0, 0.9], // Black for fatalities
            size: 12,
            outline: {
              color: [255, 255, 255, 1],
              width: 2
            }
          }),
          label: "Fatal"
        },
        {
          value: "fatal",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [0, 0, 0, 0.9], // Black for fatalities
            size: 12,
            outline: {
              color: [255, 255, 255, 1],
              width: 2
            }
          }),
          label: "Fatal"
        },
        {
          value: "Severe Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle", 
            color: [255, 0, 0, 0.8], // Red for severe injury
            size: 10,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1.5
            }
          }),
          label: "Severe Injury"
        },
        {
          value: "severe_injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle", 
            color: [255, 0, 0, 0.8], // Red for severe injury
            size: 10,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1.5
            }
          }),
          label: "Severe Injury"
        },
        {
          value: "Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 140, 0, 0.8], // Orange for injury
            size: 8,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Injury"
        },
        {
          value: "injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 140, 0, 0.8], // Orange for injury
            size: 8,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Injury"
        },
        {
          value: "Property Damage Only",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 215, 0, 0.7], // Gold for property damage
            size: 6,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Property Damage Only"
        },
        {
          value: "property_damage_only",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 215, 0, 0.7], // Gold for property damage
            size: 6,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Property Damage Only"
        },
        {
          value: "", // Near misses (no severity data)
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 255, 0, 0.8], // Yellow for near misses
            size: 5,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Near Miss"
        }
      ]
    });
  }

  /**
   * Create a renderer for incidents by data source
   */
  static createDataSourceRenderer(): UniqueValueRenderer {
    return new UniqueValueRenderer({
      field: "data_source",
      defaultSymbol: new SimpleMarkerSymbol({
        style: "circle",
        color: [128, 128, 128, 0.7],
        size: 6,
        outline: {
          color: [255, 255, 255, 0.8],
          width: 1
        }
      }),
      uniqueValueInfos: [
        {
          value: "SWITRS",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [220, 20, 60, 0.8], // Crimson for SWITRS (official crashes)
            size: 8,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "SWITRS (Official Reports)"
        },
        {
          value: "BikeMaps",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [32, 178, 170, 0.8], // Light sea green for BikeMaps (user reports)
            size: 6,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "BikeMaps (User Reports)"
        }
      ]
    });
  }

  /**
   * Create a renderer for incidents by road user type
   */
  static createRoadUserRenderer(): UniqueValueRenderer {
    return new UniqueValueRenderer({
      field: "primary_road_user", // This would need to be computed
      defaultSymbol: new SimpleMarkerSymbol({
        style: "circle",
        color: [128, 128, 128, 0.7],
        size: 6
      }),
      uniqueValueInfos: [
        {
          value: "bicyclist",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [34, 139, 34, 0.8], // Forest green for bicycle incidents
            size: 8,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Bicycle Incidents"
        },
        {
          value: "pedestrian", 
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [75, 0, 130, 0.8], // Indigo for pedestrian incidents
            size: 8,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Pedestrian Incidents"
        },
        {
          value: "both",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 20, 147, 0.8], // Deep pink for incidents involving both
            size: 8,
            outline: {
              color: [255, 255, 255, 0.8],
              width: 1
            }
          }),
          label: "Multi-Modal Incidents"
        }
      ]
    });
  }

  /**
   * Create a simple renderer for all incidents (when no categorization needed)
   */
  static createSimpleRenderer(filters?: SafetyFilters): SimpleRenderer {
    // Adjust color based on filters
    let color = [220, 20, 60, 0.7]; // Default crimson
    
    if (filters?.roadUser) {
      if (filters.roadUser.includes('bicyclist') && !filters.roadUser.includes('pedestrian')) {
        color = [34, 139, 34, 0.7]; // Green for bicycle-only
      } else if (filters.roadUser.includes('pedestrian') && !filters.roadUser.includes('bicyclist')) {
        color = [75, 0, 130, 0.7]; // Indigo for pedestrian-only
      }
    }

    return new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        style: "circle",
        color: color,
        size: 7,
        outline: {
          color: [255, 255, 255, 0.8],
          width: 1
        }
      })
    });
  }

  /**
   * Create a time-based renderer (for temporal analysis)
   */
  static createTimeBasedRenderer(): UniqueValueRenderer {
    return new UniqueValueRenderer({
      field: "time_period", // This would need to be computed from timestamp
      defaultSymbol: new SimpleMarkerSymbol({
        style: "circle",
        color: [128, 128, 128, 0.7],
        size: 6
      }),
      uniqueValueInfos: [
        {
          value: "peak_morning", // 6-9 AM
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 165, 0, 0.8], // Orange for morning peak
            size: 8
          }),
          label: "Morning Peak (6-9 AM)"
        },
        {
          value: "midday", // 9 AM - 3 PM
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 255, 0, 0.7], // Yellow for midday
            size: 6
          }),
          label: "Midday (9 AM - 3 PM)"
        },
        {
          value: "peak_evening", // 3-7 PM
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 69, 0, 0.8], // Red-orange for evening peak
            size: 8
          }),
          label: "Evening Peak (3-7 PM)"
        },
        {
          value: "night", // 7 PM - 6 AM
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [25, 25, 112, 0.8], // Midnight blue for night
            size: 7
          }),
          label: "Night/Off-Peak (7 PM - 6 AM)"
        }
      ]
    });
  }

  /**
   * Get renderer based on visualization type
   */
  static getRenderer(type: 'severity' | 'data_source' | 'road_user' | 'time' | 'simple', filters?: SafetyFilters) {
    switch (type) {
      case 'severity':
        return this.createSeverityRenderer();
      case 'data_source':
        return this.createDataSourceRenderer();
      case 'road_user':
        return this.createRoadUserRenderer();
      case 'time':
        return this.createTimeBasedRenderer();
      case 'simple':
      default:
        return this.createSimpleRenderer(filters);
    }
  }
}