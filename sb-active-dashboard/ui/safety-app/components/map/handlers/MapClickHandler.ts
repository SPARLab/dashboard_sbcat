import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { SafetyFilters, SafetyVisualizationType } from "../../../../../lib/safety-app/types";
import { generateIncidentPopupContent } from "../../../utils/popupContentGenerator";
import { StravaSegmentHighlightService } from "../../../../../lib/safety-app/StravaSegmentHighlightService";

export class MapClickHandler {
  private static lastClickTime = 0;
  private static readonly CLICK_DEBOUNCE_MS = 300; // Prevent rapid clicks
  private static highlightService: StravaSegmentHighlightService | null = null;
  
  static setupClickHandler(
    mapView: __esri.MapView,
    incidentsLayer: FeatureLayer | null,
    jitteredIncidentsLayer: FeatureLayer | null,
    filters: Partial<SafetyFilters>,
    activeVisualization: SafetyVisualizationType
  ): __esri.Handle {
    // Initialize highlight service if not already done
    if (!this.highlightService) {
      this.highlightService = new StravaSegmentHighlightService();
      this.highlightService.initialize(mapView);
    }
    const handleMapClick = async (event: any) => {
      try {
        // Debounce rapid clicks to prevent multiple requests
        const now = Date.now();
        if (now - this.lastClickTime < this.CLICK_DEBOUNCE_MS) {
          return;
        }
        this.lastClickTime = now;
        
        // First try hit test for point symbols (works for raw incidents)
        const response = await mapView.hitTest(event);
        
        let graphicHit = null;
        let stravaSegmentHit = null;
        
        if (response.results.length > 0) {
          // Check if we clicked on a Strava segment (line geometry)
          const stravaHits = response.results.filter((result: any) =>
            result.graphic && 
            result.graphic.geometry?.type === 'polyline' &&
            (result.graphic.attributes?.id || result.graphic.attributes?.strava_id)
          );

          if (stravaHits.length > 0) {
            stravaSegmentHit = stravaHits[0];
          }

          // Check if we clicked on an incident feature
          const graphicHits = response.results.filter((result: any) =>
            result.graphic && (
              result.graphic.layer === incidentsLayer ||
              result.graphic.layer === jitteredIncidentsLayer ||
              result.graphic.layer?.title === "Weighted Safety Incidents" ||
              result.graphic.layer?.title === "Raw Safety Incidents (Test)"
            )
          );

          if (graphicHits.length > 0) {
            graphicHit = graphicHits[0];
          }
        }

        // Priority 1: Handle Strava segment click
        if (stravaSegmentHit && incidentsLayer && jitteredIncidentsLayer) {
          const stravaId = stravaSegmentHit.graphic.attributes.id || 
                          stravaSegmentHit.graphic.attributes.strava_id;
          
          if (stravaId && this.highlightService) {
            console.log(`🔵 Clicked on Strava segment: ${stravaId}`);
            await this.highlightService.highlightSegmentAndIncidents(
              stravaId, 
              incidentsLayer,
              jitteredIncidentsLayer
            );
            event.stopPropagation();
            return;
          }
        }

        // Priority 2: Handle incident click
        if (graphicHit) {
          await MapClickHandler.showIncidentPopup(mapView, graphicHit.graphic, event.mapPoint, filters);
          // Stop event propagation to prevent boundary selection changes
          event.stopPropagation();
          return; // Early return to prevent further processing
        }

        // Priority 3: For heatmap visualizations, if no direct hit, query the layer at the click point
        if (!graphicHit && (activeVisualization === 'incident-heatmap' || activeVisualization === 'incident-to-volume-ratio')) {
          const currentLayer = activeVisualization === 'incident-to-volume-ratio' 
            ? mapView.map.layers.find((layer: any) => layer.title === "Weighted Safety Incidents")
            : incidentsLayer;
            
          if (currentLayer) {
            graphicHit = await MapClickHandler.queryLayerAtPoint(currentLayer as FeatureLayer, event.mapPoint);
            
            if (graphicHit) {
              await MapClickHandler.showIncidentPopup(mapView, graphicHit.graphic, event.mapPoint, filters);
              event.stopPropagation();
              return;
            }
          }
        }

        // If nothing was clicked, close popup and clear highlights
        MapClickHandler.closePopup(mapView);
        if (this.highlightService) {
          this.highlightService.clearHighlights();
        }
      } catch (error) {
        console.error('Error handling map click:', error);
      }
    };

    // Add click event listener
    return mapView.on('click', handleMapClick);
  }

