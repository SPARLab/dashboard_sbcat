import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function ConflictTypeBreakdown() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const conflictTypes = [
    { type: "Bike vs car", color: "bg-gray-800" },
    { type: "Bike vs bike", color: "bg-gray-400" },
    { type: "Bike vs pedestrian", color: "bg-blue-100" },
    { type: "Bike vs infrastructure", color: "bg-blue-200" },
    { type: "Bike vs other", color: "bg-blue-300" },
    { type: "Pedestrian vs car", color: "bg-blue-400" },
    { type: "Pedestrian vs pedestrian", color: "bg-blue-500" },
    { type: "Pedestrian vs other", color: "bg-blue-600" },
  ];

  return (
    <div id="safety-conflict-type-breakdown" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-conflict-type-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-conflict-type-title" className="text-base font-medium text-gray-700">Conflict Type Breakdown</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          {/* Bar Chart */}
          <div id="safety-conflict-type-chart" className="h-48 bg-gray-50 rounded border border-gray-200 flex items-center justify-center mb-4">
            <div id="safety-conflict-type-chart-content" className="text-center">
              <p className="text-sm text-gray-600 mb-2">Bar Chart</p>
              <p className="text-xs text-gray-500">Incidents by Conflict Type</p>
            </div>
          </div>

          {/* Legend */}
          <div id="safety-conflict-type-legend" className="grid grid-cols-2 gap-1.5">
            {conflictTypes.map((conflict, index) => (
              <div 
                key={index} 
                id={`safety-conflict-type-legend-item-${index}`}
                className="flex items-center gap-1.5"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${conflict.color}`}></div>
                <span className="text-xs text-gray-900">{conflict.type}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 