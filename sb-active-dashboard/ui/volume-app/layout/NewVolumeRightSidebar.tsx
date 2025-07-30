import React from "react";
import TrendsHeader from "../components/right-sidebar/TrendsHeader";
import MilesOfStreetByTrafficLevelBarChart from "../components/right-sidebar/MilesOfStreetByTrafficLevelBarChart";
import CompletenessMetrics from "../components/right-sidebar/CompletenessMetrics";
import LowDataCoverage from "../components/right-sidebar/LowDataCoverage";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";
import HighestVolume from "../components/right-sidebar/HighestVolume";
import Placeholder from "../components/right-sidebar/Placeholder";
import AggregatedVolumeBreakdown from "../components/right-sidebar/AggregatedVolumeBreakdown";
import YearToYearVolumeComparison from "../components/right-sidebar/YearToYearVolumeComparison";
import TimelineSparkline from "../components/right-sidebar/TimelineSparkline";
import ModeBreakdown from "../components/right-sidebar/ModeBreakdown";

interface NewVolumeRightSidebarProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
}

export default function NewVolumeRightSidebar({ 
  activeTab,
  showBicyclist,
  showPedestrian,
  modelCountsBy
}: NewVolumeRightSidebarProps) {
  const horizontalMargins = "mx-4";

  // Sample data for the timeline sparkline - this would come from your data source
  const timelineData = [
    {
      id: "site1",
      name: "Site 1",
      dataPeriods: [
        { start: 0, end: 35 },
        { start: 45, end: 55 },
        { start: 65, end: 85 },
        { start: 90, end: 95 }
      ]
    },
    {
      id: "site2", 
      name: "Site 2",
      dataPeriods: [
        { start: 10, end: 25 },
        { start: 40, end: 50 }
      ]
    },
    {
      id: "site3",
      name: "Site 3", 
      dataPeriods: [
        { start: 0, end: 45 },
        { start: 60, end: 100 }
      ]
    },
    {
      id: "site4",
      name: "Site 4",
      dataPeriods: [
        { start: 5, end: 95 }
      ]
    },
    {
      id: "site5",
      name: "Site 5",
      dataPeriods: [
        { start: 0, end: 15 },
        { start: 25, end: 35 },
        { start: 45, end: 55 },
        { start: 65, end: 75 },
        { start: 85, end: 95 }
      ]
    },
    {
      id: "site6",
      name: "Site 6",
      dataPeriods: []
    },
    {
      id: "site7", 
      name: "Site 7",
      dataPeriods: []
    }
  ];

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
              <AggregatedVolumeBreakdown />
              <YearToYearVolumeComparison />
              <TimelineSparkline
                sites={timelineData}
                startYear={2022}
                endYear={2025}
                dateRange="Jan 1, 2022 - Dec 31, 2025"
                confidenceLevel="Medium confidence"
                contributingSites="5 out of 7 selected sites"
              />
              <HighestVolume />
              <ModeBreakdown />
            </div>
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