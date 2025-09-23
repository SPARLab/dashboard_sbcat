import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { RawIncidentRenderer } from "../../../../../lib/safety-app/renderers/RawIncidentRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";
import { generateRawIncidentPopupContent } from "../../../utils/popupContentGenerator";

export class RawIncidentsVisualization {
  // Change from static cache to map-specific cache
  private static layerCache = new Map<string, FeatureLayer>();
  private static loadingCache = new Map<string, boolean>();
  private static enrichedDataCache = new Map<string, any[]>();

  /**
   * Gets a client-side FeatureLayer for raw incidents.
   * This function fetches and processes data once per map view, caches the resulting layer,
   * and returns the cached layer on subsequent calls for the same map view.
   */
  static async getLayer(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    setDataLoading: (loading: boolean) => void
  ): Promise<FeatureLayer | null> {
    // Create a stable key for this map view INCLUDING e-bike mode
    const baseMapKey = mapView.container?.id || 'default-map';
    const mapKey = `${baseMapKey}-ebike:${filters?.ebikeMode || false}`;
    
    console.log('🔑 Cache key:', mapKey);
    
    // Check if we have a cached layer for this specific map and filter combination
    if (this.layerCache.has(mapKey)) {
      const cachedLayer = this.layerCache.get(mapKey);
      if (cachedLayer && mapView.map && mapView.map.layers.includes(cachedLayer)) {
        console.log('✅ Using cached layer for:', mapKey);
        return cachedLayer;
      } else {
        // Layer exists in cache but not on map, remove from cache
        this.layerCache.delete(mapKey);
      }
    }
    
    // Clear old cache entries when filter changes
    const otherKey = `${baseMapKey}-ebike:${!filters?.ebikeMode}`;
    if (this.layerCache.has(otherKey)) {
      const oldLayer = this.layerCache.get(otherKey);
      if (oldLayer && mapView.map) {
        mapView.map.remove(oldLayer);
      }
      this.layerCache.delete(otherKey);
      this.enrichedDataCache.delete(otherKey);
      console.log('🗑️ Cleared old cache for:', otherKey);
    }

    // Check if we're already loading for this map
    if (this.loadingCache.get(mapKey)) {
      return null;
    }

    try {
      this.loadingCache.set(mapKey, true);
      setDataLoading(true);

      // 1. Fetch all necessary data from the service
      const rawData = await SafetyIncidentsDataService.querySafetyData(undefined, filters);
      
      if (rawData.error || rawData.incidents.length === 0) {
        this.loadingCache.set(mapKey, false);
        return null;
      }

      // 2. Process the data: join incidents with parties to compute maxSeverity
      // Get ALL enriched incidents first (for popup lookup)
      const allEnrichedIncidents = SafetyIncidentsDataService.joinIncidentData(
        rawData.incidents,
        rawData.parties
      );
      
      // Store enriched data in cache for popup access
      this.enrichedDataCache.set(mapKey, allEnrichedIncidents);
      console.log(`📦 Cached ${allEnrichedIncidents.length} enriched incidents for popups`);

      // 3. Apply e-bike filtering if needed
      console.log('🔍 RawIncidentsVisualization filters:', {
        ebikeMode: filters?.ebikeMode,
        roadUser: filters?.roadUser,
        shouldFilterEbikes: filters?.ebikeMode && filters?.roadUser?.includes('bicyclist')
      });
      
      let filteredIncidents = allEnrichedIncidents;
      if (filters?.ebikeMode && filters?.roadUser?.includes('bicyclist')) {
        // Import the helper function
        const { hasEbikeParty } = await import('../../../../../lib/safety-app/utils/ebikeDetection');
        
        // Debug: Check which incidents have e-bikes
        const ebikeIncidentIds = new Set<number>();
        allEnrichedIncidents.forEach(incident => {
          if (hasEbikeParty(incident.parties)) {
            ebikeIncidentIds.add(incident.id);
          }
        });
        
        console.log('🚴 E-bike incidents found:', Array.from(ebikeIncidentIds));
        
        filteredIncidents = allEnrichedIncidents.filter(incident => 
          hasEbikeParty(incident.parties)
        );
        
        console.log(`🚴 E-bike filter APPLIED: ${filteredIncidents.length} of ${allEnrichedIncidents.length} incidents have e-bikes`);
      } else {
        console.log('⚠️ E-bike filter NOT applied');
      }

      // Import the helper function to check e-bike status
      const { hasEbikeParty } = await import('../../../../../lib/safety-app/utils/ebikeDetection');
      
      // DEBUG: Track e-bike detection for all incidents
      const ebikeDebugInfo: any[] = [];
      
      // 4. Create ArcGIS Graphic objects from the filtered data
      const rawIncidentGraphics = filteredIncidents
        .filter(incident => incident.geometry && incident.id)
        .map((incident, index) => {
          const hasEbike = incident.parties ? hasEbikeParty(incident.parties) : false;
          
          // Collect debug info for known e-bike incidents
          if (incident.id === 3734 || incident.id === 3322 || incident.id === 3385) {
            ebikeDebugInfo.push({
              id: incident.id,
              hasEbike,
              parties: incident.parties?.map((p: any) => p.bicycle_type)
            });
          }
          
          return new Graphic({
            geometry: incident.geometry,
            attributes: {
              // --- Core Fields for Layer ---
              objectid: index + 1,
              id: incident.id,
              maxSeverity: incident.maxSeverity || 'Unknown',
              data_source: incident.data_source || 'Unknown',
              timestamp: incident.timestamp ? incident.timestamp.getTime() : null,
              // --- Additional Fields for Pop-up ---
              conflict_type: incident.conflict_type || 'N/A',
              pedestrian_involved: incident.pedestrian_involved || 0,
              bicyclist_involved: incident.bicyclist_involved || 0,
              vehicle_involved: incident.vehicle_involved || 0,
              party_count: incident.parties?.length || 0,
              hasEbike: hasEbike ? 1 : 0,  // Add hasEbike attribute for popup detection
            }
          });
        });
        
      // Log e-bike detection results
      if (ebikeDebugInfo.length > 0) {
        console.log('🚴 RawIncidentsVisualization E-bike Detection:', ebikeDebugInfo);
      }

      // 4. Create a new client-side FeatureLayer with the processed graphics
      const clientSideLayer = new FeatureLayer({
        source: rawIncidentGraphics,
        title: "Raw Safety Incidents",
        objectIdField: "objectid",
        fields: [
          // --- Define schema for all attributes ---
          { name: "objectid", type: "oid" },
          { name: "id", type: "string" },
          { name: "maxSeverity", type: "string" },
          { name: "data_source", type: "string" },
          { name: "timestamp", type: "date" },
          { name: "conflict_type", type: "string" },
          { name: "pedestrian_involved", type: "integer" },
          { name: "bicyclist_involved", type: "integer" },
          { name: "vehicle_involved", type: "integer" },
          { name: "party_count", type: "integer" },
          { name: "hasEbike", type: "small-integer" },  // Add hasEbike field to schema
        ],
        outFields: ["*"],
        // 5. Apply the severity-based renderer for unique styling
        renderer: RawIncidentRenderer.getRenderer('severity', filters as SafetyFilters),
        // 6. Restore the pop-up template
        popupTemplate: {
          title: "Safety Incident Details",
          content: async ({ graphic }: { graphic: __esri.Graphic }) => {
            // Get enriched data from cache - need to reconstruct the key
            const baseMapKey = mapView.container?.id || 'default-map';
            const currentMapKey = `${baseMapKey}-ebike:${filters?.ebikeMode || false}`;
            const cachedEnrichedData = this.enrichedDataCache.get(currentMapKey);
            console.log('📦 Popup accessing cache:', {
              mapKey: currentMapKey,
              cacheHit: !!cachedEnrichedData,
              cacheSize: cachedEnrichedData?.length || 0
            });
            return await generateRawIncidentPopupContent(graphic.attributes, cachedEnrichedData);
          },
        },
      });

      // 7. Cache the layer for this specific map and add to map
      this.layerCache.set(mapKey, clientSideLayer);
      this.loadingCache.set(mapKey, false);
      if (mapView.map) {
        mapView.map.add(clientSideLayer);
      }

      return clientSideLayer;

    } catch (error) {
      this.loadingCache.set(mapKey, false);
      return null;
    } finally {
      setDataLoading(false);
    }
  }

  /**
   * Clear the cache for a specific map view when it's destroyed
   */
  static clearCacheForMap(mapView: __esri.MapView): void {
    const mapKey = mapView.container?.id || `map-${Date.now()}`;
    const cachedLayer = this.layerCache.get(mapKey);
    
    if (cachedLayer && mapView.map && mapView.map.layers.includes(cachedLayer)) {
      mapView.map.remove(cachedLayer);
    }
    
    this.layerCache.delete(mapKey);
    this.loadingCache.delete(mapKey);
  }
  /**
   * Clear all caches (useful for cleanup)
   */
  static clearAllCaches(): void {
    this.layerCache.clear();
    this.loadingCache.clear();
  }
}
