import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { IncidentHeatmapRenderer } from "../../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { IncidentVolumeRatioRenderer } from "../../../../../lib/safety-app/renderers/IncidentVolumeRatioRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";
import { getNormalizationWeight, VolumeWeightConfig } from "../../../../../lib/safety-app/utils/incidentRiskMatrix";

export class WeightedVisualization {
  static async createVisualization(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    incidentsLayer: FeatureLayer | null,
    cachedWeightedLayer: FeatureLayer | null,
    cachedExtentKey: string | null,
    generateCacheKey: (extent: __esri.Extent, filters: Partial<SafetyFilters>, weights?: VolumeWeightConfig) => string,
    setCachedWeightedLayer: (layer: FeatureLayer | null) => void,
    setCachedExtentKey: (key: string | null) => void,
    customWeights?: VolumeWeightConfig
  ): Promise<void> {
    if (!incidentsLayer || !mapView) return;

    try {
      // Check if we can use cached layer
      // Cache key now includes weights, so different weights = different cache
      const currentCacheKey = generateCacheKey(mapView.extent, filters, customWeights);
      
      if (cachedWeightedLayer && cachedExtentKey === currentCacheKey) {
  
        
        // Hide the regular incidents layer and show the cached traffic layer
        incidentsLayer.visible = false;
        cachedWeightedLayer.visible = true;
        
        // Make sure the cached layer is in the map
        if (!mapView.map.layers.includes(cachedWeightedLayer)) {
          mapView.map.add(cachedWeightedLayer);
        }
        
        return;
      }

  

      // Query incidents for current map extent
      const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
        mapView.extent,
        filters
      );



      // Filter incidents that have traffic data
      let incidentsWithTrafficData = safetyData.data.filter(inc => inc.hasTrafficData);

      let safetyDataWithoutExtent: any = null;

      if (incidentsWithTrafficData.length === 0) {
        console.warn('No traffic data available for current extent, trying without extent...');
        
        // Try querying without extent to see if we can get any data
        safetyDataWithoutExtent = await SafetyIncidentsDataService.getEnrichedSafetyData(
          undefined,
          filters as any
        );
        
        const incidentsWithTrafficDataWithoutExtent = safetyDataWithoutExtent.data.filter(inc => inc.hasTrafficData);
        
        if (incidentsWithTrafficDataWithoutExtent.length === 0) {
          console.warn('No traffic data available even without extent, using all incidents with severity-based visualization');
          
          // Create a visualization using all incidents with severity-based scoring
          const allIncidents = safetyData.data.length > 0 ? safetyData.data : safetyDataWithoutExtent.data;
        
        } else {
          // Use the incidents with traffic data from the broader query
          incidentsWithTrafficData = incidentsWithTrafficDataWithoutExtent;
        }
      }
      
      if (incidentsWithTrafficData.length === 0) {
        console.warn('No traffic data available, trying without any filters...');
        
        // Try querying without any filters to see if we can get any data at all
        const safetyDataNoFilters = await SafetyIncidentsDataService.getEnrichedSafetyData(
          undefined,
          {} as any
        );
        

        
        // Create a visualization using all incidents with severity-based scoring
        const allIncidents = safetyData.data.length > 0 ? safetyData.data : 
                           safetyDataWithoutExtent?.data.length > 0 ? safetyDataWithoutExtent.data :
                           safetyDataNoFilters.data;
        
        if (allIncidents.length === 0) {
          console.warn('No incidents available');
          incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as any);
          incidentsLayer.visible = true;
          return;
        }
        
        // Create features array for client-side feature layer with severity-based scoring
        const severityFeatures = allIncidents.map((incident, index) => {
          // Calculate severity score (Fatality=5, Severe Injury=4, Injury=3, No Injury=2, Unknown=1)
          const severityScores = { 'Fatality': 5, 'Severe Injury': 4, 'Injury': 3, 'No Injury': 2, 'Unknown': 1 };
          const severityScore = severityScores[incident.maxSeverity as keyof typeof severityScores] || 1;
          const normalizedSeverityScore = severityScore / 5; // Normalize to 0-1 scale
          
          const feature = {
            geometry: incident.geometry,
            attributes: {
              objectid: incident.OBJECTID || index + 1,
              id: incident.id,
              severity: incident.maxSeverity || 'unknown',
              severityScore: severityScore,
              normalizedSeverityScore: normalizedSeverityScore,
              data_source: incident.data_source || 'unknown'
            }
          };
          
          return feature;
        });

        // Remove existing traffic layer if it exists
        const existingTrafficLayer = mapView.map.layers.find(
          (layer: any) => layer.title === "Traffic-Based Safety Incidents"
        );
        if (existingTrafficLayer) {
          mapView.map.remove(existingTrafficLayer);
        }

        // Create a client-side FeatureLayer for the severity data
        const severityLayer = new FeatureLayer({
          source: severityFeatures,
          title: "Traffic-Based Safety Incidents",
          objectIdField: "objectid",
          fields: [
            { name: "objectid", type: "oid" },
            { name: "id", type: "integer" },
            { name: "severity", type: "string" },
            { name: "severityScore", type: "integer" },
            { name: "normalizedSeverityScore", type: "double" },
            { name: "data_source", type: "string" }
          ],
          geometryType: "point",
          spatialReference: mapView.spatialReference
        });

        // Add the new severity layer
        mapView.map.add(severityLayer);
        
        // Create a custom renderer using consistent purple scheme
        const severityRenderer = new (await import("@arcgis/core/renderers/HeatmapRenderer")).default({
          field: "normalizedSeverityScore", // Use our severity score field
          radius: 15, // Match incident heatmap radius
          maxDensity: 0.02, // Match incident heatmap maxDensity
          minDensity: 0,
          referenceScale: 72224, // Match incident heatmap referenceScale
          colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Use same purple scheme
        });
        
        severityLayer.renderer = severityRenderer;

        // Cache the severity layer and extent key for future use
        setCachedWeightedLayer(severityLayer);
        setCachedExtentKey(currentCacheKey);

        // Hide the regular incidents layer and show the severity layer
        incidentsLayer.visible = false;
        severityLayer.visible = true;
        
        return;
      }

