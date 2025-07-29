import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function AnnualIncidentsComparison() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');

  const timeframes = ['Day', 'Month', 'Year'];

  return (
    <div id="safety-annual-incidents-comparison" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-annual-incidents-content" className="space-y-2">
        <div id="safety-annual-incidents-header" className="flex items-center justify-between">
          <h3 id="safety-annual-incidents-title" className="text-base font-medium text-gray-700">Annual Incidents Comparison</h3>
          <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
        </div>
        
        {!isCollapsed && (
          <>
            <div id="safety-annual-incidents-timeframe-buttons" className="flex items-center justify-between">
              {timeframes.map((timeframe) => (
                <button
                  key={timeframe}
                  id={`safety-annual-incidents-timeframe-${timeframe.toLowerCase()}`}
                  onClick={() => setSelectedTimeframe(timeframe.toLowerCase())}
                  className={`px-1 py-1 rounded text-sm font-semibold ${
                    selectedTimeframe === timeframe.toLowerCase()
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-800'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
            
            {/* Chart Placeholder */}
            <div id="safety-annual-incidents-chart" className="h-96 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
              <div id="safety-annual-incidents-chart-content" className="text-center">
                <p className="text-sm text-gray-600 mb-2">Annual Incidents Chart</p>
                <p className="text-xs text-gray-500">
                  Line chart comparing 2023 vs 2024 incidents by day of week
                </p>
                <div id="safety-annual-incidents-legend" className="mt-2 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-300 rounded"></div>
                    <span className="text-xs">2023</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-300 rounded"></div>
                    <span className="text-xs">2024</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 