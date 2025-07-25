import React, { useState } from "react";
import NewVolumeSubHeader from "./components/NewVolumeSubHeader";
import NewVolumeLeftSidebar from "./components/NewVolumeLeftSidebar";
import NewVolumeMap from "./components/NewVolumeMap";
import NewVolumeRightSidebar from "./components/NewVolumeRightSidebar";

export default function NewVolumeApp() {
  const [activeTab, setActiveTab] = useState('modeled-data');

  return (
    <div id="new-volumes-page" className="flex flex-col h-screen bg-white">
      <NewVolumeSubHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div id="volume-main-content" className="flex flex-1">
        <NewVolumeLeftSidebar activeTab={activeTab} />
        <NewVolumeMap activeTab={activeTab} />
        <NewVolumeRightSidebar activeTab={activeTab} />
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