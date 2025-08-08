import { useRef, useState } from "react";
import { GeographicBoundariesService } from "../../../lib/data-services/GeographicBoundariesService";

export interface MapStateOptions {
  onMapViewReady?: (mapView: __esri.MapView) => void;
  onSelectionChange?: (data: { geometry: __esri.Polygon | null; areaName?: string | null } | null) => void;
}

export function useMapState({ onMapViewReady, onSelectionChange }: MapStateOptions = {}) {
  const mapViewRef = useRef<__esri.MapView | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Boundary service state
  const [boundaryService] = useState(() => {
    const service = new GeographicBoundariesService();
    // Set up selection callback if provided
    if (onSelectionChange) {
      service.setSelectionChangeCallback(onSelectionChange);
    }
    return service;
  });

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
        

      }).catch((error: Error) => {

        // Still mark as ready even if navigation fails
        setViewReady(true);
        if (onMapViewReady) {
          onMapViewReady(mapView);
        }
      });
    }
  };

  return {
    mapViewRef,
    viewReady,
    dataLoading,
    setDataLoading,
    dataError,
    setDataError,
    boundaryService,
    handleArcgisViewReadyChange
  };
}