import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Polygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { ArcgisMap } from "@arcgis/map-components-react";
import { Box as MuiBox } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { GeographicBoundariesService } from "../../../../lib/data-services/GeographicBoundariesService";
import { SafetyIncidentsDataService } from "../../../../lib/data-services/SafetyIncidentsDataService";
import { IncidentHeatmapRenderer } from "../../../../lib/safety-app/renderers/IncidentHeatmapRenderer";
import { IncidentVolumeRatioRenderer } from "../../../../lib/safety-app/renderers/IncidentVolumeRatioRenderer";
import { RawIncidentRenderer } from "../../../../lib/safety-app/renderers/RawIncidentRenderer";
import { SafetyFilters, SafetyVisualizationType } from "../../../../lib/safety-app/types";

interface NewSafetyMapProps {
  activeVisualization: SafetyVisualizationType;
  filters: Partial<SafetyFilters>;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  geographicLevel: string;
  onSelectionChange?: (data: { geometry: Polygon | null; areaName?: string | null } | null) => void;
}

export default function NewSafetyMap({ 
  activeVisualization,
  filters,
  onMapViewReady,
  geographicLevel,
  onSelectionChange
}: NewSafetyMapProps) {
  const mapViewRef = useRef<any>(null);
  const [viewReady, setViewReady] = useState(false);

  // Layer state
  const [incidentsLayer, setIncidentsLayer] = useState<FeatureLayer | null>(null);
  const [partiesLayer, setPartiesLayer] = useState<FeatureLayer | null>(null);
  const [weightsLayer, setWeightsLayer] = useState<FeatureLayer | null>(null);
  
  // Boundary service state
  const [boundaryService] = useState(() => {
    const service = new GeographicBoundariesService();
    // Set up selection callback if provided
    if (onSelectionChange) {
      service.setSelectionChangeCallback(onSelectionChange);
    }
    return service;
  });

  // Data loading state
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Handler to set map center/zoom when view is ready
  const handleArcgisViewReadyChange = (event: { target: { view: __esri.MapView } }) => {
    if (event?.target?.view) {
      const mapView = event.target.view;
      mapViewRef.current = mapView;
      
      // Set initial view with proper completion handling
      mapView.goTo({
        center: [-120, 34.7],
        zoom: 9,
      }).then(() => {
        // Only mark as ready after the initial navigation completes
        setViewReady(true);
        
        // Pass mapView back to parent component  
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
        
        console.log('[DEBUG] Safety map view initialization completed successfully');
      }).catch((error: Error) => {
        console.error('[DEBUG] Safety map view initialization failed:', error);
        // Still mark as ready even if navigation fails
        setViewReady(true);
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
      });
    }
  };

  // Initialize safety data layers when map view is ready
  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;

    const initializeLayers = async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        // Initialize the feature layers
        const layers = SafetyIncidentsDataService.initializeLayers();
        
        setIncidentsLayer(layers.incidentsLayer);
        setPartiesLayer(layers.partiesLayer);
        setWeightsLayer(layers.weightsLayer);

        // Add boundary layers to map
        const boundaryLayers = boundaryService.getBoundaryLayers();
        boundaryLayers.forEach(layer => mapViewRef.current.map.add(layer));

        // Add layers to map
        mapViewRef.current.map.addMany([
          layers.incidentsLayer,
          // Note: parties and weights layers are not added to map as they're for data only
        ]);

        console.log('[DEBUG] Safety layers initialized successfully');
        setDataLoading(false);

      } catch (error) {
        console.error('[DEBUG] Failed to initialize safety layers:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to load safety data');
        setDataLoading(false);
      }
    };

    initializeLayers();
  }, [viewReady]);

  // Setup map click handlers for incident popups
  useEffect(() => {
    if (!viewReady || !mapViewRef.current || !incidentsLayer) return;

    const handleMapClick = async (event: any) => {
      try {
        // First try hit test for point symbols (works for raw incidents)
        const response = await mapViewRef.current!.hitTest(event);
        
        let graphicHit = null;
        
        if (response.results.length > 0) {
          // Check if we clicked on an incident feature
          const graphicHits = response.results.filter((result: any) => 
            result.graphic && (
              result.graphic.layer === incidentsLayer || 
              result.graphic.layer?.title === "Weighted Safety Incidents"
            )
          );

          if (graphicHits.length > 0) {
            graphicHit = graphicHits[0];
          }
        }

        // For heatmap visualizations, if no direct hit, query the layer at the click point
        if (!graphicHit && (activeVisualization === 'incident-heatmap' || activeVisualization === 'incident-to-volume-ratio')) {
          const currentLayer = activeVisualization === 'incident-to-volume-ratio' 
            ? mapViewRef.current!.map.layers.find((layer: any) => layer.title === "Weighted Safety Incidents")
            : incidentsLayer;
            
          if (currentLayer) {
            // Create a small buffer around the click point to find nearby incidents
            const buffer = 100; // meters
            const point = event.mapPoint;
            const circle = new Graphic({
              geometry: {
                type: "circle",
                center: point,
                radius: buffer,
                radiusUnit: "meters"
              } as any
            });

            try {
              const query = (currentLayer as any).createQuery();
              query.geometry = circle.geometry;
              query.spatialRelationship = "intersects";
              query.returnGeometry = true;
              query.outFields = ["*"];
              query.num = 1; // Just get the closest one

              const queryResults = await (currentLayer as any).queryFeatures(query);
              
              if (queryResults.features.length > 0) {
                graphicHit = { graphic: queryResults.features[0] };
              }
            } catch (queryError) {
              console.warn('Could not query layer for heatmap click:', queryError);
            }
          }
        }

        if (graphicHit) {
            const graphic = graphicHit.graphic;
            const attributes = graphic.attributes;

            // Try to get more detailed incident information if available
            let enrichedData = null;
            const incidentId = attributes.id || attributes.incident_id;
            
            if (incidentId) {
              try {
                // Get enriched data for this specific incident
                const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
                  mapViewRef.current!.extent,
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
            let popupContent = `
              <div class="incident-popup" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; color: #333;">
                <style>
                  .incident-popup p { margin: 8px 0; }
                  .incident-popup strong { color: #2563eb; }
                  .incident-popup .section { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
                  .incident-popup .section:last-child { border-bottom: none; margin-bottom: 0; }
                  .incident-popup .parties { background: #f8fafc; padding: 8px; border-radius: 4px; margin-top: 8px; }
                </style>
            `;
            
            // Basic incident information section
            popupContent += '<div class="section">';
            if (incidentData.id) {
              popupContent += `<p><strong>Incident ID:</strong> ${incidentData.id}</p>`;
            }
            
            if (incidentData.data_source) {
              popupContent += `<p><strong>Source:</strong> ${incidentData.data_source}</p>`;
            }
            
            if (incidentData.timestamp) {
              const date = new Date(incidentData.timestamp);
              popupContent += `<p><strong>Date:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>`;
            }
            popupContent += '</div>';

            // Incident details section
            popupContent += '<div class="section">';
            if (incidentData.conflict_type) {
              popupContent += `<p><strong>Conflict Type:</strong> ${incidentData.conflict_type}</p>`;
            }

            // Severity information
            const severity = incidentData.severity || incidentData.maxSeverity;
            if (severity) {
              const severityColor = severity === 'Fatality' ? '#dc2626' : 
                                  severity === 'Severe Injury' ? '#ea580c' : 
                                  severity === 'Injury' ? '#d97706' : '#65a30d';
              popupContent += `<p><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${severity}</span></p>`;
            }

            // Involvement flags
            const involvement = [];
            if (incidentData.pedestrian_involved) involvement.push('Pedestrian');
            if (incidentData.bicyclist_involved) involvement.push('Bicyclist');
            if (incidentData.vehicle_involved) involvement.push('Vehicle');
            
            if (involvement.length > 0) {
              popupContent += `<p><strong>Involved:</strong> ${involvement.join(', ')}</p>`;
            }
            popupContent += '</div>';

            // Risk/weight information for incident-to-volume ratio
            if (attributes.weightedExposure || (enrichedData && enrichedData.weightedExposure)) {
              popupContent += '<div class="section">';
              const weight = attributes.weightedExposure || enrichedData.weightedExposure;
              popupContent += `<p><strong>Risk Weight:</strong> ${weight.toFixed(3)}</p>`;
              popupContent += '<p style="font-size: 0.85em; color: #6b7280;">Higher values indicate greater risk relative to traffic volume</p>';
              popupContent += '</div>';
            }

            // Parties information if available
            if (enrichedData && enrichedData.parties && enrichedData.parties.length > 0) {
              popupContent += '<div class="section">';
              popupContent += '<p><strong>Parties Involved:</strong></p>';
              popupContent += '<div class="parties">';
              
              enrichedData.parties.forEach((party, index) => {
                popupContent += `<div style="margin-bottom: 6px;">`;
                popupContent += `<strong>Party ${party.party_number || index + 1}:</strong> `;
                
                if (party.party_type) {
                  popupContent += `${party.party_type}`;
                }
                
                if (party.injury_severity) {
                  const injuryColor = party.injury_severity === 'Fatal' ? '#dc2626' : 
                                     party.injury_severity === 'Severe Injury' ? '#ea580c' : 
                                     party.injury_severity === 'Other Visible Injury' ? '#d97706' : '#65a30d';
                  popupContent += ` - <span style="color: ${injuryColor};">${party.injury_severity}</span>`;
                }
                
                if (party.age) {
                  popupContent += ` (Age: ${party.age})`;
                }
                
                popupContent += '</div>';
              });
              
              popupContent += '</div></div>';
            }

            popupContent += '</div>';

            // Set popup content and location
            mapViewRef.current!.popup.open({
              title: "Safety Incident Details",
              content: popupContent,
              location: event.mapPoint
            });

            // Stop event propagation to prevent boundary selection changes
            event.stopPropagation();
            return; // Early return to prevent further processing
        } else {
          // Close popup if clicking somewhere else
          mapViewRef.current!.popup.close();
        }
      } catch (error) {
        console.error('Error handling map click:', error);
      }
    };

    // Add click event listener
    const clickHandle = mapViewRef.current.on('click', handleMapClick);

    return () => {
      if (clickHandle) {
        clickHandle.remove();
      }
    };
  }, [viewReady, incidentsLayer, activeVisualization, filters]);

  // Update layers when active visualization changes
  useEffect(() => {
    if (!incidentsLayer || !viewReady) return;

    const updateVisualization = async () => {
      try {
        setDataLoading(true);

        // Clean up any existing weighted layer if not using incident-to-volume-ratio
        if (activeVisualization !== 'incident-to-volume-ratio') {
          const existingWeightedLayer = mapViewRef.current.map.layers.find(
            (layer: any) => layer.title === "Weighted Safety Incidents"
          );
          if (existingWeightedLayer) {
            mapViewRef.current.map.remove(existingWeightedLayer);
          }
        }

        // Remove any existing renderer or feature reduction
        incidentsLayer.featureReduction = null;
        incidentsLayer.renderer = null;

        switch (activeVisualization) {
          case 'raw-incidents':
            // Use raw incident renderer with points
            incidentsLayer.renderer = RawIncidentRenderer.getRenderer('severity', filters);
            incidentsLayer.visible = true;
            break;

          case 'incident-heatmap':
            // Use heatmap renderer for density visualization
            incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
            incidentsLayer.visible = true;
            break;

          case 'incident-to-volume-ratio':
            // Use exposure-weighted heatmap renderer
            if (weightsLayer) {
              // For this visualization, we need to join incident and weight data
              await createWeightedVisualization();
            } else {
              console.warn('Weights layer not available for incident-to-volume ratio visualization');
              // Fallback to regular heatmap
              incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
              incidentsLayer.visible = true;
            }
            break;

          default:
            incidentsLayer.visible = false;
            break;
        }

        setDataLoading(false);
      } catch (error) {
        console.error('[DEBUG] Failed to update visualization:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to update visualization');
        setDataLoading(false);
      }
    };

    updateVisualization();
  }, [activeVisualization, filters, incidentsLayer, weightsLayer]);

  // Create weighted visualization for incident-to-volume ratio
  const createWeightedVisualization = async () => {
    if (!incidentsLayer || !weightsLayer || !mapViewRef.current) return;

    try {
      // Query incidents and weights for current map extent
      const safetyData = await SafetyIncidentsDataService.getEnrichedSafetyData(
        mapViewRef.current.extent,
        filters
      );

      // Filter incidents that have weight data
      const weightedIncidents = safetyData.data.filter(inc => inc.hasWeight && inc.weightedExposure);

      if (weightedIncidents.length === 0) {
        console.warn('No weighted incident data available for current extent');
        // Fallback to regular heatmap
        incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
        incidentsLayer.visible = true;
        return;
      }

      // Since HeatmapRenderer only works with FeatureLayer, we need to create a client-side FeatureLayer
      // with the weighted data
      
      // Create features array for client-side feature layer
      const weightedFeatures = weightedIncidents.map(incident => ({
        geometry: incident.geometry,
        attributes: {
          objectid: incident.OBJECTID,
          id: incident.id,
          weightedExposure: incident.weightedExposure || 0,
          severity: incident.maxSeverity || 'unknown',
          data_source: incident.data_source || 'unknown'
        }
      }));

      // Remove existing weighted layer if it exists
      const existingWeightedLayer = mapViewRef.current.map.layers.find(
        (layer: any) => layer.title === "Weighted Safety Incidents"
      );
      if (existingWeightedLayer) {
        mapViewRef.current.map.remove(existingWeightedLayer);
      }

      // Create a client-side FeatureLayer for the weighted data
      const weightedLayer = new FeatureLayer({
        source: weightedFeatures,
        title: "Weighted Safety Incidents",
        objectIdField: "objectid",
        fields: [
          { name: "objectid", type: "oid" },
          { name: "id", type: "integer" },
          { name: "weightedExposure", type: "double" },
          { name: "severity", type: "string" },
          { name: "data_source", type: "string" }
        ],
        geometryType: "point",
        spatialReference: mapViewRef.current.spatialReference
      });

      // Add the new weighted layer
      mapViewRef.current.map.add(weightedLayer);

      // Apply the heatmap renderer to the new FeatureLayer
      const renderer = IncidentVolumeRatioRenderer.getRenderer('exposure', filters);
      
      // Adjust renderer based on data characteristics
      const exposureValues = weightedIncidents
        .map(inc => inc.weightedExposure || 0)
        .filter(val => val > 0);
      
      if (exposureValues.length > 0) {
        const minExposure = Math.min(...exposureValues);
        const maxExposure = Math.max(...exposureValues);
        const adjustedRenderer = IncidentVolumeRatioRenderer.adjustForDataRange(
          renderer,
          minExposure,
          maxExposure,
          weightedIncidents.length
        );
        weightedLayer.renderer = adjustedRenderer;
      } else {
        weightedLayer.renderer = renderer;
      }

      // Hide the regular incidents layer and show the weighted layer
      incidentsLayer.visible = false;
      weightedLayer.visible = true;

    } catch (error) {
      console.error('[DEBUG] Failed to create weighted visualization:', error);
      // Fallback to regular heatmap
      incidentsLayer.renderer = IncidentHeatmapRenderer.getRenderer('density', filters);
      incidentsLayer.visible = true;
    }
  };

  // Update boundary visualization based on geographic level
  useEffect(() => {
    if (!viewReady || !boundaryService || !mapViewRef.current) return;

    const updateBoundaries = async () => {
      try {
        // Convert geographicLevel to the format expected by boundary service
        let boundaryLevel: any = 'city';
        switch (geographicLevel) {
          case 'cities':
            boundaryLevel = 'city';
            break;
          case 'counties':
            boundaryLevel = 'county';
            break;
          case 'census-tracts':
            boundaryLevel = 'census-tract';
            break;
          case 'city-service-areas':
            boundaryLevel = 'city-service-area';
            break;
          default:
            boundaryLevel = 'city';
        }

        await boundaryService.switchGeographicLevel(boundaryLevel, mapViewRef.current);
        
      } catch (error) {
        console.error('[DEBUG] Failed to update boundaries:', error);
      }
    };

    updateBoundaries();
  }, [viewReady, geographicLevel, boundaryService]);

  // Handle extent changes to refresh data
  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;

    const handle = reactiveUtils.when(
      () => mapViewRef.current?.stationary,
      () => {
        if (mapViewRef.current?.stationary && incidentsLayer) {
          // Refresh visualization when map stops moving
          console.log('[DEBUG] Map extent changed, refreshing safety data');
          // The layer will automatically re-query based on the new extent
        }
      }
    );

    return () => handle.remove();
  }, [viewReady, incidentsLayer]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (boundaryService) {
        boundaryService.cleanupInteractivity();
      }
      
      // Clean up weighted layer
      if (mapViewRef.current) {
        const existingWeightedLayer = mapViewRef.current.map.layers.find(
          (layer: any) => layer.title === "Weighted Safety Incidents"
        );
        if (existingWeightedLayer) {
          mapViewRef.current.map.remove(existingWeightedLayer);
        }
      }
    };
  }, [boundaryService]);

  return (
    <MuiBox
      id="new-safety-map-container"
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Loading overlay */}
      {dataLoading && (
        <MuiBox
          id="safety-map-loading-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <div id="safety-map-loading-text" className="text-gray-600 font-medium">
            Loading safety data...
          </div>
        </MuiBox>
      )}

      {/* Error overlay */}
      {dataError && (
        <MuiBox
          id="safety-map-error-overlay"
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            padding: 2,
            borderRadius: 1,
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
        >
          <div id="safety-map-error-text" className="font-medium">
            Error: {dataError}
          </div>
          <button
            id="safety-map-error-dismiss"
            onClick={() => setDataError(null)}
            className="mt-2 px-3 py-1 bg-white bg-opacity-20 rounded text-sm hover:bg-opacity-30"
          >
            Dismiss
          </button>
        </MuiBox>
      )}

      {/* Map component */}
      <ArcgisMap
        basemap="topo-vector"
        onArcgisViewReadyChange={handleArcgisViewReadyChange}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Visualization info overlay */}
      <MuiBox
        id="safety-visualization-info"
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: 2,
          borderRadius: 1,
          boxShadow: 1,
          maxWidth: 300,
          fontSize: '0.875rem'
        }}
      >
        <div id="safety-visualization-title" className="font-medium text-gray-900 mb-1">
          {activeVisualization === 'raw-incidents' && 'Raw Safety Incidents'}
          {activeVisualization === 'incident-heatmap' && 'Incident Density Heatmap'}
          {activeVisualization === 'incident-to-volume-ratio' && 'Incident to Volume Ratio'}
        </div>
        <div id="safety-visualization-description" className="text-gray-600 text-xs">
          {activeVisualization === 'raw-incidents' && 'Individual incidents colored by severity level'}
          {activeVisualization === 'incident-heatmap' && 'Areas with higher incident density shown in warmer colors'}
          {activeVisualization === 'incident-to-volume-ratio' && 'Risk areas based on incidents relative to traffic volume'}
        </div>
      </MuiBox>
    </MuiBox>
  );
}