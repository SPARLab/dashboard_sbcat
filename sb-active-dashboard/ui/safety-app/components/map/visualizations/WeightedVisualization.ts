import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { IncidentHeatmapRenderer } from "../../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { IncidentVolumeRatioRenderer } from "../../../../../lib/safety-app/renderers/IncidentVolumeRatioRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";

export class WeightedVisualization {
  static async createVisualization(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    incidentsLayer: FeatureLayer | null,
    cachedWeightedLayer: FeatureLayer | null,
    cachedExtentKey: string | null,
    generateCacheKey: (extent: __esri.Extent, filters: Partial<SafetyFilters>) => string,
    setCachedWeightedLayer: (layer: FeatureLayer | null) => void,
    setCachedExtentKey: (key: string | null) => void
  ): Promise<void> {
    if (!incidentsLayer || !mapView) return;

    try {
      // Check if we can use cached layer
      const currentCacheKey = generateCacheKey(mapView.extent, filters);
      
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
      console.log('Querying with extent:', mapView.extent);
      console.log('Querying with filters:', filters);
      
      const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
        mapView.extent,
        filters
      );

      console.log('Safety data received:', {
        totalIncidents: safetyData.data.length,
        incidentsWithTrafficData: safetyData.data.filter(inc => inc.hasTrafficData).length,
        sampleIncident: safetyData.data[0] ? {
          hasTrafficData: safetyData.data[0].hasTrafficData,
          bikeTrafficLevel: safetyData.data[0].bikeTrafficLevel,
          pedTrafficLevel: safetyData.data[0].pedTrafficLevel,
          bike_traffic: safetyData.data[0].bike_traffic,
          ped_traffic: safetyData.data[0].ped_traffic
        } : null
      });

      // Filter incidents that have traffic data
      let incidentsWithTrafficData = safetyData.data.filter(inc => inc.hasTrafficData);

      

      if (incidentsWithTrafficData.length === 0) {
        console.warn('No traffic data available for current extent, trying without extent...');
        
        // Try querying without extent to see if we can get any data
        const safetyDataWithoutExtent = await SafetyIncidentsDataService.getEnrichedSafetyData(
          undefined,
          filters
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
          {}
        );
        
        console.log('Data without filters:', {
          totalIncidents: safetyDataNoFilters.data.length,
          incidentsWithTrafficData: safetyDataNoFilters.data.filter(inc => inc.hasTrafficData).length
        });
        
        // Create a visualization using all incidents with severity-based scoring
        const allIncidents = safetyData.data.length > 0 ? safetyData.data : 
                           safetyDataWithoutExtent?.data.length > 0 ? safetyDataWithoutExtent.data :
                           safetyDataNoFilters.data;
        
        if (allIncidents.length === 0) {
          console.warn('No incidents available');
          incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
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
        
        // Create a custom renderer for severity-based visualization
        const severityRenderer = new (await import("@arcgis/core/renderers/HeatmapRenderer")).default({
          field: "normalizedSeverityScore", // Use our severity score field
          blurRadius: 20,
          maxDensity: 0.015,
          minDensity: 0,
          colorStops: [
            { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
            { ratio: 0.05, color: "rgba(0, 150, 0, 0.3)" }, // Dark green - very low risk
            { ratio: 0.2, color: "rgba(50, 205, 50, 0.5)" }, // Lime green - low risk
            { ratio: 0.4, color: "rgba(173, 255, 47, 0.6)" }, // Yellow-green - low-med risk
            { ratio: 0.6, color: "rgba(255, 255, 0, 0.7)" }, // Yellow - medium risk
            { ratio: 0.8, color: "rgba(255, 165, 0, 0.8)" }, // Orange - high risk
            { ratio: 0.95, color: "rgba(255, 69, 0, 0.9)" }, // Orange-red - very high risk
            { ratio: 1.0, color: "rgba(220, 20, 60, 1.0)" } // Crimson - extreme risk
          ]
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
        // Calculate traffic level score (Low=1, Medium=2, High=3) - case insensitive
        const getTrafficScore = (level: string | undefined) => {
          if (!level) return 1;
          const normalizedLevel = level.toLowerCase();
          if (normalizedLevel === 'high') return 3;
          if (normalizedLevel === 'medium') return 2;
          return 1; // low or unknown
        };
        
        const bikeTrafficScore = getTrafficScore(incident.bikeTrafficLevel);
        const pedTrafficScore = getTrafficScore(incident.pedTrafficLevel);
        
        // Use the higher traffic level for visualization
        const trafficLevel = Math.max(bikeTrafficScore, pedTrafficScore);
        const normalizedTrafficLevel = trafficLevel / 3; // Normalize to 0-1 scale
        
        const feature = {
          geometry: incident.geometry,
          attributes: {
            objectid: incident.OBJECTID || index + 1, // Ensure we have a valid objectid
            id: incident.id,
            bikeTrafficLevel: incident.bikeTrafficLevel || 'low',
            pedTrafficLevel: incident.pedTrafficLevel || 'low',
            trafficLevel: trafficLevel,
            normalizedTrafficLevel: normalizedTrafficLevel, // Use this for visualization
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
        source: trafficFeatures,
        title: "Traffic-Based Safety Incidents",
        objectIdField: "objectid",
        fields: [
          { name: "objectid", type: "oid" },
          { name: "id", type: "integer" },
          { name: "bikeTrafficLevel", type: "string" },
          { name: "pedTrafficLevel", type: "string" },
          { name: "trafficLevel", type: "integer" },
          { name: "normalizedTrafficLevel", type: "double" },
          { name: "severity", type: "string" },
          { name: "data_source", type: "string" }
        ],
        geometryType: "point",
        spatialReference: mapView.spatialReference
      });

      // Add the new traffic layer
      mapView.map.add(trafficLayer);
      
      console.log('Traffic layer created and added:', {
        layerTitle: trafficLayer.title,
        featureCount: trafficFeatures.length,
        fields: trafficLayer.fields?.map(f => f.name),
        renderer: trafficLayer.renderer
      });
      
      // Create a custom renderer for traffic-based visualization
      const trafficRenderer = new (await import("@arcgis/core/renderers/HeatmapRenderer")).default({
        field: "normalizedTrafficLevel", // Use our traffic level field
        blurRadius: 20,
        maxDensity: 0.015,
        minDensity: 0,
        colorStops: [
          { ratio: 0, color: "rgba(255, 255, 255, 0)" }, // Transparent
          { ratio: 0.05, color: "rgba(0, 150, 0, 0.3)" }, // Dark green - very low risk
          { ratio: 0.2, color: "rgba(50, 205, 50, 0.5)" }, // Lime green - low risk
          { ratio: 0.4, color: "rgba(173, 255, 47, 0.6)" }, // Yellow-green - low-med risk
          { ratio: 0.6, color: "rgba(255, 255, 0, 0.7)" }, // Yellow - medium risk
          { ratio: 0.8, color: "rgba(255, 165, 0, 0.8)" }, // Orange - high risk
          { ratio: 0.95, color: "rgba(255, 69, 0, 0.9)" }, // Orange-red - very high risk
          { ratio: 1.0, color: "rgba(220, 20, 60, 1.0)" } // Crimson - extreme risk
        ]
      });
      
      trafficLayer.renderer = trafficRenderer;

      console.log('Renderer applied to traffic layer:', {
        rendererField: trafficRenderer.field,
        rendererBlurRadius: trafficRenderer.blurRadius,
        layerVisible: trafficLayer.visible
      });

      // Cache the traffic layer and extent key for future use
      setCachedWeightedLayer(trafficLayer);
      setCachedExtentKey(currentCacheKey);
  

      // Hide the regular incidents layer and show the traffic layer
      incidentsLayer.visible = false;
      trafficLayer.visible = true;
      
      console.log('Layer visibility set:', {
        incidentsLayerVisible: incidentsLayer.visible,
        trafficLayerVisible: trafficLayer.visible
      });

    } catch (error) {
  
      // Fallback to regular heatmap
      if (incidentsLayer) {
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
        incidentsLayer.visible = true;
      }
    }
  }
}