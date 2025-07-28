import React from "react";
import TrendsHeader from "./sections/TrendsHeader";
import MilesOfStreetByTrafficLevelBarChart from "./sections/MilesOfStreetByTrafficLevelBarChart";
import RawDataMetrics from "./sections/RawDataMetrics";
import CompletenessMetrics from "./sections/CompletenessMetrics";
import LowDataCoverage from "./right-sidebar/LowDataCoverage";
import SummaryStatistics from "./right-sidebar/SummaryStatistics";
import HighestVolume from "./right-sidebar/HighestVolume";
import Placeholder from "./right-sidebar/Placeholder";

interface NewVolumeRightSidebarProps {
  activeTab: string;
}

export default function NewVolumeRightSidebar({ activeTab }: NewVolumeRightSidebarProps) {
  const horizontalMargins = "mx-4";

  return (
    <div id="volume-trends-sidebar" className="w-[412px] bg-white border-l border-gray-200 overflow-y-auto no-scrollbar">
      <div className="py-4">
        <TrendsHeader activeTab={activeTab} horizontalMargins={horizontalMargins} />
        <div className="w-full h-[1px] bg-gray-200 my-4"></div>
        {activeTab === 'modeled-data' && (
          <MilesOfStreetByTrafficLevelBarChart dataType={activeTab} horizontalMargins={horizontalMargins} />
        )}
        {activeTab === 'raw-data' && (
          <>
            <div className={`space-y-4 ${horizontalMargins} my-4`}>
              <LowDataCoverage />
              <SummaryStatistics />
              <HighestVolume />
              <Placeholder label="Aggregated Volume Breakdown" />
              <Placeholder label="Year to Year Volume Comparison" />
              <Placeholder label="Timeline of Available data per site Sparkline chart" />
              <Placeholder label="Mode Breakdown chart" />
            </div>
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