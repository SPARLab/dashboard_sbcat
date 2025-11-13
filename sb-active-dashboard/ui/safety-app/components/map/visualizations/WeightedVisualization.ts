import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { IncidentHeatmapRenderer } from "../../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { IncidentVolumeRatioRenderer } from "../../../../../lib/safety-app/renderers/IncidentVolumeRatioRenderer";
import { SafetyFilters } from "../../../../../lib/safety-app/types";
import { getNormalizationWeight, VolumeWeightConfig, RiskCategoryFilters, UNIFORM_HEATMAP_WEIGHT } from "../../../../../lib/safety-app/utils/incidentRiskMatrix";
import { VolumeCategoryLayers } from "../../../hooks/useLayerCache";

export class WeightedVisualization {
  static async createVisualization(
    mapView: __esri.MapView,
    filters: Partial<SafetyFilters>,
    incidentsLayer: FeatureLayer | null,
    cachedWeightedLayer: FeatureLayer | null,
    cachedExtentKey: string | null,
    generateCacheKey: (extent: __esri.Extent, filters: Partial<SafetyFilters>, weights?: VolumeWeightConfig | RiskCategoryFilters) => string,
    setCachedWeightedLayer: (layer: FeatureLayer | null) => void,
    setCachedExtentKey: (key: string | null) => void,
    customWeights?: VolumeWeightConfig,
    riskFilters?: RiskCategoryFilters,
    cachedVolumeLayers?: VolumeCategoryLayers,
    setCachedVolumeLayers?: (layers: VolumeCategoryLayers) => void,
    volumeLayersCacheKey?: string | null,
    setVolumeLayersCacheKey?: (key: string | null) => void
  ): Promise<void> {
    if (!incidentsLayer || !mapView) return;

    try {
      // Check if we can use cached volume category layers
      const currentCacheKey = generateCacheKey(mapView.extent, filters, riskFilters);
      
      // Check if we have valid cached layers for the volume categories
      if (
        cachedVolumeLayers && 
        volumeLayersCacheKey === currentCacheKey &&
        cachedVolumeLayers.low && 
        cachedVolumeLayers.medium && 
        cachedVolumeLayers.high
      ) {
        console.log('✅ Using cached volume category layers - no loading spinner!');
        
        // Hide the regular incidents layer
        incidentsLayer.visible = false;
        
        // Show cached volume category layers with correct visibility
        cachedVolumeLayers.low.visible = riskFilters?.low !== false;
        cachedVolumeLayers.medium.visible = riskFilters?.medium !== false;
        cachedVolumeLayers.high.visible = riskFilters?.high !== false;
        
        // Make sure all cached layers are in the map
        if (!mapView.map.layers.includes(cachedVolumeLayers.low)) {
          mapView.map.add(cachedVolumeLayers.low);
        }
        if (!mapView.map.layers.includes(cachedVolumeLayers.medium)) {
          mapView.map.add(cachedVolumeLayers.medium);
        }
        if (!mapView.map.layers.includes(cachedVolumeLayers.high)) {
          mapView.map.add(cachedVolumeLayers.high);
        }
        
        return;
      }
      
      console.log('🔄 Creating new volume category layers (first time or cache invalid)...');

      // Query ALL incidents (no extent restriction) so cached layers work at any zoom level
      // This ensures that when users zoom out, they see all incidents, not just those in the original view
      const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
        undefined, // No extent - load all data for caching
        filters
      );



      // Filter incidents that have traffic data
      let incidentsWithTrafficData = safetyData.data.filter(inc => inc.hasTrafficData);

      // If no traffic data available with current filters, try without filters as fallback
      if (incidentsWithTrafficData.length === 0) {
        console.warn('No traffic data available with current filters, trying without filters...');
        
        const safetyDataNoFilters = await SafetyIncidentsDataService.getEnrichedSafetyData(
          undefined,
          {} as any
        );
        
        incidentsWithTrafficData = safetyDataNoFilters.data.filter(inc => inc.hasTrafficData);
        
        // If STILL no traffic data, fall back to severity-based visualization
        if (incidentsWithTrafficData.length === 0) {
          console.warn('No traffic data available even without filters, using severity-based fallback visualization');
          
          const allIncidents = safetyData.data.length > 0 ? safetyData.data : safetyDataNoFilters.data;
          
          if (allIncidents.length === 0) {
            console.warn('No incidents available at all');
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
            source: severityFeatures as any,
            title: "Traffic-Based Safety Incidents",
            objectIdField: "objectid",
            fields: [
              { name: "objectid", type: "oid" as const },
              { name: "id", type: "integer" as const },
              { name: "severity", type: "string" as const },
              { name: "severityScore", type: "integer" as const },
              { name: "normalizedSeverityScore", type: "double" as const },
              { name: "data_source", type: "string" as const }
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
      }

      // Group incidents by risk category (volume level)
      const normalizeLevel = (level: string | undefined): 'Low' | 'Medium' | 'High' => {
        if (!level) return 'Medium';
        const normalized = level.toLowerCase();
        if (normalized === 'high') return 'High';
        if (normalized === 'medium') return 'Medium';
        return 'Low';
      };

      const incidentsByRisk: Record<'Low' | 'Medium' | 'High', any[]> = {
        Low: [],
        Medium: [],
        High: []
      };

      incidentsWithTrafficData.forEach((incident, index) => {
        const bikeLevel = normalizeLevel(incident.bikeTrafficLevel);
        const pedLevel = normalizeLevel(incident.pedTrafficLevel);
        const volumeLevel = incident.bikeTrafficLevel ? bikeLevel : pedLevel;

        const feature = {
          geometry: incident.geometry,
          attributes: {
            objectid: incident.OBJECTID || index + 1,
            id: incident.id,
            bikeTrafficLevel: incident.bikeTrafficLevel || 'Low',
            pedTrafficLevel: incident.pedTrafficLevel || 'Low',
            volumeLevel: volumeLevel,
            normalizedRisk: UNIFORM_HEATMAP_WEIGHT, // All incidents use same weight
            severity: incident.maxSeverity || 'unknown',
            data_source: incident.data_source || 'unknown'
          }
        };

        incidentsByRisk[volumeLevel].push(feature);
      });

      // Only remove existing layers if they're not in our cache (shouldn't happen with proper caching)
      // This prevents unnecessary layer recreation
      const existingLowVolumeLayer = mapView.map.layers.find(
        (layer: any) => layer.title === "Low Volume Incidents"
      );
      const existingMediumVolumeLayer = mapView.map.layers.find(
        (layer: any) => layer.title === "Medium Volume Incidents"
      );
      const existingHighVolumeLayer = mapView.map.layers.find(
        (layer: any) => layer.title === "High Volume Incidents"
      );
      
      // Only remove if they're different from our cached layers
      if (existingLowVolumeLayer && existingLowVolumeLayer !== cachedVolumeLayers?.low) {
        mapView.map.remove(existingLowVolumeLayer);
      }
      if (existingMediumVolumeLayer && existingMediumVolumeLayer !== cachedVolumeLayers?.medium) {
        mapView.map.remove(existingMediumVolumeLayer);
      }
      if (existingHighVolumeLayer && existingHighVolumeLayer !== cachedVolumeLayers?.high) {
        mapView.map.remove(existingHighVolumeLayer);
      }

      // Create separate layers for each risk category with distinct colors
      const HeatmapRenderer = (await import("@arcgis/core/renderers/HeatmapRenderer")).default;
      
      const fieldDefinitions = [
        { name: "objectid", type: "oid" as const },
        { name: "id", type: "integer" as const },
        { name: "bikeTrafficLevel", type: "string" as const },
        { name: "pedTrafficLevel", type: "string" as const },
        { name: "volumeLevel", type: "string" as const },
        { name: "normalizedRisk", type: "double" as const },
        { name: "severity", type: "string" as const },
        { name: "data_source", type: "string" as const }
      ];

      // Low Volume Layer (Red #DC3220)
      const lowVolumeLayer = new FeatureLayer({
        source: incidentsByRisk.Low as any,
        title: "Low Volume Incidents",
        objectIdField: "objectid",
        fields: fieldDefinitions,
        geometryType: "point",
        spatialReference: mapView.spatialReference,
        visible: riskFilters?.low !== false
      });
      
      lowVolumeLayer.renderer = new HeatmapRenderer({
        field: "normalizedRisk",
        radius: 10,
        maxDensity: 0.04,
        minDensity: 0,
        referenceScale: 72224,
        colorStops: IncidentHeatmapRenderer.getColorScheme('low-volume-blue')
      });

      // Medium Volume Layer (Yellow #FFC20A)
      const mediumVolumeLayer = new FeatureLayer({
        source: incidentsByRisk.Medium as any,
        title: "Medium Volume Incidents",
        objectIdField: "objectid",
        fields: fieldDefinitions,
        geometryType: "point",
        spatialReference: mapView.spatialReference,
        visible: riskFilters?.medium !== false
      });
      
      mediumVolumeLayer.renderer = new HeatmapRenderer({
        field: "normalizedRisk",
        radius: 10,
        maxDensity: 0.04,
        minDensity: 0,
        referenceScale: 72224,
        colorStops: IncidentHeatmapRenderer.getColorScheme('medium-volume-yellow')
      });

      // High Volume Layer (Blue #0C7BDC)
      const highVolumeLayer = new FeatureLayer({
        source: incidentsByRisk.High as any,
        title: "High Volume Incidents",
        objectIdField: "objectid",
        fields: fieldDefinitions,
        geometryType: "point",
        spatialReference: mapView.spatialReference,
        visible: riskFilters?.high !== false
      });
      
      highVolumeLayer.renderer = new HeatmapRenderer({
        field: "normalizedRisk",
        radius: 10,
        maxDensity: 0.04,
        minDensity: 0,
        referenceScale: 72224,
        colorStops: IncidentHeatmapRenderer.getColorScheme('high-volume-red')
      });

      // Add all layers to the map
      mapView.map.add(lowVolumeLayer);
      mapView.map.add(mediumVolumeLayer);
      mapView.map.add(highVolumeLayer);

      // Cache all three volume category layers for instant switching
      if (setCachedVolumeLayers && setVolumeLayersCacheKey) {
        setCachedVolumeLayers({
          low: lowVolumeLayer,
          medium: mediumVolumeLayer,
          high: highVolumeLayer
        });
        setVolumeLayersCacheKey(currentCacheKey);
        console.log('💾 Cached all three volume category layers');
      }

      // Hide the regular incidents layer
      incidentsLayer.visible = false;
      


    } catch (error) {
      console.error('Error creating risk category visualization:', error);
      // Fallback to regular heatmap
      if (incidentsLayer) {
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters as any);
        incidentsLayer.visible = true;
      }
    }
  }

  /**
   * Update visibility of volume category layers based on filter settings
   */
  static updateRiskLayerVisibility(
    mapView: __esri.MapView,
    riskFilters?: RiskCategoryFilters
  ): void {
    if (!mapView || !riskFilters) return;

    const lowVolumeLayer = mapView.map.layers.find(
      (layer: any) => layer.title === "Low Volume Incidents"
    );
    const mediumVolumeLayer = mapView.map.layers.find(
      (layer: any) => layer.title === "Medium Volume Incidents"
    );
    const highVolumeLayer = mapView.map.layers.find(
      (layer: any) => layer.title === "High Volume Incidents"
    );

    if (lowVolumeLayer) lowVolumeLayer.visible = riskFilters.low;
    if (mediumVolumeLayer) mediumVolumeLayer.visible = riskFilters.medium;
    if (highVolumeLayer) highVolumeLayer.visible = riskFilters.high;
  }
}