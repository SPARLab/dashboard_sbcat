"use client";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import Graphic from "@arcgis/core/Graphic";
import Field from "@arcgis/core/layers/support/Field";
import { RawIncidentRenderer } from "./renderers/RawIncidentRenderer";
import { SafetyFilters } from "./types";
import { generateIncidentPopupContent } from "../../ui/safety-app/utils/popupContentGenerator";

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
export async function createEnrichedSafetyIncidentsLayer(dateRange?: { start: Date; end: Date }): Promise<FeatureLayer> {
  
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
    // Build date range filter if provided
    let dateFilter = "1=1";
    if (dateRange) {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      dateFilter = `timestamp >= TIMESTAMP '${startDate} 00:00:00' AND timestamp <= TIMESTAMP '${endDate} 23:59:59'`;
    }

    // Query incidents with date range filtering and pagination
    const allIncidents: any[] = [];
    let hasMore = true;
    let offset = 0;
    const pageSize = 2000;
    
    while (hasMore) {
      const incidentsQuery = incidentsLayer.createQuery();
      incidentsQuery.where = dateFilter;
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

    }
    


    // Query all parties with pagination

    const allParties: any[] = [];
    hasMore = true;
    offset = 0;
    
    while (hasMore) {
      const partiesQuery = partiesLayer.createQuery();
      partiesQuery.where = "1=1";
      partiesQuery.outFields = ["incident_id", "injury_severity", "bicycle_type"];
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
    
    // Create a map of incident_id to hasEbike flag
    const ebikeMap = new Map<number, boolean>();
    
    // Log unique severity values to debug
    const uniqueSeverities = new Set<string>();
    
    allParties.forEach(partyFeature => {
      const incidentId = partyFeature.attributes.incident_id;
      const severity = partyFeature.attributes.injury_severity || '';
      const bicycleType = partyFeature.attributes.bicycle_type;
      
      uniqueSeverities.add(severity);
      
      // Use severity values directly from database - no normalization needed
      // Expected values: 'Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown'
      let normalizedSeverity = severity.trim();
      
      // Only handle empty/null values
      if (!normalizedSeverity) {

        normalizedSeverity = 'Unknown';
      }
      
      // Update map with the most severe injury for this incident
      const currentSeverity = severityMap.get(incidentId);
      if (!currentSeverity || getSeverityPriority(normalizedSeverity) < getSeverityPriority(currentSeverity)) {
        severityMap.set(incidentId, normalizedSeverity);
      }
      
      // Check if this is an e-bike party
      if (bicycleType && bicycleType.toLowerCase() === 'ebike') {
        ebikeMap.set(incidentId, true);
        // Removed cluttering debug log
      }
    });
    


    // Create enriched graphics with maxSeverity field
    // Log e-bike incidents found
    const ebikeIds = Array.from(ebikeMap.keys()).sort();
    
    // CRITICAL: Initialize ALL incidents with hasEbike = 0 first
    let ebikeDebugCount = 0;
    
    const enrichedGraphics: Graphic[] = [];
    const ebikeIncidentsProcessed: number[] = [];
    
    
    allIncidents.forEach(incidentFeature => {
      const attributes = { ...incidentFeature.attributes };
      const incidentId = attributes.id;
      
      // Add maxSeverity field
      attributes.maxSeverity = severityMap.get(incidentId) || '';
      
      // Add hasEbike field (convert boolean to 0/1 for small-integer field type)
      // CRITICAL FIX: Explicitly check if the incident is in the ebikeMap
      const isEbike = ebikeMap.has(incidentId) && ebikeMap.get(incidentId) === true;
      attributes.hasEbike = isEbike ? 1 : 0;
      
      if (isEbike) {
        ebikeDebugCount++;
      }
      
      // Debug e-bike incidents
      if (ebikeMap.get(incidentId)) {
        ebikeIncidentsProcessed.push(incidentId);
        // Commented out to reduce console noise
      }
      
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

    // E-bike processing summary for validation
    const ebikeGraphics = enrichedGraphics.filter(g => g.attributes.hasEbike === 1);
    
    // CRITICAL CHECK: If we have more than expected e-bikes, something is wrong
    if (ebikeGraphics.length > ebikeMap.size) {
      console.error(`⚠️ ERROR: ${ebikeGraphics.length} graphics have hasEbike=1 but only ${ebikeMap.size} should!`);
    }
    
    // Debug: Check a sample of hasEbike values
    const sampleGraphics = enrichedGraphics.slice(0, 10);
    
    // Log sample of severity mappings
    const sampleMappings = enrichedGraphics.slice(0, 5).map(g => ({
      id: g.attributes.id,
      maxSeverity: g.attributes.maxSeverity,
      dataSource: g.attributes.data_source
    }));

    
    // Log distribution of severity types
    const severityDistribution = enrichedGraphics.reduce((acc, g) => {
      const severity = g.attributes.maxSeverity;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);


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
    new Field({ name: "maxSeverity", alias: "Maximum Severity", type: "string" }), // NEW FIELD
    // Additional fields needed by sidebar components
    new Field({ name: "loc_desc", alias: "Location Description", type: "string" }),
    new Field({ name: "incident_date", alias: "Incident Date", type: "date" }),
    new Field({ name: "bike_traffic", alias: "Bike Traffic", type: "string" }),
    new Field({ name: "ped_traffic", alias: "Pedestrian Traffic", type: "string" }),
    new Field({ name: "severity", alias: "Severity", type: "string" }),
    new Field({ name: "hasEbike", alias: "Has E-bike", type: "small-integer" }) // E-BIKE FIELD
  ];

  // Create popup template for safety incidents
  const popupTemplate = {
    title: "Safety Incident Details",
    content: async ({ graphic }: { graphic: __esri.Graphic }) => {
      return await generateIncidentPopupContent(graphic.attributes);
    }
  };

  // Create the enriched feature layer
  const enrichedLayer = new FeatureLayer({
    source: enrichedGraphics,
    fields: layerFields,
    objectIdField: "OBJECTID",
    title: "Safety Incidents (Enriched)",
    renderer: RawIncidentRenderer.createSeverityRenderer(),
    opacity: 1.0,
    outFields: ["*"],
    popupTemplate: popupTemplate
  });


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
  // Create the enriched layer with maxSeverity field (no date filtering for this legacy function)
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
    
    // SafetyLayerService initialized and ready
  }

  /**
   * Check if the service is ready to apply filters
   */
  isReady(): boolean {
    return this.safetyLayerView !== null;
  }

  /**
   * Apply filtering based on selected data sources using FeatureFilter
   * This is the key improvement - no server requests, instant filtering
   */
  applyDataSourceFilter(dataSources: ('SWITRS' | 'BikeMaps.org')[]): void {
    if (!this.safetyLayerView) {
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

  }

  /**
   * Apply additional filters (severity, conflict type, time of day, etc.) while preserving data source filter
   */
  applyAdditionalFilters(filters: {
    dataSources: ('SWITRS' | 'BikeMaps.org')[];
    severityTypes?: ('Fatal' | 'Severe Injury' | 'Other Injury' | 'Near-miss')[];
    conflictTypes?: string[];
    dateRange?: { start: Date; end: Date };
    timeOfDay?: {
      enabled: boolean;
      periods: ('morning' | 'afternoon' | 'evening')[];
    };
    weekdayFilter?: {
      enabled: boolean;
      type: 'weekdays' | 'weekends';
    };
    ebikeMode?: boolean;
  }): void {
    if (!this.safetyLayerView) {
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
    } else {

    }
    // If both sources selected, no need to add data source filter

    // Severity filter
    if (filters.severityTypes !== undefined) {

      
      if (filters.severityTypes.length === 0) {
        // If no severity types selected, show nothing

        whereClauses.push('1=0');
      } else if (filters.severityTypes.length < 5) {
        // Use severity values directly - no special handling needed
        const severityConditions = filters.severityTypes.map(type => `maxSeverity = '${type}'`);
        
        if (severityConditions.length > 0) {
          const severityClause = `(${severityConditions.join(' OR ')})`;

          whereClauses.push(severityClause);
        }
      } else {

      }
    }

    // Conflict type filter
    if (filters.conflictTypes !== undefined) {

      
      if (filters.conflictTypes.length === 0) {
        // If no conflict types selected, show nothing

        whereClauses.push('1=0');
      } else if (filters.conflictTypes.length < 7) {
        // Only add filter if not all conflict types are selected
        const conflictConditions = filters.conflictTypes.map(type => `conflict_type = '${type}'`);
        
        if (conflictConditions.length > 0) {
          const conflictClause = `(${conflictConditions.join(' OR ')})`;

          whereClauses.push(conflictClause);
        }
      } else {

      }
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      // Format dates for ArcGIS TIMESTAMP queries (YYYY-MM-DD HH:MI:SS)
      const startStr = start.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      const endStr = end.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      whereClauses.push(`timestamp >= TIMESTAMP '${startStr}' AND timestamp <= TIMESTAMP '${endStr}'`);

    }

    // Time of day filter
    if (filters.timeOfDay?.enabled && filters.timeOfDay.periods.length > 0) {

      
      if (filters.timeOfDay.periods.length < 3) {
        // Only add filter if not all time periods are selected
        const timeConditions: string[] = [];
        
        filters.timeOfDay.periods.forEach(period => {
          switch (period) {
            case 'morning':
              // Morning: 00:00 to 11:59 (midnight to noon)
              timeConditions.push("EXTRACT(HOUR FROM timestamp) >= 0 AND EXTRACT(HOUR FROM timestamp) < 12");
              break;
            case 'afternoon':
              // Afternoon: 12:00 to 16:59 (noon to 5pm)
              timeConditions.push("EXTRACT(HOUR FROM timestamp) >= 12 AND EXTRACT(HOUR FROM timestamp) < 17");
              break;
            case 'evening':
              // Evening: 17:00 to 23:59 (5pm to midnight)
              timeConditions.push("EXTRACT(HOUR FROM timestamp) >= 17 AND EXTRACT(HOUR FROM timestamp) <= 23");
              break;
          }
        });
        
        if (timeConditions.length > 0) {
          const timeClause = `(${timeConditions.join(' OR ')})`;

          whereClauses.push(timeClause);
        }
      } else {

      }
    }

    // Weekday filter
    if (filters.weekdayFilter?.enabled) {

      
      // Calculate day of week using mathematical approach
      // We'll use a reference date approach: January 1, 2000 was a Saturday (day 7)
      // Formula: MOD((days_since_reference + reference_day_offset), 7) + 1
      // Where: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
      
      let weekdayClause = '';
      if (filters.weekdayFilter.type === 'weekdays') {
        // Weekdays: Monday(2) through Friday(6)
        weekdayClause = "MOD(CAST((timestamp - DATE '2000-01-01') AS INT) + 6, 7) + 1 BETWEEN 2 AND 6";
      } else {
        // Weekends: Saturday(7) and Sunday(1)  
        weekdayClause = "MOD(CAST((timestamp - DATE '2000-01-01') AS INT) + 6, 7) + 1 IN (1, 7)";
      }
      

      whereClauses.push(`(${weekdayClause})`);
    }
    
    // E-bike filter
    if (filters.ebikeMode === true) {
      whereClauses.push("hasEbike = 1");
    }

    // Combine all where clauses
    const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : "1=1";


    // Apply the comprehensive FeatureFilter
    const featureFilter = new FeatureFilter({
      where: finalWhereClause
    });

    this.safetyLayerView.filter = featureFilter;

    
    // DEBUG: After applying filter, query to see what's actually visible
    setTimeout(async () => {
      if (this.safetyLayerView?.layer) {
        const layer = this.safetyLayerView.layer as FeatureLayer;
        const query = layer.createQuery();
        query.where = finalWhereClause;
        query.returnGeometry = false;
        query.outFields = ["id"];
        
        try {
          const result = await layer.queryFeatures(query);
          console.log(`🔎 POST-FILTER CHECK:`, {
            mode: filters.ebikeMode ? 'E-BIKE' : 'ALL',
            incidentsPassingFilter: result.features.length,
            sampleIds: result.features.slice(0, 10).map(f => f.attributes.id).sort(),
            whereClause: finalWhereClause.substring(0, 100) + '...'
          });
          
          // In e-bike mode, check which incidents actually have hasEbike = 1
          if (filters.ebikeMode) {
            const ebikeQuery = layer.createQuery();
            ebikeQuery.where = "hasEbike = 1";
            ebikeQuery.returnGeometry = false;
            ebikeQuery.outFields = ["id", "hasEbike"];
            
            layer.queryFeatures(ebikeQuery).then(ebikeResult => {
              console.log('🔍 E-BIKE FIELD CHECK:', {
                incidentsWithHasEbike1: ebikeResult.features.length,
                ids: ebikeResult.features.map(f => f.attributes.id).sort()
              });
            }).catch(err => {
              console.error('Error checking hasEbike field:', err);
            });
          }
          
          // Check if specific incident 3227 is included
          const has3227 = result.features.some(f => f.attributes.id === 3227 || f.attributes.id === '3227');
          if (!has3227 && !filters.ebikeMode) {
            console.warn('⚠ Incident 3227 is MISSING after switching back to ALL mode!');
          }
        } catch (error) {
          console.error('Error querying filtered results:', error);
        }
      }
    }, 200);
  }

  /**
   * Clear all filters to show all data
   */
  clearFilters(): void {
    if (!this.safetyLayerView) {
      return;
    }

    this.safetyLayerView.filter = null;
  }

  /**
   * Get the layer view for additional operations if needed
   */
  getLayerView(): __esri.FeatureLayerView | null {
    return this.safetyLayerView;
  }
}