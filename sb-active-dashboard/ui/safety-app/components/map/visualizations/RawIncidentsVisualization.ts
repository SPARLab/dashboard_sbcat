import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { RawIncidentRenderer } from "../../../../../lib/safety-app/renderers/RawIncidentRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";
import { generateRawIncidentPopupContent } from "../../../utils/popupContentGenerator";

export class RawIncidentsVisualization {
  private static cachedLayer: FeatureLayer | null = null;
  private static isLoaded = false;

  /**
   * Gets a client-side FeatureLayer for raw incidents.
   * This function fetches and processes data once, caches the resulting layer,
   * and returns the cached layer on subsequent calls. This ensures that the
   * expensive data processing is not re-run unnecessarily.
   */
  static async getLayer(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    setDataLoading: (loading: boolean) => void
  ): Promise<FeatureLayer | null> {
    if (this.cachedLayer) {
      console.log('[DEBUG] Returning cached raw incidents layer');
      return this.cachedLayer;
    }

    if (this.isLoaded) {
      // If loading was attempted and failed, don't try again.
      return null;
    }

    try {
      console.log('[DEBUG] First-time load: creating raw incidents layer...');
      setDataLoading(true);

      // 1. Fetch all necessary data from the service
      const rawData = await SafetyIncidentsDataService.querySafetyData(undefined, filters);
      if (rawData.error || rawData.incidents.length === 0) {
        console.warn('[DEBUG] No raw incidents found or an error occurred.');
        this.isLoaded = true; // Mark as loaded to prevent retries
        return null;
      }

      // 2. Process the data: join incidents with parties to compute maxSeverity
      const enrichedIncidents = SafetyIncidentsDataService.joinIncidentData(
        rawData.incidents,
        rawData.parties,
        [] // No weights needed for raw incidents
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
        ],
        outFields: ["*"],
        // 5. Apply the severity-based renderer for unique styling
        renderer: RawIncidentRenderer.getRenderer('severity', filters as SafetyFilters),
        // 6. Restore the pop-up template
        popupTemplate: {
          title: "Safety Incident Details",
          content: generateRawIncidentPopupContent,
        },
      });

      // 7. Cache the layer and mark as loaded
      this.cachedLayer = clientSideLayer;
      this.isLoaded = true;
      mapView.map.add(this.cachedLayer);
      console.log('[DEBUG] Raw incidents layer created and cached successfully!');
      
      return this.cachedLayer;

    } catch (error) {
      console.error('[DEBUG] Error creating raw incidents visualization:', error);
      this.isLoaded = true; // Mark as loaded to prevent retries
      return null;
    } finally {
      setDataLoading(false);
    }
  }
}