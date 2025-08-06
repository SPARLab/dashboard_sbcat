import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SafetyIncidentsDataService } from "../../../../../lib/data-services/SafetyIncidentsDataService";
import { SafetyFilters, SafetyVisualizationType } from "../../../../../lib/safety-app/types";
import { generateIncidentPopupContent } from "../../../utils/popupContentGenerator";

export class MapClickHandler {
  static setupClickHandler(
    mapView: __esri.MapView,
    incidentsLayer: FeatureLayer | null,
    filters: Partial<SafetyFilters>,
    activeVisualization: SafetyVisualizationType
  ): __esri.Handle {
    const handleMapClick = async (event: any) => {
      try {
        // First try hit test for point symbols (works for raw incidents)
        const response = await mapView.hitTest(event);
        
        let graphicHit = null;
        
        if (response.results.length > 0) {
          // Check if we clicked on an incident feature
          const graphicHits = response.results.filter((result: any) =>
            result.graphic && (
              result.graphic.layer === incidentsLayer ||
              result.graphic.layer?.title === "Weighted Safety Incidents" ||
              result.graphic.layer?.title === "Raw Safety Incidents (Test)"
            )
          );

          if (graphicHits.length > 0) {
            graphicHit = graphicHits[0];
          }
        }

        // For heatmap visualizations, if no direct hit, query the layer at the click point
        if (!graphicHit && (activeVisualization === 'incident-heatmap' || activeVisualization === 'incident-to-volume-ratio')) {
          const currentLayer = activeVisualization === 'incident-to-volume-ratio' 
            ? mapView.map.layers.find((layer: any) => layer.title === "Weighted Safety Incidents")
            : incidentsLayer;
            
          if (currentLayer) {
            graphicHit = await MapClickHandler.queryLayerAtPoint(currentLayer as FeatureLayer, event.mapPoint);
          }
        }

        if (graphicHit) {
          await MapClickHandler.showIncidentPopup(mapView, graphicHit.graphic, event.mapPoint, filters);
          // Stop event propagation to prevent boundary selection changes
          event.stopPropagation();
          return; // Early return to prevent further processing
        } else {
          // Close popup if clicking somewhere else
          MapClickHandler.closePopup(mapView);
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
    
    // Skip manual popup for Raw Safety Incidents layer - it has its own popupTemplate
    if (graphic.layer?.title === "Raw Safety Incidents (Test)") {
      return;
    }

    // Try to get more detailed incident information if available
    let enrichedData = null;
    const incidentId = attributes.id || attributes.incident_id;
    
    if (incidentId) {
      try {
        // Get enriched data for this specific incident
        const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
          mapView.extent,
          filters
        );
        enrichedData = safetyData.data.find(inc => inc.id === incidentId);
      } catch (error) {
        console.warn('Could not fetch enriched incident data:', error);
      }
    }

    // Use enriched data if available, otherwise fall back to graphic attributes
    const incidentData = enrichedData || attributes;

    // Create popup content with better styling
    const popupContent = generateIncidentPopupContent(incidentData);

    // Set popup content and location
    if (mapView.popup) {
      mapView.popup.open({
        title: "Safety Incident Details",
        content: popupContent,
        location: mapPoint
      });
    } else {
      // Alternative approach using openPopup method
      (mapView as any).openPopup({
        title: "Safety Incident Details",
        content: popupContent,
        location: mapPoint
      });
    }
  }

  private static closePopup(mapView: __esri.MapView): void {
    if (mapView.popup) {
      mapView.popup.close();
    } else if ((mapView as any).closePopup) {
      (mapView as any).closePopup();
    }
  }
}