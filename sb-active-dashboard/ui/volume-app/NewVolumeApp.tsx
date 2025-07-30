import React, { useState } from "react";
import NewVolumeSubHeader from "./layout/NewVolumeSubHeader";
import NewVolumeLeftSidebar from "./layout/NewVolumeLeftSidebar";
import NewVolumeRightSidebar from "./layout/NewVolumeRightSidebar";
import NewVolumeMap from "./components/map/NewVolumeMap";

export default function NewVolumeApp() {
  const [activeTab, setActiveTab] = useState('raw-data');
  
  // Map-related state to share between components
  const [showBicyclist, setShowBicyclist] = useState(true);
  const [showPedestrian, setShowPedestrian] = useState(true);
  const [modelCountsBy, setModelCountsBy] = useState<string>("cost-benefit");
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);

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
        />
        <NewVolumeMap 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          modelCountsBy={modelCountsBy}
          onMapViewReady={handleMapViewReady}
        />
        <NewVolumeRightSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          modelCountsBy={modelCountsBy}
          mapView={mapView}
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