/**
 * Safety Incidents Data Service
 * Centralized service for fetching and processing ArcGIS Safety Incidents data
 * Handles three-table structure: Incidents, Parties, and IncidentHeatmapWeights
 */

import Extent from "@arcgis/core/geometry/Extent";
import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import {
  EnrichedSafetyIncident,
  IncidentHeatmapWeight,
  IncidentParty,
  SafetyAnalysisResult,
  SafetyDataQueryResult,
  SafetyFilters,
  SafetyIncident,
  SafetySummaryData
} from "../safety-app/types";
import { hasEbikeParty } from "../safety-app/utils/ebikeDetection";

export class SafetyIncidentsDataService {
  private static readonly BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents_2025/FeatureServer";
  private static readonly INCIDENTS_URL = `${this.BASE_URL}/0`;
  private static readonly PARTIES_URL = `${this.BASE_URL}/1`;

  private static incidentsLayer: FeatureLayer | null = null;
  private static partiesLayer: FeatureLayer | null = null;

  /**
   * Initialize the feature layers
   */
  static initializeLayers(): {
    incidentsLayer: FeatureLayer;
    partiesLayer: FeatureLayer;
  } {
    if (!this.incidentsLayer || this.incidentsLayer.destroyed) {
      this.incidentsLayer = new FeatureLayer({
        url: this.INCIDENTS_URL,
        title: "Safety Incidents",
        outFields: ["*"]
      });
    }

    if (!this.partiesLayer || this.partiesLayer.destroyed) {
      this.partiesLayer = new FeatureLayer({
        url: this.PARTIES_URL,
        title: "Incident Parties",
        outFields: ["*"]
      });
    }

    return {
      incidentsLayer: this.incidentsLayer,
      partiesLayer: this.partiesLayer
    };
  }

