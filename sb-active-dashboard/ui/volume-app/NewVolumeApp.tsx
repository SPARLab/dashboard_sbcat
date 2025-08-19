import { useState } from "react";
import { useSelection } from "../../lib/hooks/useSelection";
import { useVolumeAppStore } from "../../lib/stores/volume-app-state";
import NewVolumeMap from "./components/map/NewVolumeMap";
import NewVolumeLeftSidebar from "./layout/NewVolumeLeftSidebar";
import NewVolumeRightSidebar from "./layout/NewVolumeRightSidebar";
import NewVolumeSubHeader from "./layout/NewVolumeSubHeader";

export default function NewVolumeApp() {
  const [activeTab, setActiveTab] = useState('raw-data');
  
  // Selection hook for polygon selection
  const { selectedGeometry, selectedAreaName, onSelectionChange } = useSelection();
  
  // Use Zustand store for count site selection and bin highlighting
  const { 
    selectedCountSite, 
    highlightedBinSites, 
    setSelectedCountSite, 
    setHighlightedBinSites,
    setMapView: setStoreMapView 
  } = useVolumeAppStore();
  
  // Map-related state to share between components
  // For Raw Data/Data Completeness: dual selection (showBicyclist, showPedestrian)
  // For Modeled Data: single selection (selectedMode)
  const [showBicyclist, setShowBicyclist] = useState(true);
  const [showPedestrian, setShowPedestrian] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'bike' | 'ped'>('bike');
  const [modelCountsBy, setModelCountsBy] = useState<string>("cost-benefit");
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [aadtLayer, setAadtLayer] = useState<__esri.FeatureLayer | null>(null);
  const [geographicLevel, setGeographicLevel] = useState('city-service-area');
  
  // Date range state for timeline and filtering
  const [dateRange, setDateRange] = useState({
    startDate: new Date(2018, 7, 15), // 8/15/2018
    endDate: new Date(2025, 6, 16),   // 7/16/2025
  });

  // Year selection state for modeled data
  const [selectedYear, setSelectedYear] = useState(2023);

  // Note: Removed auto-switch to City/Service Area restriction
  // Users can now select any geographic level (including county and census tract) for all tabs

  // Handle map view ready from map component
  const handleMapViewReady = (view: __esri.MapView) => {
    console.log('🗺️ MapView ready for chart integration');
    setMapView(view);
    setStoreMapView(view); // Also update Zustand store
  };

  // Handle bin sites highlighting (now handled by Zustand store)
  const handleBinSitesHighlight = (siteNames: string[]) => {
    // This is now handled directly by the Zustand store in AADTHistogram
    // Keep this function for compatibility but it's no longer needed
  };

  // Clear highlighted sites when selecting individual sites (now handled by Zustand store)
  const handleCountSiteSelect = (siteId: string | null) => {
    // This is now handled directly by the Zustand store
    // Keep this function for compatibility but it's no longer needed
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
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          modelCountsBy={modelCountsBy}
          setModelCountsBy={setModelCountsBy}
          geographicLevel={geographicLevel}
          onGeographicLevelChange={setGeographicLevel}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
        <NewVolumeMap 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          selectedMode={selectedMode}
          modelCountsBy={modelCountsBy}
          selectedYear={selectedYear}
          onMapViewReady={handleMapViewReady}
          onAadtLayerReady={setAadtLayer}
          geographicLevel={geographicLevel}
          onSelectionChange={onSelectionChange}
          selectedCountSite={selectedCountSite}
          highlightedBinSites={highlightedBinSites}
        />
        <NewVolumeRightSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          selectedMode={selectedMode}
          modelCountsBy={modelCountsBy}
          mapView={mapView}
          aadtLayer={aadtLayer}
          selectedGeometry={selectedGeometry}
          selectedAreaName={selectedAreaName}
          dateRange={dateRange}
          selectedCountSite={selectedCountSite}
          onCountSiteSelect={handleCountSiteSelect}
          onBinSitesHighlight={handleBinSitesHighlight}
          highlightedBinSites={highlightedBinSites}
          selectedYear={selectedYear}
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
