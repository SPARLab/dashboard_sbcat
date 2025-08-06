import { useState } from "react";
import { SafetyFilters } from "../../lib/safety-app/types";
import SafetyMapArea from "./components/map/SafetyMapArea";
import SafetyLeftSidebar from "./layout/SafetyLeftSidebar";
import SafetyRightSidebar from "./layout/SafetyRightSidebar";

export default function SafetyApp() {
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [selectedGeometry, setSelectedGeometry] = useState<__esri.Polygon | null>(null);
  const [geographicLevel, setGeographicLevel] = useState('cities');
  const [filters, setFilters] = useState<Partial<SafetyFilters>>({
    showPedestrian: true,
    showBicyclist: true,
    roadUser: ['pedestrian', 'bicyclist'],
    dataSource: ['SWITRS', 'BikeMaps']
  });

  const handleMapViewReady = (view: __esri.MapView) => {
    setMapView(view);
  };

  const handleSelectionChange = (data: { geometry: __esri.Polygon | null; areaName?: string | null } | null) => {
    // Handle both object format and direct null
    if (data === null) {
      setSelectedGeometry(null);
    } else {
      setSelectedGeometry(data.geometry);
    }
  };

  return (
    <div id="safety-app-container" className="flex flex-col h-[calc(100vh-70px)] bg-white">
      <div id="safety-main-content" className="flex flex-1 overflow-hidden">
        <SafetyLeftSidebar 
          filters={filters}
          onFiltersChange={setFilters}
          geographicLevel={geographicLevel}
          onGeographicLevelChange={setGeographicLevel}
        />
        <SafetyMapArea 
          filters={filters}
          geographicLevel={geographicLevel}
          onMapViewReady={handleMapViewReady}
          onSelectionChange={handleSelectionChange}
        />
        <SafetyRightSidebar 
          mapView={mapView}
          filters={filters}
          selectedGeometry={selectedGeometry}
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
  );
} 