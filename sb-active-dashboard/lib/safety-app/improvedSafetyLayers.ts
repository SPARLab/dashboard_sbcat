"use client";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import Graphic from "@arcgis/core/Graphic";
import Field from "@arcgis/core/layers/support/Field";
import { RawIncidentRenderer } from "./renderers/RawIncidentRenderer";
import { SafetyFilters } from "./types";

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
 * Creates an enriched safety incidents layer with maxSeverity field computed from parties data
 * This enables efficient client-side filtering on severity levels
 */
export async function createEnrichedSafetyIncidentsLayer(): Promise<FeatureLayer> {
  console.log("[DEBUG] Creating enriched safety incidents layer with maxSeverity field...");
  
  // Initialize the source layers
  const incidentsLayer = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer/0",
    outFields: ["*"]
  });
  
  const partiesLayer = new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer/1",
    outFields: ["*"]
  });

  try {
    // Query all incidents with pagination
    console.log("[DEBUG] Querying incidents...");
    const allIncidents: any[] = [];
    let hasMore = true;
    let offset = 0;
    const pageSize = 2000;
    
    while (hasMore) {
      const incidentsQuery = incidentsLayer.createQuery();
      incidentsQuery.where = "1=1";
      incidentsQuery.outFields = ["*"];
      incidentsQuery.returnGeometry = true;
      incidentsQuery.start = offset;
      incidentsQuery.num = pageSize;
      
      const incidentsResult = await incidentsLayer.queryFeatures(incidentsQuery);
      allIncidents.push(...incidentsResult.features);
      
      if (incidentsResult.features.length < pageSize) {
        hasMore = false;
      }
      offset += pageSize;
      console.log(`[DEBUG] Loaded ${allIncidents.length} incidents so far...`);
    }
    
    console.log(`[DEBUG] Total incidents loaded: ${allIncidents.length}`);

    // Query all parties with pagination
    console.log("[DEBUG] Querying parties...");
    const allParties: any[] = [];
    hasMore = true;
    offset = 0;
    
    while (hasMore) {
      const partiesQuery = partiesLayer.createQuery();
      partiesQuery.where = "1=1";
      partiesQuery.outFields = ["incident_id", "injury_severity"];
      partiesQuery.returnGeometry = false;
      partiesQuery.start = offset;
      partiesQuery.num = pageSize;
      
      const partiesResult = await partiesLayer.queryFeatures(partiesQuery);
      allParties.push(...partiesResult.features);
      
      if (partiesResult.features.length < pageSize) {
        hasMore = false;
      }
      offset += pageSize;
    }
    
    console.log(`[DEBUG] Total parties loaded: ${allParties.length}`);

    // Helper function to get severity priority (lower is more severe)
    const getSeverityPriority = (severity: string): number => {
      const priorities: Record<string, number> = {
        'Fatality': 1,       // Highest priority
        'Severe Injury': 2,  
        'Injury': 3,         
        'No Injury': 4,      
        'Unknown': 5         // Lowest priority
      };
      return priorities[severity] || 6;
    };

    // Create a map of incident_id to max severity
    const severityMap = new Map<number, string>();
    
    // Log unique severity values to debug
    const uniqueSeverities = new Set<string>();
    
    allParties.forEach(partyFeature => {
      const incidentId = partyFeature.attributes.incident_id;
      const severity = partyFeature.attributes.injury_severity || '';
      
      uniqueSeverities.add(severity);
      
      // Use severity values directly from database - no normalization needed
      // Expected values: 'Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown'
      let normalizedSeverity = severity.trim();
      
      // Only handle empty/null values
      if (!normalizedSeverity) {
        console.log(`[DEBUG] Empty severity value for incident ${incidentId} -> defaulting to Unknown`);
        normalizedSeverity = 'Unknown';
      }
      
      // Update map with the most severe injury for this incident
      const currentSeverity = severityMap.get(incidentId);
      if (!currentSeverity || getSeverityPriority(normalizedSeverity) < getSeverityPriority(currentSeverity)) {
        severityMap.set(incidentId, normalizedSeverity);
      }
    });
    
    console.log("[DEBUG] Unique severity values found:", Array.from(uniqueSeverities));

    // Create enriched graphics with maxSeverity field
    const enrichedGraphics: Graphic[] = [];
    
    allIncidents.forEach(incidentFeature => {
      const attributes = { ...incidentFeature.attributes };
      const incidentId = attributes.id;
      
      // Add maxSeverity field
      attributes.maxSeverity = severityMap.get(incidentId) || '';
      
      // If no severity found, default to Unknown regardless of data source
      if (!attributes.maxSeverity) {
        attributes.maxSeverity = 'Unknown';
      }
      
      const graphic = new Graphic({
        geometry: incidentFeature.geometry,
        attributes: attributes
      });
      
      enrichedGraphics.push(graphic);
    });

    console.log(`[DEBUG] Created ${enrichedGraphics.length} enriched incident graphics`);
    
    // Log sample of severity mappings
    const sampleMappings = enrichedGraphics.slice(0, 5).map(g => ({
      id: g.attributes.id,
      maxSeverity: g.attributes.maxSeverity,
      dataSource: g.attributes.data_source
    }));
    console.log("[DEBUG] Sample severity mappings:", sampleMappings);
    
    // Log distribution of severity types
    const severityDistribution = enrichedGraphics.reduce((acc, g) => {
      const severity = g.attributes.maxSeverity;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log("[DEBUG] Severity distribution:", severityDistribution);

  // Define fields for the enriched layer (including the new maxSeverity field)
  const layerFields = [
    new Field({ name: "OBJECTID", alias: "Object ID", type: "oid" }),
    new Field({ name: "id", alias: "Incident ID", type: "integer" }),
    new Field({ name: "source_id", alias: "Source ID", type: "string" }),
    new Field({ name: "timestamp", alias: "Timestamp", type: "date" }),
    new Field({ name: "conflict_type", alias: "Conflict Type", type: "string" }),
    new Field({ name: "pedestrian_involved", alias: "Pedestrian Involved", type: "small-integer" }),
    new Field({ name: "bicyclist_involved", alias: "Bicyclist Involved", type: "small-integer" }),
    new Field({ name: "vehicle_involved", alias: "Vehicle Involved", type: "small-integer" }),
    new Field({ name: "data_source", alias: "Data Source", type: "string" }),
    new Field({ name: "strava_id", alias: "Strava ID", type: "integer" }),
    new Field({ name: "maxSeverity", alias: "Maximum Severity", type: "string" }) // NEW FIELD
  ];

  // Create the enriched feature layer
  const enrichedLayer = new FeatureLayer({
    source: enrichedGraphics,
    fields: layerFields,
    objectIdField: "OBJECTID",
    title: "Safety Incidents (Enriched)",
    renderer: RawIncidentRenderer.createSeverityRenderer(),
    opacity: 0.8,
  });

    console.log("[DEBUG] Enriched safety incidents layer created successfully with maxSeverity field");
    return enrichedLayer;
    
  } catch (error) {
    console.error("[ERROR] Failed to create enriched safety incidents layer:", error);
    // Fall back to regular layer without enrichment
    console.log("[FALLBACK] Creating regular safety incidents layer without maxSeverity field");
    return new FeatureLayer({
      url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer/0",
      title: "Safety Incidents",
      outFields: ["*"],
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
  }
}

/**
 * Creates an improved safety layer structure that supports efficient FeatureFilter-based filtering
 * instead of reloading data when toggling between Police Reports and BikeMaps.org
 */
export async function createImprovedSafetyLayers(): Promise<GroupLayer> {
  // Create the enriched layer with maxSeverity field
  const safetyIncidentsLayer = await createEnrichedSafetyIncidentsLayer();

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

    // Log successful initialization
    console.log("✅ SafetyLayerService ready - severity filtering will use data source as proxy");
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
    severityTypes?: ('Fatal' | 'Severe Injury' | 'Other Injury' | 'Near-miss')[];
    conflictTypes?: string[];
    dateRange?: { start: Date; end: Date };
  }): void {
    if (!this.safetyLayerView) {
      console.warn("SafetyLayerService: Layer view not initialized");
      return;
    }

    const whereClauses: string[] = [];

    console.log('[DEBUG] Data sources:', filters.dataSources, 'Length:', filters.dataSources.length);
    console.log('[DEBUG] Severity types:', filters.severityTypes, 'Length:', filters.severityTypes?.length);

    // Data source filter (same as above)
    if (filters.dataSources.length === 0) {
      console.log('[DEBUG] No data sources selected, hiding all');
      whereClauses.push("1=0");
    } else if (filters.dataSources.length === 1) {
      const source = filters.dataSources[0];
      console.log('[DEBUG] Single data source selected:', source);
      if (source === 'SWITRS') {
        whereClauses.push("(data_source = 'SWITRS' OR data_source = 'Police')");
      } else {
        whereClauses.push("(data_source = 'BikeMaps.org' OR data_source = 'BikeMaps')");
      }
    } else {
      console.log('[DEBUG] Multiple data sources selected, no data source filter needed');
    }
    // If both sources selected, no need to add data source filter

    // Severity filter
    if (filters.severityTypes !== undefined) {
      console.log('[DEBUG] Severity filtering - selected types:', filters.severityTypes);
      
      if (filters.severityTypes.length === 0) {
        // If no severity types selected, show nothing
        console.log('[DEBUG] No severity types selected, hiding all incidents');
        whereClauses.push('1=0');
      } else if (filters.severityTypes.length < 5) {
        // Use severity values directly - no special handling needed
        const severityConditions = filters.severityTypes.map(type => `maxSeverity = '${type}'`);
        
        if (severityConditions.length > 0) {
          const severityClause = `(${severityConditions.join(' OR ')})`;
          console.log('[DEBUG] Generated severity clause:', severityClause);
          whereClauses.push(severityClause);
        }
      } else {
        console.log('[DEBUG] All 5 severity types selected, no severity filter needed');
      }
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