  /**
   * Query safety incidents data with spatial and attribute filters
   */
  static async querySafetyData(
    extent?: Extent | Polygon,
    filters?: Partial<SafetyFilters>
  ): Promise<SafetyDataQueryResult> {
    try {
      const { incidentsLayer, partiesLayer } = this.initializeLayers();

      // Build where clause for incidents
      const whereClause = this.buildWhereClause(filters);

      // Query with pagination to get ALL incidents
      const incidents: SafetyIncident[] = [];
      let hasMore = true;
      let offsetId = 0;
      const pageSize = 2000; // Match typical ArcGIS limit
      

      
      while (hasMore) {
        const paginatedQuery = incidentsLayer.createQuery();
        paginatedQuery.where = offsetId > 0 
          ? `(${whereClause}) AND objectid > ${offsetId}`
          : whereClause;
        paginatedQuery.outFields = ["*"];
        paginatedQuery.returnGeometry = true;
        paginatedQuery.orderByFields = ["objectid"];
        paginatedQuery.num = pageSize;
        
        if (extent) {
          // 🔧 TEST: Try the simple approach that works in Volume app
          console.log('🔧 Testing simple approach (like Volume app)...');
          
          // Test 1: Raw polygon without any modifications
          const rawTestQuery = incidentsLayer.createQuery();
          rawTestQuery.where = whereClause;
          rawTestQuery.geometry = extent;
          rawTestQuery.spatialRelationship = "intersects";
          const rawTestCount = await incidentsLayer.queryFeatureCount(rawTestQuery);
          console.log('🔍 Raw polygon query count:', rawTestCount);
          
          let queryGeometry = extent;
          
          if (rawTestCount > 0) {
            console.log('✅ SUCCESS: Raw polygon works! Using it directly.');
            queryGeometry = extent;
          } else if (extent.type === 'polygon') {
            const polygon = extent as Polygon;
            
            // Test 2: Try with only outer ring if multiple rings
            if (polygon.rings.length > 1) {
              console.log('⚠️ Polygon has', polygon.rings.length, 'rings. Trying with outer ring only...');
              try {
                const Polygon = (await import("@arcgis/core/geometry/Polygon")).default;
                const outerRingPolygon = new Polygon({
                  rings: [polygon.rings[0]], // Use only the first (outer) ring
                  spatialReference: polygon.spatialReference
                });
                
                const outerRingTestQuery = incidentsLayer.createQuery();
                outerRingTestQuery.where = whereClause;
                outerRingTestQuery.geometry = outerRingPolygon;
                outerRingTestQuery.spatialRelationship = "intersects";
                const outerRingTestCount = await incidentsLayer.queryFeatureCount(outerRingTestQuery);
                console.log('🔍 Outer ring only query count:', outerRingTestCount);
                
                if (outerRingTestCount > 0) {
                  console.log('✅ SUCCESS: Using outer ring only works!');
                  queryGeometry = outerRingPolygon;
                }
              } catch (error) {
                console.error('Failed to test outer ring:', error);
              }
            }
            
            // Test 3: Try different spatial relationships
            if (rawTestCount === 0) {
              console.log('🔧 Testing different spatial relationships...');
              
              const relationships = ["within", "contains"];
              for (const relationship of relationships) {
                try {
                  const relTestQuery = incidentsLayer.createQuery();
                  relTestQuery.where = whereClause;
                  relTestQuery.geometry = extent;
                  relTestQuery.spatialRelationship = relationship as any;
                  const relTestCount = await incidentsLayer.queryFeatureCount(relTestQuery);
                  console.log(`🔍 "${relationship}" query count:`, relTestCount);
                  
                  if (relTestCount > 0) {
                    console.log(`✅ SUCCESS: "${relationship}" relationship works!`);
                    paginatedQuery.spatialRelationship = relationship as any;
                    break;
                  }
                } catch (error) {
                  console.log(`❌ "${relationship}" relationship failed:`, error);
                }
              }
            }
          }
          
          paginatedQuery.geometry = queryGeometry;
          if (!paginatedQuery.spatialRelationship) {
            paginatedQuery.spatialRelationship = "intersects";
          }
          
          // 🔍 DEBUG: Log spatial query details for each page
          if (offsetId === 0) { // Only log on first page to avoid spam
            console.group('🔍 [SAFETY DEBUG] ArcGIS Spatial Query Details');
            console.log('Query geometry:', extent);
            console.log('Query geometry type:', extent.type);
            console.log('Query geometry spatial reference:', extent.spatialReference?.wkid);
            console.log('Spatial relationship:', paginatedQuery.spatialRelationship);
            console.log('Where clause:', paginatedQuery.where);
            
            if (extent.type === 'polygon') {
              const polygon = extent as Polygon;
              console.log('Polygon extent:', {
                xmin: polygon.extent?.xmin,
                ymin: polygon.extent?.ymin,
                xmax: polygon.extent?.xmax,
                ymax: polygon.extent?.ymax
              });
              
              if (polygon.rings && polygon.rings.length > 0) {
                console.log('First ring coordinates (sample):');
                polygon.rings[0].slice(0, 3).forEach((point, index) => {
                  console.log(`  Point ${index}: [${point[0]}, ${point[1]}]`);
                });
              }
            }
            console.groupEnd();
          }
        }
        
        const pageResult = await incidentsLayer.queryFeatures(paginatedQuery);
        const pageFeatures = pageResult.features;
        
        // 🔍 DEBUG: Log query results for each page
        if (offsetId === 0) { // Only log on first page to avoid spam
          console.group('🔍 [SAFETY DEBUG] ArcGIS Query Results');
          console.log('Features returned in first page:', pageFeatures.length);
          console.log('Page size limit:', pageSize);
          
          if (pageFeatures.length > 0) {
            console.log('Sample feature attributes:', pageFeatures[0].attributes);
            console.log('Sample feature geometry:', pageFeatures[0].geometry);
            console.log('Sample feature geometry spatial reference:', pageFeatures[0].geometry?.spatialReference?.wkid);
          }
          console.groupEnd();
        }
        
        if (pageFeatures.length === 0) {
          hasMore = false;
        } else {
          pageFeatures.forEach(feature => {
            incidents.push(this.mapIncidentFeature(feature));
            offsetId = Math.max(offsetId, feature.attributes.objectid || feature.attributes.OBJECTID || 0);
          });
          
          // If we got less than pageSize, we've reached the end
          if (pageFeatures.length < pageSize) {
            hasMore = false;
          }
        }
        
      }
      

      
      // Also get the total count to verify pagination worked
      const countQuery = incidentsLayer.createQuery();
      countQuery.where = whereClause;
      if (extent) {
        // Use the same geometry and spatial relationship that worked for the main query
        countQuery.geometry = extent;
        countQuery.spatialRelationship = "intersects";
      }
      const totalCount = await incidentsLayer.queryFeatureCount(countQuery);
      
      // 🔍 DEBUG: Log final count verification
      console.group('🔍 [SAFETY DEBUG] Final Count Verification');
      console.log('Total incidents collected via pagination:', incidents.length);
      console.log('Total count from queryFeatureCount:', totalCount);
      console.log('Pagination successful:', totalCount === incidents.length);
      
      // Test query without spatial filter to compare
      if (extent && totalCount === 0) {
        console.log('🔍 Testing query WITHOUT spatial filter...');
        const testQuery = incidentsLayer.createQuery();
        testQuery.where = whereClause;
        // No geometry filter
        const testCount = await incidentsLayer.queryFeatureCount(testQuery);
        console.log('Count WITHOUT spatial filter:', testCount);
        
        if (testCount > 0) {
          console.log('⚠️ SPATIAL FILTER ISSUE: Data exists but spatial query returns 0!');
          
          // 🔧 FALLBACK: Try using polygon extent as a rectangle instead
          console.log('🔧 Trying fallback: using polygon extent as rectangle...');
          try {
            const Extent = (await import("@arcgis/core/geometry/Extent")).default;
            const extentGeometry = new Extent({
              xmin: extent.extent?.xmin,
              ymin: extent.extent?.ymin,
              xmax: extent.extent?.xmax,
              ymax: extent.extent?.ymax,
              spatialReference: extent.spatialReference
            });
            
            const fallbackQuery = incidentsLayer.createQuery();
            fallbackQuery.where = whereClause;
            fallbackQuery.geometry = extentGeometry;
            fallbackQuery.spatialRelationship = "intersects";
            const fallbackCount = await incidentsLayer.queryFeatureCount(fallbackQuery);
            console.log('Fallback extent query count:', fallbackCount);
            
            if (fallbackCount > 0) {
              console.log('✅ SOLUTION FOUND: Extent-based query works! Polygon geometry issue confirmed.');
            }
          } catch (error) {
            console.error('Fallback extent query failed:', error);
          }
          
          // 🔍 DEBUGGING: Find incidents near your polygon area
          console.log('🔍 Searching for incidents near your polygon area...');
          
          // First, check if there are any incidents EXACTLY within the polygon bounds
          try {
            const exactBoundsQuery = incidentsLayer.createQuery();
            exactBoundsQuery.where = whereClause;
            exactBoundsQuery.outFields = ["*"];
            exactBoundsQuery.returnGeometry = true;
            exactBoundsQuery.num = 10;
            
            const allIncidents = await incidentsLayer.queryFeatures(exactBoundsQuery);
            console.log('🔍 Checking all incidents against your polygon bounds...');
            
            let insideCount = 0;
            const polygonBounds = extent.extent;
            
            if (allIncidents.features.length > 0 && polygonBounds) {
              allIncidents.features.forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'point') {
                  const point = feature.geometry as __esri.Point;
                  const isInside = point.x >= polygonBounds.xmin && 
                                 point.x <= polygonBounds.xmax && 
                                 point.y >= polygonBounds.ymin && 
                                 point.y <= polygonBounds.ymax;
                  
                  if (isInside) {
                    insideCount++;
                    if (insideCount <= 3) {
                      console.log(`✅ Incident INSIDE bounds at: [${point.x}, ${point.y}]`);
                    }
                  }
                }
              });
              
              console.log(`📊 Manual check: ${insideCount} incidents are within your polygon bounds`);
              
              if (insideCount > 0) {
                console.log('🚨 CRITICAL: Incidents exist within bounds but spatial query fails!');
                console.log('🔍 This confirms a polygon geometry issue, not a location issue.');
              }
            }
          } catch (error) {
            console.error('Manual bounds check failed:', error);
          }
          
          try {
            // Expand search area around your polygon
            const expandedExtent = {
              xmin: (extent.extent?.xmin || 0) - 1000, // 1000 meter buffer
              ymin: (extent.extent?.ymin || 0) - 1000,
              xmax: (extent.extent?.xmax || 0) + 1000,
              ymax: (extent.extent?.ymax || 0) + 1000
            };
            
            const nearbyQuery = incidentsLayer.createQuery();
            nearbyQuery.where = whereClause;
            nearbyQuery.geometry = new (await import("@arcgis/core/geometry/Extent")).default({
              ...expandedExtent,
              spatialReference: extent.spatialReference
            });
            nearbyQuery.spatialRelationship = "intersects";
            nearbyQuery.num = 5;
            nearbyQuery.returnGeometry = true;
            
            const nearbyResult = await incidentsLayer.queryFeatures(nearbyQuery);
            console.log('Incidents found in expanded area (1km buffer):', nearbyResult.features.length);
            
            if (nearbyResult.features.length > 0) {
              console.log('📍 Nearby incident locations:');
              nearbyResult.features.slice(0, 3).forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'point') {
                  const point = feature.geometry as __esri.Point;
                  console.log(`  Incident ${index + 1}: [${point.x}, ${point.y}]`);
                }
              });
              console.log('💡 TIP: Try drawing your polygon closer to these coordinates!');
            }
          } catch (error) {
            console.error('Nearby search failed:', error);
          }
          
          // Get a sample feature to compare coordinates
          const sampleQuery = incidentsLayer.createQuery();
          sampleQuery.where = whereClause;
          sampleQuery.num = 1;
          sampleQuery.returnGeometry = true;
          const sampleResult = await incidentsLayer.queryFeatures(sampleQuery);
          if (sampleResult.features.length > 0) {
            const sampleFeature = sampleResult.features[0];
            console.log('Sample feature geometry:', sampleFeature.geometry);
            console.log('Sample feature spatial reference:', sampleFeature.geometry?.spatialReference?.wkid);
            
            // Log actual coordinates of sample feature
            if (sampleFeature.geometry && sampleFeature.geometry.type === 'point') {
              const point = sampleFeature.geometry as __esri.Point;
              console.log('Sample feature coordinates: [' + point.x + ', ' + point.y + ']');
              console.log('🔍 COORDINATE COMPARISON:');
              console.log('  Your polygon extent: xmin=' + extent.extent?.xmin + ', ymin=' + extent.extent?.ymin + ', xmax=' + extent.extent?.xmax + ', ymax=' + extent.extent?.ymax);
              console.log('  Sample feature point: x=' + point.x + ', y=' + point.y);
              
              // Check if point is within polygon extent
              const withinExtent = point.x >= (extent.extent?.xmin || 0) && 
                                 point.x <= (extent.extent?.xmax || 0) && 
                                 point.y >= (extent.extent?.ymin || 0) && 
                                 point.y <= (extent.extent?.ymax || 0);
              console.log('  Point within polygon extent: ' + withinExtent);
            }
          }
        }
      }
      
      console.groupEnd();
      
      if (totalCount > incidents.length) {
        console.warn(`[WARNING] Pagination may have missed some records! Got ${incidents.length} but total is ${totalCount}`);
      }
      
      // Debug: Check if there's any BikeMaps.org data at all
      if (filters?.dataSource?.includes('BikeMaps.org') && incidents.length === 0) {
        const testQuery = incidentsLayer.createQuery();
        testQuery.where = "data_source = 'BikeMaps.org'";
        const countResult = await incidentsLayer.queryFeatureCount(testQuery);
      }
      
      if (incidents.length === 0) {
        return {
          incidents: [],
          parties: [],
          isLoading: false,
          error: null
        };
      }

      // Get incident IDs for related data queries
      const incidentIds = incidents.map(inc => inc.id);

      // Query parties for these incidents
      const parties = await this.queryPartiesForIncidents(partiesLayer, incidentIds);

      return {
        incidents,
        parties,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error querying safety data:', error);
      return {
        incidents: [],
        parties: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Lightweight count query for incidents matching filters (no parties join)
   */
  static async queryIncidentCount(
    extent?: Extent | Polygon,
    filters?: Partial<SafetyFilters>
  ): Promise<number> {
    const { incidentsLayer } = this.initializeLayers();
    const whereClause = this.buildWhereClause(filters);
    const countQuery = incidentsLayer.createQuery();
    countQuery.where = whereClause;
    if (extent) {
      countQuery.geometry = extent;
      countQuery.spatialRelationship = "intersects";
    }
    const totalCount = await incidentsLayer.queryFeatureCount(countQuery);
    return totalCount;
  }

  /**
   * Lightweight timestamp query for temporal aggregation (no parties join)
   * Returns incident timestamps as Date objects
   */
  static async queryIncidentTimestamps(
    extent?: Extent | Polygon,
    filters?: Partial<SafetyFilters>
  ): Promise<Date[]> {
    const { incidentsLayer } = this.initializeLayers();
    const whereClause = this.buildWhereClause(filters);

    const timestamps: Date[] = [];
    let hasMore = true;
    let offsetId = 0;
    const pageSize = 2000;

    while (hasMore) {
      const paginatedQuery = incidentsLayer.createQuery();
      paginatedQuery.where = offsetId > 0
        ? `(${whereClause}) AND objectid > ${offsetId}`
        : whereClause;
      paginatedQuery.outFields = ["objectid", "timestamp"]; // minimal
      paginatedQuery.returnGeometry = false;
      paginatedQuery.orderByFields = ["objectid"]; // stable pagination
      paginatedQuery.num = pageSize;
      if (extent) {
        paginatedQuery.geometry = extent;
        paginatedQuery.spatialRelationship = "intersects";
      }

      const pageResult = await incidentsLayer.queryFeatures(paginatedQuery);
      const pageFeatures = pageResult.features;
      if (pageFeatures.length === 0) {
        hasMore = false;
      } else {
        pageFeatures.forEach(feature => {
          const ts = feature.attributes.timestamp;
          if (ts) timestamps.push(new Date(ts));
          offsetId = Math.max(offsetId, feature.attributes.objectid || feature.attributes.OBJECTID || 0);
        });
        if (pageFeatures.length < pageSize) {
          hasMore = false;
        }
      }
    }

    return timestamps;
  }

  /**
   * Get enriched safety incidents with joined parties and weights data
   */
  static async getEnrichedSafetyData(
    extent?: Extent,
    filters?: Partial<SafetyFilters>,
    geometry?: Polygon,
  ): Promise<SafetyAnalysisResult> {
    try {
      // 🔍 DEBUG: Log parameters received by getEnrichedSafetyData
      console.group('🔍 [SAFETY DEBUG] SafetyIncidentsDataService.getEnrichedSafetyData');
      console.log('Parameters received:');
      console.log('  extent:', extent);
      console.log('  geometry:', geometry);
      console.log('  filters:', filters ? JSON.parse(JSON.stringify(filters)) : 'none');
      
      const spatialFilter = geometry || extent;
      console.log('Using spatial filter:', spatialFilter);
      
      if (spatialFilter && spatialFilter.type === 'polygon') {
        const polygon = spatialFilter as Polygon;
        console.log('Spatial filter details:');
        console.log('  Type:', polygon.type);
        console.log('  Spatial Reference WKID:', polygon.spatialReference?.wkid);
        console.log('  Extent:', {
          xmin: polygon.extent?.xmin,
          ymin: polygon.extent?.ymin,
          xmax: polygon.extent?.xmax,
          ymax: polygon.extent?.ymax
        });
      }
      console.groupEnd();
      
      const rawData = await this.querySafetyData(spatialFilter, filters);
      
      // 🔍 DEBUG: Log raw query results
      console.group('🔍 [SAFETY DEBUG] Raw Query Results');
      console.log('Incidents found:', rawData.incidents?.length || 0);
      console.log('Parties found:', rawData.parties?.length || 0);
      console.log('Query error:', rawData.error);
      console.log('Is loading:', rawData.isLoading);
      console.groupEnd();
      
      if (rawData.error) {
        return {
          data: [],
          summary: this.getEmptySummary(),
          isLoading: false,
          error: rawData.error
        };
      }

      // Join the data
      let enrichedIncidents = this.joinIncidentData(
        rawData.incidents,
        rawData.parties,
        filters
      );

      // Apply e-bike filtering if enabled
      if (filters?.ebikeMode && filters?.roadUser?.includes('bicyclist')) {
        const beforeCount = enrichedIncidents.length;
        enrichedIncidents = enrichedIncidents.filter(incident => 
          hasEbikeParty(incident.parties)
        );
        // console.log(`🚴 E-bike filter in getEnrichedSafetyData: ${enrichedIncidents.length} of ${beforeCount} incidents have e-bikes`);
      }

      // Calculate summary statistics
      const summary = this.calculateSummaryStatistics(enrichedIncidents);

      // 🔍 DEBUG: Log final results
      console.group('🔍 [SAFETY DEBUG] Final Enriched Results');
      console.log('Enriched incidents:', enrichedIncidents.length);
      console.log('Summary statistics:', summary);
      console.groupEnd();

      return {
        data: enrichedIncidents,
        summary,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error getting enriched safety data:', error);
      return {
        data: [],
        summary: this.getEmptySummary(),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Build WHERE clause for incident queries based on filters
   */
  private static buildWhereClause(filters?: Partial<SafetyFilters>): string {
    const conditions: string[] = ["1=1"]; // Base condition

    if (filters?.dateRange) {
      // Format dates for ArcGIS TIMESTAMP queries (YYYY-MM-DD HH:MI:SS)
      const startStr = filters.dateRange.start.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      const endStr = filters.dateRange.end.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      conditions.push(`timestamp >= TIMESTAMP '${startStr}' AND timestamp <= TIMESTAMP '${endStr}'`);
    }

    // Apply data source filter - if empty array, show nothing
    if (filters?.dataSource !== undefined) {
      if (filters.dataSource.length === 0) {
        // When no data sources are selected, return no results
        conditions.push('1=0'); // This will always be false, returning no results
      } else {
        const sources = filters.dataSource.map(src => `'${src}'`).join(',');
        conditions.push(`data_source IN (${sources})`);
      }
    }

    if (filters?.conflictType && filters.conflictType.length > 0) {
      const types = filters.conflictType.map(type => `'${type}'`).join(',');
      conditions.push(`conflict_type IN (${types})`);
    }

    if (filters?.roadUser) {
      const roadUserConditions: string[] = [];
      
      if (filters.roadUser.includes('pedestrian')) {
        roadUserConditions.push('pedestrian_involved = 1');
      }
      if (filters.roadUser.includes('bicyclist')) {
        roadUserConditions.push('bicyclist_involved = 1');
      }
      
      if (roadUserConditions.length > 0) {
        conditions.push(`(${roadUserConditions.join(' OR ')})`);
      }
    }

    // Handle e-bike mode filtering - this requires joining with parties table
    // For now, we'll handle this in the post-processing step since e-bike info is in parties table
    if (filters?.ebikeMode) {
      // Add a comment for future enhancement - e-bike filtering requires parties join
      // This will be handled in the joinIncidentData method
    }

    return conditions.join(' AND ');
  }

  /**
   * Query parties data for specific incident IDs
   */
  private static async queryPartiesForIncidents(
    partiesLayer: FeatureLayer,
    incidentIds: number[]
  ): Promise<IncidentParty[]> {
    if (incidentIds.length === 0) return [];

    const parties: IncidentParty[] = [];
    
    // Handle large incident ID lists by chunking
    const chunkSize = 100;
    for (let i = 0; i < incidentIds.length; i += chunkSize) {
      const chunk = incidentIds.slice(i, i + chunkSize);
      const idsList = chunk.join(',');
      
      const partiesQuery = partiesLayer.createQuery();
      partiesQuery.where = `incident_id IN (${idsList})`;
      partiesQuery.outFields = ["*"];
      partiesQuery.returnGeometry = false;

      const partiesResult = await partiesLayer.queryFeatures(partiesQuery);
      
      partiesResult.features.forEach(feature => {
        parties.push(this.mapPartyFeature(feature));
      });
    }

    return parties;
  }



  /**
   * Join incidents with their related parties
   */
  static joinIncidentData(
    incidents: SafetyIncident[],
    parties: IncidentParty[],
    filters?: Partial<SafetyFilters>
  ): EnrichedSafetyIncident[] {
    // Log summary only
    // console.log(`🔍 Joining ${incidents.length} incidents with ${parties.length} parties`);

    // Create lookup maps for efficient joining
    const partiesByIncident = new Map<number, IncidentParty[]>();
    parties.forEach(party => {
      if (!partiesByIncident.has(party.incident_id)) {
        partiesByIncident.set(party.incident_id, []);
      }
      partiesByIncident.get(party.incident_id)!.push(party);
    });

    // Count e-bike parties for filtering
    const ebikeParties = parties.filter(p => 
      p.bicycle_type && p.bicycle_type.toLowerCase() === 'ebike'
    );

    // Join data and compute derived fields
    let enrichedIncidents = incidents.map(incident => {
      const incidentParties = partiesByIncident.get(incident.id) || [];

      // Calculate max severity from all parties or use incident severity
      const severityOrder = ['Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown', ''];
      let maxSeverity = incident.severity || '';
      
      if (incidentParties.length > 0) {
        maxSeverity = incidentParties.reduce((max, party) => {
          const currentSeverityIndex = severityOrder.indexOf(party.injury_severity);
          const maxSeverityIndex = severityOrder.indexOf(max);
          return currentSeverityIndex < maxSeverityIndex ? party.injury_severity : max;
        }, maxSeverity);
      }

      const hasTrafficData = !!(incident.bike_traffic || incident.ped_traffic);
      
      return {
        ...incident,
        parties: incidentParties,
        maxSeverity,
        totalParties: incidentParties.length,
        hasTrafficData: hasTrafficData,
        bikeTrafficLevel: incident.bike_traffic,
        pedTrafficLevel: incident.ped_traffic
      };
    });

    // Note: E-bike filtering is now handled in the visualization layer
    // This allows popups to access all enriched data while still filtering the display

    return enrichedIncidents;
  }

  /**
   * Calculate summary statistics from enriched incidents
   */
  private static calculateSummaryStatistics(incidents: EnrichedSafetyIncident[]): SafetySummaryData {
    const total = incidents.length;
    const bikeIncidents = incidents.filter(inc => inc.bicyclist_involved === 1).length;
    const pedIncidents = incidents.filter(inc => inc.pedestrian_involved === 1).length;
    
    // 🔍 DEBUG: Log all unique severity values to understand data
    if (total > 0) {
      const uniqueSeverities = [...new Set(incidents.map(inc => inc.maxSeverity))];
      console.log('🔍 [SAFETY DEBUG] Unique severity values found:', uniqueSeverities);
      console.log('🔍 [SAFETY DEBUG] Severity breakdown:');
      uniqueSeverities.forEach(severity => {
        const count = incidents.filter(inc => inc.maxSeverity === severity).length;
        console.log(`  "${severity}": ${count} incidents`);
      });
    }
    
    // Calculate severity statistics based on actual database values
    
    const fatalIncidents = incidents.filter(inc => inc.maxSeverity === 'Fatality').length;
    const severeInjuryIncidents = incidents.filter(inc => inc.maxSeverity === 'Severe Injury').length;
    const injuryIncidents = incidents.filter(inc => inc.maxSeverity === 'Injury').length;
    const unknownIncidents = incidents.filter(inc => 
      inc.maxSeverity === 'Unknown' || inc.maxSeverity === '' || !inc.maxSeverity
    ).length;
    
    // Separate "No Injury" (actual collisions) from "Near Miss" (crowd-sourced close calls)
    // No Injury: Actual collisions with no injury (typically from SWITRS)
    const noInjuryIncidents = incidents.filter(inc => 
      inc.data_source === 'SWITRS' && inc.maxSeverity === 'No Injury'
    ).length;
    
    // Near Miss: Crowd-sourced near misses from BikeMaps.org
    const nearMissIncidents = incidents.filter(inc => 
      inc.data_source === 'BikeMaps.org' && inc.maxSeverity === 'No Injury'
    ).length;

    // Data source breakdown
    const switrsCount = incidents.filter(inc => inc.data_source === 'SWITRS').length;
    const bikemapsCount = incidents.filter(inc => inc.data_source === 'BikeMaps.org').length;

    // Calculate date range for incidents per day
    const dates = incidents.map(inc => new Date(inc.timestamp));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const incidentsPerDay = daysDiff > 0 ? total / daysDiff : 0;

    // Calculate average severity score (using traffic data if available)
    const incidentsWithTrafficData = incidents.filter(inc => inc.hasTrafficData);
    const avgSeverityScore = incidentsWithTrafficData.length > 0 
      ? incidentsWithTrafficData.length / incidents.length
      : 0;

    return {
      totalIncidents: total,
      bikeIncidents,
      pedIncidents,
      fatalIncidents,
      severeInjuryIncidents,
      injuryIncidents,
      noInjuryIncidents,
      nearMissIncidents,
      unknownIncidents,
      avgSeverityScore,
      incidentsPerDay,
      dataSourceBreakdown: {
        switrs: switrsCount,
        bikemaps: bikemapsCount
      }
    };
  }

  /**
   * Map ArcGIS feature to SafetyIncident interface
   */
  private static mapIncidentFeature(feature: any): SafetyIncident {

    
    return {
      OBJECTID: feature.attributes.objectid || feature.attributes.OBJECTID,
      id: feature.attributes.id,
      source_id: feature.attributes.source_id,
      timestamp: new Date(feature.attributes.timestamp),
      conflict_type: feature.attributes.conflict_type,
      severity: feature.attributes.severity,
      pedestrian_involved: feature.attributes.pedestrian_involved,
      bicyclist_involved: feature.attributes.bicyclist_involved,
      vehicle_involved: feature.attributes.vehicle_involved,
      loc_desc: feature.attributes.loc_desc,
      data_source: feature.attributes.data_source,
      strava_id: feature.attributes.strava_id,
      bike_traffic: feature.attributes.bike_traffic,
      ped_traffic: feature.attributes.ped_traffic,
      geometry: feature.geometry
    };
  }

  /**
   * Map ArcGIS feature to IncidentParty interface
   */
  private static mapPartyFeature(feature: any): IncidentParty {
    const party = {
      OBJECTID: feature.attributes.objectid || feature.attributes.OBJECTID,
      incident_id: feature.attributes.incident_id,
      party_number: feature.attributes.party_number,
      victim_number: feature.attributes.victim_number,
      party_type: feature.attributes.party_type,
      injury_severity: feature.attributes.injury_severity,
      bicycle_type: feature.attributes.bicycle_type,
      age: feature.attributes.age,
      gender: feature.attributes.gender
    };
    
    // Only log e-bike parties (commented out to reduce console clutter)
    // if (party.bicycle_type && party.bicycle_type.toLowerCase() === 'ebike') {
    //   console.log('🚲✅ E-bike party:', {
    //     incident_id: party.incident_id,
    //     bicycle_type: party.bicycle_type
    //   });
    // }
    
    return party;
  }

  /**
   * Get empty summary for error states
   */
  private static getEmptySummary(): SafetySummaryData {
    return {
      totalIncidents: 0,
      bikeIncidents: 0,
      pedIncidents: 0,
      fatalIncidents: 0,
      severeInjuryIncidents: 0,
      injuryIncidents: 0,
      noInjuryIncidents: 0,
      nearMissIncidents: 0,
      unknownIncidents: 0,
      avgSeverityScore: 0,
      incidentsPerDay: 0,
      dataSourceBreakdown: {
        switrs: 0,
        bikemaps: 0
      }
    };
  }
}