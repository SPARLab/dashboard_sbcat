import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function SeverityBreakdown() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div id="safety-severity-breakdown" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-severity-breakdown-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-severity-breakdown-title" className="text-base font-medium text-gray-700">Severity Breakdown</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-severity-breakdown-content" className="bg-white p-2">
          <div id="safety-severity-breakdown-chart" className="h-48 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
            <div id="safety-severity-breakdown-chart-content" className="text-center">
              <p className="text-sm text-gray-600 mb-2">Bar Chart</p>
              <p className="text-xs text-gray-500">Incidents by User Type</p>
              <div id="safety-severity-breakdown-legend" className="mt-2 flex items-center justify-center gap-4">
                <span className="text-xs">Bikes</span>
                <span className="text-xs">Pedestrians</span>
                <span className="text-xs">E-bikes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 