      // Create features array for client-side feature layer with traffic data
      const trafficFeatures = incidentsWithTrafficData.map((incident, index) => {
        // Normalize traffic level string to standard format
        const normalizeLevel = (level: string | undefined): 'Low' | 'Medium' | 'High' => {
          if (!level) return 'Medium';
          const normalized = level.toLowerCase();
          if (normalized === 'high') return 'High';
          if (normalized === 'medium') return 'Medium';
          return 'Low';
        };
        
        const bikeLevel = normalizeLevel(incident.bikeTrafficLevel);
        const pedLevel = normalizeLevel(incident.pedTrafficLevel);
        
        // Prioritize bike traffic level, fall back to pedestrian level
        const volumeLevel = incident.bikeTrafficLevel ? bikeLevel : pedLevel;
        
        // Get normalization weight based on volume level
        // Uses custom weights if provided, otherwise defaults to 3.0/1.0/0.5
        const riskWeight = getNormalizationWeight(volumeLevel, customWeights);
        
        const feature = {
          geometry: incident.geometry,
          attributes: {
            objectid: incident.OBJECTID || index + 1, // Ensure we have a valid objectid
            id: incident.id,
            bikeTrafficLevel: incident.bikeTrafficLevel || 'Low',
            pedTrafficLevel: incident.pedTrafficLevel || 'Low',
            volumeLevel: volumeLevel,
            normalizedRisk: riskWeight, // Use this for heatmap visualization
            severity: incident.maxSeverity || 'unknown',
            data_source: incident.data_source || 'unknown'
          }
        };
        
        return feature;
      });

      // Remove existing traffic layer if it exists
      const existingTrafficLayer = mapView.map.layers.find(
        (layer: any) => layer.title === "Traffic-Based Safety Incidents"
      );
      if (existingTrafficLayer) {
        mapView.map.remove(existingTrafficLayer);
      }

      // Create a client-side FeatureLayer for the traffic data
      const trafficLayer = new FeatureLayer({
        source: trafficFeatures as any,
        title: "Traffic-Based Safety Incidents",
        objectIdField: "objectid",
        fields: [
          { name: "objectid", type: "oid" },
          { name: "id", type: "integer" },
          { name: "bikeTrafficLevel", type: "string" },
          { name: "pedTrafficLevel", type: "string" },
          { name: "volumeLevel", type: "string" },
          { name: "normalizedRisk", type: "double" },
          { name: "severity", type: "string" },
          { name: "data_source", type: "string" }
        ],
        geometryType: "point",
        spatialReference: mapView.spatialReference
      });

      // Add the new traffic layer
      mapView.map.add(trafficLayer);
      

      
      // Create a custom renderer using risk weights
      // Higher weights (low-volume areas) create stronger heatmap intensity per incident
      // maxDensity must be small (0.01-0.1 range) - this is ArcGIS pixel density, not weight units
      // IMPORTANT: Must match ALL incident heatmap parameters so that weights=1.0x produces identical results
      const trafficRenderer = new (await import("@arcgis/core/renderers/HeatmapRenderer")).default({
        field: "normalizedRisk", // Use risk weight: Low volume=2.0, Medium=1.0, High=0.5 (defaults)
        radius: 10, // Match incident heatmap radius (10, not 15 - controls blur amount)
        maxDensity: 0.04, // Match incident heatmap exactly (0.04)
        minDensity: 0,
        referenceScale: 72224, // Match incident heatmap referenceScale
        colorStops: IncidentHeatmapRenderer.getColorScheme('purple') // Use same purple scheme
      });
      
      trafficLayer.renderer = trafficRenderer;



      // Cache the traffic layer and extent key for future use
      setCachedWeightedLayer(trafficLayer);
      setCachedExtentKey(currentCacheKey);
  

      // Hide the regular incidents layer and show the traffic layer
      incidentsLayer.visible = false;
      trafficLayer.visible = true;
      


    } catch (error) {
  
      // Fallback to regular heatmap
      if (incidentsLayer) {
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as any);
        incidentsLayer.visible = true;
      }
    }
  }
}