import React from "react";
import TrendsHeader from "./sections/TrendsHeader";
import VolumeBarChart from "./sections/VolumeBarChart";
import RawDataMetrics from "./sections/RawDataMetrics";
import CompletenessMetrics from "./sections/CompletenessMetrics";

interface NewVolumeRightSidebarProps {
  activeTab: string;
}

export default function NewVolumeRightSidebar({ activeTab }: NewVolumeRightSidebarProps) {
  const horizontalMargins = "mx-4";

  return (
    <div id="volume-trends-sidebar" className="w-[412px] bg-white border-l border-gray-200 overflow-y-auto">
      <div className="py-4">
        <TrendsHeader activeTab={activeTab} horizontalMargins={horizontalMargins} />
        <div className="w-full h-[1px] bg-gray-200 my-4"></div>
        <VolumeBarChart dataType={activeTab} horizontalMargins={horizontalMargins} />
        {activeTab === 'raw-data' && (
          <>
            <RawDataMetrics horizontalMargins={horizontalMargins} />
          </>
        )}
        {activeTab === 'data-completeness' && (
          <>
            <CompletenessMetrics horizontalMargins={horizontalMargins} />
          </>
        )}
      </div>
    </div>
  );
} 