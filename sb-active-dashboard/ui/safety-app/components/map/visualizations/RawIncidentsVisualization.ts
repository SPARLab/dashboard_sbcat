import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { RawIncidentRenderer } from "../../../../../lib/safety-app/renderers/RawIncidentRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";
import { generateRawIncidentPopupContent } from "../../../utils/popupContentGenerator";

export class RawIncidentsVisualization {
  static async createVisualization(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    incidentsLayer: FeatureLayer | null,
    cachedRawIncidentsLayer: FeatureLayer | null,
    cachedRawIncidentsData: any[] | null,
    rawDataFiltersKey: string | null,
    setDataLoading: (loading: boolean) => void,
    setCachedRawIncidentsLayer: (layer: FeatureLayer | null) => void,
    setCachedRawIncidentsData: (data: any[] | null) => void,
    setRawDataFiltersKey: (key: string | null) => void
  ): Promise<void> {
    try {
      const currentFiltersKey = JSON.stringify(filters);
      
      // Check if we have cached data for the current filters
      if (cachedRawIncidentsLayer && cachedRawIncidentsData && rawDataFiltersKey === currentFiltersKey) {
        console.log('[DEBUG] Using cached raw incidents layer - no reload needed');
        
        // Just show the cached layer
        if (incidentsLayer) incidentsLayer.visible = false;
        
        // Make sure cached layer is in the map
        if (!mapView.map.layers.includes(cachedRawIncidentsLayer)) {
          mapView.map.add(cachedRawIncidentsLayer);
        }
        
        cachedRawIncidentsLayer.visible = true;
        return;
      }

      console.log('[DEBUG] Loading ALL raw incidents data (one-time load)...');
      setDataLoading(true);

      // Load ALL incidents without extent filter (like ArcGIS layers do)
      const rawData = await SafetyIncidentsDataService.querySafetyData(
        undefined, // No extent filter - load everything
        filters
      );

      if (rawData.error || rawData.incidents.length === 0) {
        console.log('[DEBUG] No incidents found or error occurred');
        setDataLoading(false);
        return;
      }

      // Create enriched data with parties only (skip weights for raw incidents)
      const enrichedIncidents = SafetyIncidentsDataService.joinIncidentData(
        rawData.incidents,
        rawData.parties,
        [] // Skip weights for raw incidents to improve performance
      );

      console.log('[DEBUG] Loaded ALL incidents data:', {
        totalIncidents: enrichedIncidents.length,
        sampleIncident: enrichedIncidents[0]
      });

      // Create graphics for ALL incidents (not just current extent)
      const rawIncidentFeatures = enrichedIncidents
        .filter(incident => incident.geometry && incident.id)
        .map((incident, index) => {
          const maxSeverity = incident.maxSeverity || '';
          
          return new Graphic({
            geometry: incident.geometry,
            attributes: {
              objectid: index + 1,
              id: incident.id,
              maxSeverity: maxSeverity,
              data_source: incident.data_source || 'unknown',
              // Add more attributes for popup
              timestamp: incident.timestamp ? incident.timestamp.getTime() : null,
              conflict_type: incident.conflict_type || '',
              pedestrian_involved: incident.pedestrian_involved || 0,
              bicyclist_involved: incident.bicyclist_involved || 0,
              vehicle_involved: incident.vehicle_involved || 0
            }
          });
        });

      console.log('[DEBUG] Created graphics for ALL incidents:', {
        totalFeatures: rawIncidentFeatures.length
      });

      // Remove any existing raw incidents layer
      const existingRawLayer = mapView.map.layers.find(
        (layer: any) => layer.title === "Raw Safety Incidents"
      );
      if (existingRawLayer) {
        mapView.map.remove(existingRawLayer);
      }

      // Create the layer with ALL data
      const rawIncidentsLayer = new FeatureLayer({
        source: rawIncidentFeatures,
        title: "Raw Safety Incidents",
        objectIdField: "objectid",
        fields: [
          { name: "objectid", type: "oid" },
          { name: "id", type: "integer" },
          { name: "maxSeverity", type: "string" },
          { name: "data_source", type: "string" },
          { name: "timestamp", type: "date" },
          { name: "conflict_type", type: "string" },
          { name: "pedestrian_involved", type: "integer" },
          { name: "bicyclist_involved", type: "integer" },
          { name: "vehicle_involved", type: "integer" }
        ],
        geometryType: "point",
        spatialReference: mapView.spatialReference,
        popupTemplate: {
          title: "Safety Incident #{id}",
          content: (event: any) => {
            const graphic = event.graphic;
            const attributes = graphic.attributes;
            
            return generateRawIncidentPopupContent(attributes, enrichedIncidents);
          }
        }
      });

      // Apply the severity renderer
      rawIncidentsLayer.renderer = RawIncidentRenderer.getRenderer('severity', filters);
      
      // Hide the regular incidents layer and add the new one
      if (incidentsLayer) incidentsLayer.visible = false;
      mapView.map.add(rawIncidentsLayer);

      // Cache the layer and data for future use
      setCachedRawIncidentsLayer(rawIncidentsLayer);
      setCachedRawIncidentsData(enrichedIncidents);
      setRawDataFiltersKey(currentFiltersKey);

      // Wait for layer to load
      rawIncidentsLayer.load().then(() => {
        console.log('[DEBUG] Raw incidents layer loaded and cached successfully!');
        rawIncidentsLayer.visible = true;
        setDataLoading(false);
      }).catch((error) => {
        console.error('[DEBUG] FeatureLayer load failed:', error);
        // Fallback to original layer
        if (incidentsLayer) {
          incidentsLayer.renderer = RawIncidentRenderer.getRenderer('data_source', filters);
          incidentsLayer.visible = true;
        }
        setDataLoading(false);
      });

    } catch (error) {
      console.error('[DEBUG] Failed to create raw incidents visualization:', error);
      // Fallback to original layer
      if (incidentsLayer) {
        incidentsLayer.renderer = RawIncidentRenderer.getRenderer('data_source', filters);
        incidentsLayer.visible = true;
      }
      setDataLoading(false);
    }
  }
}