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
    // Create a stable key for this map view - use a consistent identifier
    const mapKey = mapView.container?.id || 'default-map';
    
    // Check if we have a cached layer for this specific map
    if (this.layerCache.has(mapKey)) {
      const cachedLayer = this.layerCache.get(mapKey);
      if (cachedLayer && mapView.map && mapView.map.layers.includes(cachedLayer)) {
        return cachedLayer;
      } else {
        // Layer exists in cache but not on map, remove from cache
        this.layerCache.delete(mapKey);
      }
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
      const enrichedIncidents = SafetyIncidentsDataService.joinIncidentData(
        rawData.incidents,
        rawData.parties
      );

      // 3. Create ArcGIS Graphic objects from the processed data
      const rawIncidentGraphics = enrichedIncidents
        .filter(incident => incident.geometry && incident.id)
        .map((incident, index) => new Graphic({
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
            // --- Fields needed for sidebar consistency ---
            loc_desc: incident.loc_desc || 'Unknown Location',
            incident_date: incident.incident_date,
            strava_id: incident.strava_id,
            bike_traffic: incident.bike_traffic,
            ped_traffic: incident.ped_traffic,
            severity: incident.severity,
          }
        }));

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
          // --- Additional fields for sidebar consistency ---
          { name: "loc_desc", type: "string" },
          { name: "incident_date", type: "date" },
          { name: "strava_id", type: "integer" },
          { name: "bike_traffic", type: "string" },
          { name: "ped_traffic", type: "string" },
          { name: "severity", type: "string" },
        ],
        outFields: ["*"],
        // 5. Apply the severity-based renderer for unique styling
        renderer: RawIncidentRenderer.getRenderer('severity', filters as SafetyFilters),
        // 6. Restore the pop-up template
        popupTemplate: {
          title: "Safety Incident Details",
          content: ({ graphic }: { graphic: __esri.Graphic }) => {
            // The `graphic` object is destructured from the function parameter.
            // We pass the graphic's attributes and the full `enrichedIncidents` array
            // to the content generation function.
            return generateRawIncidentPopupContent(graphic.attributes, enrichedIncidents);
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
