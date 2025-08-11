import { useState } from "react";
import { useSelection } from "../../lib/hooks/useSelection";
import NewVolumeMap from "./components/map/NewVolumeMap";
import NewVolumeLeftSidebar from "./layout/NewVolumeLeftSidebar";
import NewVolumeRightSidebar from "./layout/NewVolumeRightSidebar";
import NewVolumeSubHeader from "./layout/NewVolumeSubHeader";

export default function NewVolumeApp() {
  const [activeTab, setActiveTab] = useState('raw-data');
  
  // Selection hook for polygon selection
  const { selectedGeometry, selectedAreaName, onSelectionChange } = useSelection();
  
  // Count site selection state
  const [selectedCountSite, setSelectedCountSite] = useState<string | null>(null);
  
  // Map-related state to share between components
  const [showBicyclist, setShowBicyclist] = useState(true);
  const [showPedestrian, setShowPedestrian] = useState(true);
  const [modelCountsBy, setModelCountsBy] = useState<string>("cost-benefit");
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [geographicLevel, setGeographicLevel] = useState('city-service-area');
  
  // Date range state for timeline and filtering
  const [dateRange, setDateRange] = useState({
    startDate: new Date(2018, 7, 15), // 8/15/2018
    endDate: new Date(2025, 6, 16),   // 7/16/2025
  });

  // Note: Removed auto-switch to City/Service Area restriction
  // Users can now select any geographic level (including county and census tract) for all tabs

  // Handle map view ready from map component
  const handleMapViewReady = (view: __esri.MapView) => {
    console.log('🗺️ MapView ready for chart integration');
    setMapView(view);
  };

  return (
    <div id="new-volumes-page" className="flex flex-col h-[calc(100vh-70px)] bg-white">
      <NewVolumeSubHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div id="volume-main-content" className="flex flex-1 overflow-hidden">
        <NewVolumeLeftSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          setShowBicyclist={setShowBicyclist}
          showPedestrian={showPedestrian}
          setShowPedestrian={setShowPedestrian}
          modelCountsBy={modelCountsBy}
          setModelCountsBy={setModelCountsBy}
          geographicLevel={geographicLevel}
          onGeographicLevelChange={setGeographicLevel}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <NewVolumeMap 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          modelCountsBy={modelCountsBy}
          onMapViewReady={handleMapViewReady}
          geographicLevel={geographicLevel}
          onSelectionChange={onSelectionChange}
          selectedCountSite={selectedCountSite}
        />
        <NewVolumeRightSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          modelCountsBy={modelCountsBy}
          mapView={mapView}
          selectedGeometry={selectedGeometry}
          selectedAreaName={selectedAreaName}
          dateRange={dateRange}
          selectedCountSite={selectedCountSite}
          onCountSiteSelect={setSelectedCountSite}
        />
      </div>
      {/* Footer */}
      <div id="volume-footer" className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="max-w-none px-6">
          <p id="footer-copyright" className="text-sm text-gray-600 text-center">
            © 2025 Active SB Dashboard. Data completeness and modeling information.
          </p>
        </div>
      </div>
    </div>
  );
}
