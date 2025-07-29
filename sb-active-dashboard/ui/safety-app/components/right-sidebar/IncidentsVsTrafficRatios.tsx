import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function IncidentsVsTrafficRatios() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div id="safety-incidents-vs-traffic-ratios" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-incidents-vs-traffic-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-incidents-vs-traffic-title" className="text-base font-medium text-gray-700">Incidents vs. Traffic Ratios</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          <hr className="border-gray-200 mb-2" />
          <div id="safety-incidents-vs-traffic-chart" className="h-80 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
            <div id="safety-incidents-vs-traffic-chart-content" className="text-center">
              <p className="text-sm text-gray-600 mb-2">Scatter Plot</p>
              <p className="text-xs text-gray-500 mb-1">Traffic Volume vs Safety Incidents</p>
              <p className="text-xs text-blue-500">State Street, Santa Barbara</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 