import { useCallback, useEffect, useState } from "react";
import { useSelection } from "../../lib/hooks/useSelection";
import { SafetyFilters } from "../../lib/safety-app/types";
import SafetyMapArea from "./components/map/SafetyMapArea";
import SafetyLeftSidebar from "./layout/SafetyLeftSidebar";
import SafetyRightSidebar from "./layout/SafetyRightSidebar";
import DisclaimerModal from "../components/DisclaimerModal";
import SafetyDataDisclaimer from "../components/SafetyDataDisclaimer";
import { SchoolDistrictFilter } from "../components/filters/GeographicLevelSection";

function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timerId);
  }, [value, delayMs]);

  return debouncedValue;
}

export default function SafetyApp() {
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [incidentsLayer, setIncidentsLayer] = useState<__esri.FeatureLayer | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  // Selection hook for polygon selection (same as volume page)
  const { selectedGeometry, selectedAreaName, onSelectionChange } = useSelection();
  
  const [geographicLevel, setGeographicLevel] = useState('city-service-area');
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<SchoolDistrictFilter>({ gradeFilter: 'high-school' });
  const [filters, setFilters] = useState<Partial<SafetyFilters>>({
    showPedestrian: true,
    showBicyclist: true,
    roadUser: ['pedestrian', 'bicyclist'],
    dataSource: ['SWITRS', 'BikeMaps.org'],
    severityTypes: ['Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown'],
    conflictType: ['Bike vs vehicle', 'Bike vs other', 'Bike vs bike', 'Bike vs pedestrian', 'Bike vs infrastructure', 'Pedestrian vs vehicle', 'Pedestrian vs other'],
    dateRange: {
      start: new Date(2020, 0, 1), // January 1, 2020
      end: new Date(2024, 11, 31) // December 31, 2024 (local time)
    },
    timeOfDay: {
      enabled: true,
      periods: ['morning', 'afternoon', 'evening']
    },
    weekdayFilter: {
      enabled: true,
      type: 'weekdays'
    }
  });

  const handleFiltersChange = useCallback((newFilters: Partial<SafetyFilters>) => {

    setFilters(prevFilters => {
      const updated = { ...prevFilters, ...newFilters };
  
      return updated;
    });
  }, []);

  const handleMapViewReady = (view: __esri.MapView) => {
    setMapView(view);
  };

  const handleIncidentsLayerReady = (layer: __esri.FeatureLayer) => {
    setIncidentsLayer(layer);
  };

  const debouncedFilters = useDebouncedValue(filters, 300);


  return (
    <>
      <DisclaimerModal
        id="safety-data-disclaimer"
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        title="Safety Data Overview"
      >
        <SafetyDataDisclaimer />
      </DisclaimerModal>

      <div id="safety-app-container" className="flex flex-col h-[calc(100vh-70px)] bg-white">
        <div id="safety-main-content" className="flex flex-1 overflow-hidden">
        <SafetyLeftSidebar 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          geographicLevel={geographicLevel}
          onGeographicLevelChange={setGeographicLevel}
          schoolDistrictFilter={schoolDistrictFilter}
          onSchoolDistrictFilterChange={setSchoolDistrictFilter}
        />
        <SafetyMapArea 
          filters={debouncedFilters}
          geographicLevel={geographicLevel}
          schoolDistrictFilter={schoolDistrictFilter}
          onMapViewReady={handleMapViewReady}
          onIncidentsLayerReady={handleIncidentsLayerReady}
          onSelectionChange={onSelectionChange}
          selectedAreaName={selectedAreaName}
        />
        <SafetyRightSidebar 
          mapView={mapView}
          incidentsLayer={incidentsLayer}
          filters={debouncedFilters}
          selectedGeometry={selectedGeometry}
          selectedAreaName={selectedAreaName}
        />
      </div>
      {/* Footer */}
      <div id="safety-footer" className="bg-gray-50 border-t border-gray-200 py-4">
        <div id="safety-footer-content" className="max-w-none px-6">
          <p id="safety-footer-copyright" className="text-sm text-gray-600 text-center">
            © 2025 Active SB Dashboard. Safety data and analysis information.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
