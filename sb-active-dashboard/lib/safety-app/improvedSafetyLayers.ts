"use client";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";

// Colors for heatmap visualization
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

/**
 * Creates an improved safety layer structure that supports efficient FeatureFilter-based filtering
 * instead of reloading data when toggling between Police Reports and BikeMaps.org
 */
export async function createImprovedSafetyLayers(): Promise<GroupLayer> {
  // Create the main safety incidents layer with all data
  const safetyIncidentsLayer = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer/0",
    title: "Safety Incidents",
    outFields: ["*"], // Ensure we have all fields available for filtering
    renderer: new HeatmapRenderer({
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
        title: "Safety Incidents",
        minLabel: "Low Risk",
        maxLabel: "High Risk",
      },
    }),
    opacity: 0.6,
  });

  // Create a group layer to contain all safety layers
  const safetyGroupLayer = new GroupLayer({
    layers: [safetyIncidentsLayer],
    title: "Safety Data",
    visibilityMode: "independent",
  });

  return safetyGroupLayer;
}

/**
 * Service class to manage safety layer filtering using FeatureFilter
 * This provides instant filtering without reloading data from the server
 */
export class SafetyLayerService {
  private safetyLayerView: __esri.FeatureLayerView | null = null;
  private mapView: __esri.MapView | null = null;

  /**
   * Initialize the service with the map view and wait for the layer view to be ready
   */
  async initialize(mapView: __esri.MapView, incidentsLayer: FeatureLayer): Promise<void> {
    this.mapView = mapView;

    // Wait for the layer view to be ready
    this.safetyLayerView = await mapView.whenLayerView(incidentsLayer) as __esri.FeatureLayerView;
    
    console.log("✅ SafetyLayerService initialized with layer view");
  }

  /**
   * Apply filtering based on selected data sources using FeatureFilter
   * This is the key improvement - no server requests, instant filtering
   */
  applyDataSourceFilter(dataSources: ('SWITRS' | 'BikeMaps.org')[]): void {
    if (!this.safetyLayerView) {
      console.warn("SafetyLayerService: Layer view not initialized");
      return;
    }

    // Build the where clause based on selected data sources
    let whereClause = "";
    
    if (dataSources.length === 0) {
      // If no data sources selected, hide all features
      whereClause = "1=0";
    } else if (dataSources.length === 2) {
      // If both data sources selected, show all features
      whereClause = "1=1";
    } else {
      // Filter by specific data source
      const sourceConditions = dataSources.map(source => {
        // Adjust field name based on your actual data structure
        // You may need to check what field contains the data source information
        if (source === 'SWITRS') {
          return "data_source = 'SWITRS' OR data_source = 'Police'";
        } else {
          return "data_source = 'BikeMaps.org' OR data_source = 'BikeMaps'";
        }
      });
      whereClause = `(${sourceConditions.join(' OR ')})`;
    }

    // Apply the FeatureFilter - this happens instantly on the client side!
    const featureFilter = new FeatureFilter({
      where: whereClause
    });

    this.safetyLayerView.filter = featureFilter;

    console.log(`🎯 Applied FeatureFilter: ${whereClause}`);
  }

  /**
   * Apply additional filters (severity, conflict type, etc.) while preserving data source filter
   */
  applyAdditionalFilters(filters: {
    dataSources: ('SWITRS' | 'BikeMaps.org')[];
    severityTypes?: string[];
    conflictTypes?: string[];
    dateRange?: { start: Date; end: Date };
  }): void {
    if (!this.safetyLayerView) {
      console.warn("SafetyLayerService: Layer view not initialized");
      return;
    }

    const whereClauses: string[] = [];

    // Data source filter (same as above)
    if (filters.dataSources.length === 0) {
      whereClauses.push("1=0");
    } else if (filters.dataSources.length === 1) {
      const source = filters.dataSources[0];
      if (source === 'SWITRS') {
        whereClauses.push("(data_source = 'SWITRS' OR data_source = 'Police')");
      } else {
        whereClauses.push("(data_source = 'BikeMaps.org' OR data_source = 'BikeMaps')");
      }
    }
    // If both sources selected, no need to add data source filter

    // Severity filter
    if (filters.severityTypes && filters.severityTypes.length > 0) {
      const severityConditions = filters.severityTypes.map(type => `severity = '${type}'`);
      whereClauses.push(`(${severityConditions.join(' OR ')})`);
    }

    // Conflict type filter
    if (filters.conflictTypes && filters.conflictTypes.length > 0) {
      const conflictConditions = filters.conflictTypes.map(type => `conflict_type = '${type}'`);
      whereClauses.push(`(${conflictConditions.join(' OR ')})`);
    }

    // Date range filter
    if (filters.dateRange) {
      const startDate = filters.dateRange.start.toISOString().split('T')[0];
      const endDate = filters.dateRange.end.toISOString().split('T')[0];
      whereClauses.push(`incident_date >= '${startDate}' AND incident_date <= '${endDate}'`);
    }

    // Combine all where clauses
    const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : "1=1";

    // Apply the comprehensive FeatureFilter
    const featureFilter = new FeatureFilter({
      where: finalWhereClause
    });

    this.safetyLayerView.filter = featureFilter;

    console.log(`🎯 Applied comprehensive FeatureFilter: ${finalWhereClause}`);
  }

  /**
   * Clear all filters to show all data
   */
  clearFilters(): void {
    if (!this.safetyLayerView) {
      console.warn("SafetyLayerService: Layer view not initialized");
      return;
    }

    this.safetyLayerView.filter = null;
    console.log("🔄 Cleared all filters");
  }

  /**
   * Get the layer view for additional operations if needed
   */
  getLayerView(): __esri.FeatureLayerView | null {
    return this.safetyLayerView;
  }
}