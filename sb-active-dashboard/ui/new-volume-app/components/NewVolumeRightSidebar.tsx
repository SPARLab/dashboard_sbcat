import React from "react";
import TrendsHeader from "./sections/TrendsHeader";
import VolumeBarChart from "./sections/VolumeBarChart";
import RawDataMetrics from "./sections/RawDataMetrics";
import CompletenessMetrics from "./sections/CompletenessMetrics";

interface NewVolumeRightSidebarProps {
  activeTab: string;
}

export default function NewVolumeRightSidebar({ activeTab }: NewVolumeRightSidebarProps) {
  return (
    <div id="volume-trends-sidebar" className="w-[412px] bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4">
        <TrendsHeader activeTab={activeTab} />
        <VolumeBarChart dataType={activeTab} />
        {activeTab === 'raw-data' && <RawDataMetrics />}
        {activeTab === 'data-completeness' && <CompletenessMetrics />}
      </div>
    </div>
  );
} 