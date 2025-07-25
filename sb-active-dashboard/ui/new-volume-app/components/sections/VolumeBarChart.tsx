import React from "react";

interface VolumeBarChartProps {
  dataType: string;
}

export default function VolumeBarChart({ dataType }: VolumeBarChartProps) {
  return (
    <div id="volume-bar-chart-container" className="border border-gray-200 rounded p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 id="bar-chart-title" className="text-base font-medium text-gray-700">
          Miles of Street by Traffic Level
        </h3>
        <span id="chart-collapse-button" className="text-sm cursor-pointer text-gray-600">−</span>
      </div>

      <p id="chart-summary" className="text-sm text-blue-600 text-center mb-2 font-semibold">
        124 Pedestrians & Bicyclists ({dataType})
      </p>

      <p id="chart-description" className="text-xs text-gray-500 text-center mb-6">
        Miles within network assigned to each category, based on current selection
      </p>

      {/* Mock Bar Chart */}
      <div id="volume-bar-chart" className="flex items-end justify-center gap-4 h-48 mb-4">
              {/* Y-axis labels would go here in a real implementation */}
      <div id="chart-y-axis-label" className="text-xs -rotate-90 text-gray-500 text-center">
        <span className="block transform absolute left-2 top-1/2 w-20">Network Miles</span>
      </div>
        <div id="low-traffic-bar" className="flex flex-col items-center gap-2">
          <div className="w-11 bg-gray-300 rounded-t" style={{ height: '67px' }}></div>
          <span className="text-xs font-semibold text-gray-700">Low</span>
        </div>
        <div id="medium-traffic-bar" className="flex flex-col items-center gap-2">
          <div className="w-11 bg-gray-600 rounded-t" style={{ height: '164px' }}></div>
          <span className="text-xs font-semibold text-gray-700">Medium</span>
        </div>
        <div id="high-traffic-bar" className="flex flex-col items-center gap-2">
          <div className="w-11 bg-gray-900 rounded-t" style={{ height: '128px' }}></div>
          <span className="text-xs font-semibold text-gray-700">High</span>
        </div>
      </div>

    </div>
  );
} 