  private static async queryLayerAtPoint(layer: FeatureLayer, mapPoint: __esri.Point): Promise<{ graphic: __esri.Graphic } | null> {
    try {
      // Create a small buffer around the click point to find nearby incidents
      const buffer = 100; // meters
      const circle = new Graphic({
        geometry: {
          type: "circle",
          center: mapPoint,
          radius: buffer,
          radiusUnit: "meters"
        } as any
      });

      const query = layer.createQuery();
      query.geometry = circle.geometry;
      query.spatialRelationship = "intersects";
      query.returnGeometry = true;
      query.outFields = ["*"];
      query.num = 1; // Just get the closest one

      const queryResults = await layer.queryFeatures(query);
      
      if (queryResults.features.length > 0) {
        return { graphic: queryResults.features[0] };
      }
      
      return null;
    } catch (queryError) {
      console.warn('Could not query layer for heatmap click:', queryError);
      return null;
    }
  }

  private static async showIncidentPopup(
    mapView: __esri.MapView,
    graphic: __esri.Graphic,
    mapPoint: __esri.Point,
    filters: Partial<SafetyFilters>
  ): Promise<void> {
    const attributes = graphic.attributes;
    
    // For layers that have their own popupTemplate, let ArcGIS handle the popup automatically
    // These layers have async popupTemplates that fetch enriched data
    if (
      graphic.layer?.title === "Raw Safety Incidents (Test)" || 
      graphic.layer?.title === "Raw Safety Incidents" ||
      graphic.layer?.title === "Safety Incidents (Display)" ||
      graphic.layer?.title === "Safety Incidents (Display Layer)"
    ) {
      // Layer has its own popupTemplate - ArcGIS will handle it automatically
      return;
    }

    // Use graphic geometry for better positioning if available
    const popupLocation = graphic.geometry || mapPoint;

    // For now, skip the enriched data fetch to avoid AbortError issues
    // The graphic attributes should contain sufficient information for the popup
    // TODO: Implement proper request cancellation if enriched data is needed
    let enrichedData = null;
    
    // Fetch enriched data to get party information (needed for e-bike detection)
    const incidentId = attributes.id || attributes.incident_id;
    if (incidentId) {
      try {
        const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
          mapView.extent,
          filters
        );
        enrichedData = safetyData.data.find(inc => inc.source_id === incidentId);
      } catch (error) {
        console.warn('Could not fetch enriched incident data:', error);
      }
    }

    // Use enriched data if available, otherwise fall back to graphic attributes
    const incidentData = enrichedData || attributes;

    // Create popup content with better styling
    const popupContent = generateIncidentPopupContent(incidentData);

    // Check if popup is initialized before using it
    if (mapView.popup && typeof mapView.popup.open === 'function') {
      mapView.popup.open({
        title: "Safety Incident Details",
        content: popupContent,
        location: popupLocation
      });
    } else {
      // Fallback: Create a temporary graphic with popup template and simulate a click
      console.warn('Popup not initialized, using fallback method');
      
      // Create a temporary graphic with the popup content
      const tempGraphic = new Graphic({
        geometry: popupLocation,
        attributes: attributes,
        popupTemplate: {
          title: "Safety Incident Details",
          content: popupContent
        }
      });
      
      // Add to map temporarily and trigger popup
      const tempLayer = new GraphicsLayer();
      tempLayer.add(tempGraphic);
      mapView.map.add(tempLayer);
      
      // Try to open popup with features array
      try {
        mapView.popup.open({
          features: [tempGraphic],
          location: popupLocation
        });
      } catch (error) {
        console.error('Failed to open popup with fallback method:', error);
      }
      
      // Clean up after a short delay
      setTimeout(() => {
        mapView.map.remove(tempLayer);
      }, 100);
    }
  }

  private static closePopup(mapView: __esri.MapView): void {
    if (mapView.popup && typeof mapView.popup.close === 'function') {
      mapView.popup.close();
    }
  }

  /**
   * Cleanup method to destroy the highlight service
   */
  static cleanup(): void {
    if (this.highlightService) {
      this.highlightService.destroy();
      this.highlightService = null;
    }
  }
}