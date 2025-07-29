import React from "react";
import SortDataSection from "../components/left-sidebar/SortDataSection";
import ModelCountTypeSection from "../components/left-sidebar/ModelCountTypeSection";
import RoadUserSection from "../components/left-sidebar/RoadUserSection";
import DateRangeSection from "../../components/filters/DateRangeSection";
import GeographicLevelSection from "../../components/filters/GeographicLevelSection";
import ModeledDataAdditionalSection from "../components/left-sidebar/ModeledDataAdditionalSection";

interface NewVolumeLeftSidebarProps {
  activeTab: string;
}

export default function NewVolumeLeftSidebar({ activeTab }: NewVolumeLeftSidebarProps) {
  return (
    <div id="volume-filters-sidebar" className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <SortDataSection />
      <hr className="border-gray-200" />
      {activeTab === 'modeled-data' && (
        <>
          <ModelCountTypeSection />
          <hr className="border-gray-200" />
        </>
      )}
      <RoadUserSection />
      <hr className="border-gray-200" />
      <DateRangeSection />
      <hr className="border-gray-200" />
      <GeographicLevelSection />
    </div>
  );
} 