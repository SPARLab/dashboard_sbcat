import { useState } from "react";
import { useSelection } from "../../lib/hooks/useSelection";
import { useVolumeAppStore } from "../../lib/stores/volume-app-state";
import VolumeMap from "./components/map/VolumeMap";
import VolumeLeftSidebar from "./layout/VolumeLeftSidebar";
import VolumeRightSidebar from "./layout/VolumeRightSidebar";
import VolumeSubHeader from "./layout/VolumeSubHeader";
import DisclaimerModal from "../components/DisclaimerModal";
import VolumeDataDisclaimer from "../components/VolumeDataDisclaimer";
import { SchoolDistrictFilter } from "../components/filters/GeographicLevelSection";

export default function VolumeApp() {
  const [activeTab, setActiveTab] = useState('raw-data');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
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
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<SchoolDistrictFilter>({ gradeFilter: 'high-school' });
  
  
  // Date range state for timeline and filtering
  const [dateRange, setDateRange] = useState({
    startDate: new Date(2020, 0, 1), // 1/1/2020 (local time)
    endDate: new Date(2024, 11, 31),   // 12/31/2024 (local time)
  });

  // Year selection state for modeled data
  const [selectedYear, setSelectedYear] = useState(2023);

  // Note: Removed auto-switch to City/Service Area restriction
  // Users can now select any geographic level (including county and census tract) for all tabs

  // Handle map view ready from map component
  const handleMapViewReady = (view: __esri.MapView) => {

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
    <>
      <DisclaimerModal
        id="volume-data-disclaimer"
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        title="Volume Data Information"
      >
        <VolumeDataDisclaimer />
      </DisclaimerModal>

      <div id="volumes-page" className="flex flex-col h-[calc(100vh-70px)] bg-white">
        <VolumeSubHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <div id="volume-main-content" className="flex flex-1 overflow-hidden">
        <VolumeLeftSidebar 
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
          schoolDistrictFilter={schoolDistrictFilter}
          onSchoolDistrictFilterChange={setSchoolDistrictFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
        <VolumeMap 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          selectedMode={selectedMode}
          modelCountsBy={modelCountsBy}
          selectedYear={selectedYear}
          onMapViewReady={handleMapViewReady}
          onAadtLayerReady={setAadtLayer}
          geographicLevel={geographicLevel}
          schoolDistrictFilter={schoolDistrictFilter}
          onSelectionChange={onSelectionChange}
          selectedCountSite={selectedCountSite}
          highlightedBinSites={highlightedBinSites}
          showLoadingOverlay={!showDisclaimer}
        />
        <VolumeRightSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          selectedMode={selectedMode}
          modelCountsBy={modelCountsBy}
          mapView={mapView}
          aadtLayer={aadtLayer}
          selectedGeometry={selectedGeometry as any}
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
    </>
  );
}
