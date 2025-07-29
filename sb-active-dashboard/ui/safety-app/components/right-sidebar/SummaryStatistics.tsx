import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function SummaryStatistics() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div id="safety-summary-statistics" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-summary-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-summary-title" className="text-base font-medium text-gray-700">Summary Statistics</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-summary-breakdown" className="space-y-0.5">
          <div id="safety-summary-total" className="bg-gray-100 flex justify-between items-center px-1 py-0.5 rounded text-xs">
            <span id="safety-summary-total-label" className="text-gray-900">Total Incidents</span>
            <span id="safety-summary-total-value" className="text-gray-900">1,847</span>
          </div>
          <div id="safety-summary-fatalities" className="bg-white flex justify-between items-center pl-4 pr-1 py-0.5 rounded text-xs">
            <span id="safety-summary-fatalities-label" className="text-gray-900">Fatalities</span>
            <span id="safety-summary-fatalities-value" className="text-gray-900">44</span>
          </div>
          <div id="safety-summary-severe-injuries" className="bg-gray-100 flex justify-between items-center pl-4 pr-1 py-0.5 rounded text-xs">
            <span id="safety-summary-severe-injuries-label" className="text-gray-900">Severe Injuries (Hospitalizations)</span>
            <span id="safety-summary-severe-injuries-value" className="text-gray-900">122</span>
          </div>
          <div id="safety-summary-injuries" className="bg-white flex justify-between items-center pl-4 pr-1 py-0.5 rounded text-xs">
            <span id="safety-summary-injuries-label" className="text-gray-900">Injuries</span>
            <span id="safety-summary-injuries-value" className="text-gray-900">1,003</span>
          </div>
          <div id="safety-summary-near-misses" className="bg-gray-100 flex justify-between items-center pl-4 pr-1 py-0.5 rounded text-xs">
            <span id="safety-summary-near-misses-label" className="text-gray-900">Near Misses</span>
            <span id="safety-summary-near-misses-value" className="text-gray-900">678</span>
          </div>
        </div>
      )}
    </div>
  );
} 