import React from "react";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";
import MostDangerousAreas from "../components/right-sidebar/MostDangerousAreas";
import AnnualIncidentsComparison from "../components/right-sidebar/AnnualIncidentsComparison";
import IncidentsVsTrafficRatios from "../components/right-sidebar/IncidentsVsTrafficRatios";
import SeverityBreakdown from "../components/right-sidebar/SeverityBreakdown";
import ConflictTypeBreakdown from "../components/right-sidebar/ConflictTypeBreakdown";

export default function SafetyRightSidebar() {
  return (
    <div id="safety-analysis-sidebar" className="w-[374px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Fixed Analysis Header */}
      <div id="safety-analysis-header" className="flex-shrink-0 px-4 py-4 border-b border-gray-200 bg-white">
        <h2 id="safety-analysis-title" className="text-xl font-semibold text-gray-900">Analysis of Current View</h2>
      </div>

      {/* Scrollable Analysis Content */}
      <div id="safety-analysis-content" className="flex-1 overflow-y-auto no-scrollbar">
        <div id="safety-analysis-components" className="space-y-3 px-3.5 py-2">
          <SummaryStatistics />
          <MostDangerousAreas />
          <AnnualIncidentsComparison />
          <IncidentsVsTrafficRatios />
          <SeverityBreakdown />
          <ConflictTypeBreakdown />
        </div>
      </div>
    </div>
  );
}

 