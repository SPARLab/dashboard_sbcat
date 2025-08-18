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
      field: "maxSeverity", // This field is computed from joined parties data
      defaultSymbol: new SimpleMarkerSymbol({
        style: "circle",
        color: [153, 153, 153, 1], // Gray (#999999) for unknown severity
        size: 6,
        outline: {
          color: [255, 255, 255, 1],
          width: 1
        }
      }),
      uniqueValueInfos: [
        {
          value: "Fatality",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [0, 0, 0, 1], // Black (#000000) for fatalities
            size: 12,
            outline: { color: [255, 255, 255, 1], width: 2 }
          }),
          label: "Fatality"
        },
        {
          value: "Severe Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle", 
            color: [213, 94, 0, 1], // Vermilion (#D55E00) for severe injury
            size: 10,
            outline: { color: [255, 255, 255, 1], width: 1.5 }
          }),
          label: "Severe Injury"
        },
        {
          value: "Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [230, 159, 0, 1], // Orange (#E69F00) for injury
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1 }
          }),
          label: "Injury"
        },
        {
          value: "No Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [0, 114, 178, 1], // Blue (#0072B2) for no injury
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1 }
          }),
          label: "No Injury"
        },
        {
          value: "Unknown",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [153, 153, 153, 1], // Gray (#999999) for unknown
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1 }
          }),
          label: "Unknown"
        }
      ]
    });
  }

  /**
   * Get the appropriate renderer based on the specified type
   */
  static getRenderer(type: 'severity' | 'simple', filters?: SafetyFilters) {
    switch (type) {
      case 'severity':
        return this.createSeverityRenderer();
      default:
        // Fallback to a simple renderer if needed
        return new SimpleRenderer({
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [128, 128, 128, 1],
            size: 6,
            outline: {
              color: [255, 255, 255, 1],
              width: 1
            }
          })
        });
    }
  }
}