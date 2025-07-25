import React from "react";
import SortDataSection from "./sections/SortDataSection";
import ModelCountTypeSection from "./sections/ModelCountTypeSection";
import RoadUserSection from "./sections/RoadUserSection";
import DateRangeSection from "./sections/DateRangeSection";
import GeographicLevelSection from "./sections/GeographicLevelSection";
import ModeledDataAdditionalSection from "./sections/ModeledDataAdditionalSection";

interface NewVolumeLeftSidebarProps {
  activeTab: string;
}

export default function NewVolumeLeftSidebar({ activeTab }: NewVolumeLeftSidebarProps) {
  return (
    <div id="volume-filters-sidebar" className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <SortDataSection />
        <hr className="border-gray-200 mb-4" />
        <ModelCountTypeSection />
        <hr className="border-gray-200 mb-4" />
        <RoadUserSection />
        <hr className="border-gray-200 mb-4" />
        <DateRangeSection />
        <hr className="border-gray-200 mb-4" />
        <GeographicLevelSection />
        {activeTab === 'modeled-data' && (
          <>
            <hr className="border-gray-200 mb-4" />
            <ModeledDataAdditionalSection />
          </>
        )}
      </div>
    </div>
  );
} 