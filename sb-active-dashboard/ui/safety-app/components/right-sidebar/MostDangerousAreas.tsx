import React, { useState, useEffect, useMemo, useRef } from "react";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';
import { SafetyFilters } from "../../../../lib/safety-app/types";
import { useSafetyLayerViewSpatialQuery } from "../../../../lib/hooks/useSpatialQuery";
import { StravaSegmentService } from "../../../../lib/data-services/StravaSegmentService";

interface MostDangerousAreasProps {
  mapView: __esri.MapView | null;
  incidentsLayer: __esri.FeatureLayer | null;
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
}

interface DangerousAreaData {
  location: string;
  incidentCount: number;
  stravaId?: number; // For potential click-to-highlight functionality
}

export default function MostDangerousAreas({ 
  mapView,
  incidentsLayer,
  selectedGeometry = null, 
  filters = {}
}: MostDangerousAreasProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [areasData, setAreasData] = useState<DangerousAreaData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  
  // Service and highlight layer refs
  const stravaServiceRef = useRef<StravaSegmentService | null>(null);
  const highlightLayerRef = useRef<GraphicsLayer | null>(null);

  // Use spatial query to get filtered data
  // Note: Filters are already debounced in SafetyApp, so we use a minimal debounce here (50ms)
  const { result, isLoading: spatialLoading, error: spatialError } = useSafetyLayerViewSpatialQuery(
    mapView,
    incidentsLayer,
    selectedGeometry,
    filters,
    50 // Minimal debounce since filters are already debounced upstream
  );

  // Initialize Strava service and highlight layer
  useEffect(() => {
    if (!stravaServiceRef.current) {
      stravaServiceRef.current = new StravaSegmentService();
    }

    if (mapView && mapView.map && !highlightLayerRef.current) {
      const highlightLayer = new GraphicsLayer({
        id: "safety-dangerous-areas-highlight",
        title: "Most Dangerous Areas Highlight",
        listMode: "hide"
      });
      
      mapView.map.add(highlightLayer);
      highlightLayerRef.current = highlightLayer;
    }

    // Cleanup on unmount
    return () => {
      if (highlightLayerRef.current && mapView && mapView.map) {
        mapView.map.remove(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
    };
  }, [mapView]);

  // Process data when spatial query result changes
  useEffect(() => {
    const processData = async () => {
      if (!result?.incidents || result.incidents.length === 0) {
        setAreasData([]);
        setIsProcessing(false);
        setError(null);
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Group incidents by location (loc_desc field)
        const locationMap = new Map<string, {
          incidents: number;
          stravaId?: number; // Capture first non-null strava_id for this location
        }>();

        // Process each incident
        result.incidents.forEach(incident => {
          const locationKey = incident.loc_desc || 'Unknown Location';
          
          if (!locationMap.has(locationKey)) {
            locationMap.set(locationKey, {
              incidents: 0,
              stravaId: incident.strava_id || undefined
            });
          }
          
          const location = locationMap.get(locationKey)!;
          location.incidents += 1;
          
          // Capture strava_id if we don't have one yet for this location
          if (!location.stravaId && incident.strava_id) {
            location.stravaId = incident.strava_id;
          }
        });

        // Convert to array and get top 5 by incident count
        const processedData: DangerousAreaData[] = Array.from(locationMap.entries())
          .map(([locationName, data]) => ({
            location: locationName,
            incidentCount: data.incidents,
            stravaId: data.stravaId
          }))
          .filter(area => area.incidentCount > 0) // Only include locations with incidents
          .sort((a, b) => b.incidentCount - a.incidentCount) // Sort by incident count (highest first)
          .slice(0, 5); // Take top 5

        setAreasData(processedData);
      } catch (err) {
        console.error('Error processing dangerous areas data:', err);
        setError('Failed to process dangerous areas data');
        setAreasData([]);
      } finally {
        setIsProcessing(false);
      }
    };

    processData();
  }, [result]);

  // Function to highlight a dangerous area on the map using Strava segment
  const highlightArea = async (area: DangerousAreaData) => {
    if (!mapView || !stravaServiceRef.current || !highlightLayerRef.current) {
      return;
    }

    try {
      // Clear previous highlights
      highlightLayerRef.current.removeAll();

      // If we have a strava_id, try to get the segment geometry
      if (area.stravaId) {
        const segmentFeature = await stravaServiceRef.current.getSegmentByStravaId(area.stravaId);
        
        if (segmentFeature && segmentFeature.geometry) {
          // Create yellow halo line (wider, behind the main line)
          const haloSymbol = new SimpleLineSymbol({
            color: [255, 255, 0, 0.8], // Yellow halo
            width: 8,
            style: "solid"
          });

          // Create highlight line symbol
          const lineSymbol = new SimpleLineSymbol({
            color: [220, 38, 127, 1], // Pink/red for dangerous areas
            width: 4,
            style: "solid"
          });

          // Add halo first (so it appears behind)
          const haloGraphic = new Graphic({
            geometry: segmentFeature.geometry,
            symbol: haloSymbol
          });
          highlightLayerRef.current.add(haloGraphic);

          // Add main line on top
          const lineGraphic = new Graphic({
            geometry: segmentFeature.geometry,
            symbol: lineSymbol
          });
          highlightLayerRef.current.add(lineGraphic);

          // Zoom to the segment with some padding
          const zoomExtent = segmentFeature.geometry.extent?.expand(2);
          if (zoomExtent) {
            await mapView.goTo(zoomExtent, { duration: 500 });
          }
        } else {
          console.warn(`No geometry found for strava_id: ${area.stravaId}`);
        }
      } else {
        console.warn(`No strava_id found for location: ${area.location}`);
      }

    } catch (error) {
      console.error('Error highlighting dangerous area:', error);
    }
  };

  // Clear highlights when selection changes
  useEffect(() => {
    if (highlightLayerRef.current) {
      highlightLayerRef.current.removeAll();
    }
  }, [selectedGeometry, filters]);

  const hasData = areasData.length > 0;
  const isLoading = spatialLoading || isProcessing;
  const hasError = spatialError || error;

  return (
    <div id="safety-most-dangerous-areas" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-dangerous-areas-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-dangerous-areas-title" className="text-base font-medium text-gray-700">Most Dangerous Areas</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          {selectedGeometry && (
            <>
              <hr className="border-gray-200 mb-2" />
              <div id="safety-dangerous-areas-description" className="w-full text-sm text-gray-600 mb-1">
                Locations with the highest incident counts and severity scores
                <span id="safety-dangerous-areas-info-icon-container" className="ml-1 inline-flex align-middle">
                  <MoreInformationIcon 
                    text="Highlights areas within the selected region that have the highest number of safety incidents. Click on a location for a closer view."
                    align="center"
                    width="w-72"
                    yOffset="-0.15rem"
                  />
                </span>
              </div>
            </>
          )}

          {/* No selection state */}
          {!selectedGeometry && (
            <div id="safety-dangerous-areas-no-selection" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
              <div id="safety-dangerous-areas-instruction-icon" className="mb-2 text-gray-400">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p id="safety-dangerous-areas-instruction-text" className="text-sm text-gray-600 mb-1">
                Select a region on the map
              </p>
              <p id="safety-dangerous-areas-instruction-subtext" className="text-xs text-gray-500">
                Use the polygon tool or click on a boundary to see dangerous areas for that region
              </p>
            </div>
          )}

          {/* Data display with loading overlay */}
          {selectedGeometry && (
            <div id="safety-dangerous-areas-data-container" className="relative">
              {/* Loading overlay */}
              {isLoading && (
                <div 
                  id="safety-dangerous-areas-loading-overlay" 
                  className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                >
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-sm text-gray-700 font-medium">Loading dangerous areas...</span>
                    <span className="text-xs text-gray-500 mt-1">Analyzing incident patterns</span>
                  </div>
                </div>
              )}

              {/* Data content */}
              <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
                {hasData && !hasError ? (
                  <div id="safety-dangerous-areas-list" className="space-y-1">
                    {areasData.map((area, index) => (
                      <div
                        key={`${area.location}-${index}`}
                        id={`safety-dangerous-area-${index}`}
                        className={`px-3 py-1 cursor-pointer transition-colors duration-200 ${
                          hoveredArea === area.location 
                            ? 'bg-gray-100' 
                            : 'hover:bg-gray-50'
                        }`}
                        onMouseEnter={() => setHoveredArea(area.location)}
                        onMouseLeave={() => setHoveredArea(null)}
                        onClick={() => highlightArea(area)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0 mr-2">
                            <span 
                              className="text-sm text-gray-900 truncate block"
                              title={area.location}
                            >
                              {index + 1}. {area.location}
                            </span>
                          </div>
                          <div className="flex-shrink-0 text-sm text-gray-600">
                            {area.incidentCount} Incident{area.incidentCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasError ? (
                  <div id="safety-dangerous-areas-error" className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[120px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-red-800">
                        <strong>Data Error:</strong> Unable to load dangerous areas data
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Try selecting a different area or adjusting filters.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div id="safety-dangerous-areas-no-data" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
                    <div id="safety-dangerous-areas-no-data-icon" className="mb-2 text-gray-400">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p id="safety-dangerous-areas-no-data-text" className="text-sm text-gray-600">
                      No dangerous areas data available
                    </p>
                    <p id="safety-dangerous-areas-no-data-subtext" className="text-xs text-gray-500">
                      Try adjusting your filters or selecting a different area
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 