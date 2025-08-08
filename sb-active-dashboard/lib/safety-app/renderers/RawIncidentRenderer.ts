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
        color: [128, 128, 128, 1], // Gray for unknown severity
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
            color: [0, 0, 0, 1], // Black for fatalities
            size: 12,
            outline: { color: [255, 255, 255, 1], width: 2 }
          }),
          label: "Fatality"
        },
        {
          value: "Severe Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle", 
            color: [255, 0, 0, 1], // Red for severe injury
            size: 10,
            outline: { color: [255, 255, 255, 1], width: 1.5 }
          }),
          label: "Severe Injury"
        },
        {
          value: "Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 165, 0, 1], // Orange for injury
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1 }
          }),
          label: "Injury"
        },
        {
          value: "No Injury",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [34, 197, 94, 1], // Green for no injury
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1 }
          }),
          label: "No Injury"
        },
        {
          value: "Unknown",
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [128, 128, 128, 1], // Gray for unknown
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