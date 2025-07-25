import React from "react";

interface NewVolumeMapProps {
  activeTab: string;
}

export default function NewVolumeMap({ activeTab }: NewVolumeMapProps) {
  return (
    <div id="volume-map-container" className="flex-1 bg-gray-200 relative flex items-center justify-center">
      <h2 id="map-placeholder-text" className="text-lg text-gray-600">
        Interactive Map - Heatmap View ({activeTab})
      </h2>
      
      {/* Map Legend */}
      <div id="volume-map-legend" className="absolute bottom-5 right-5 bg-white p-3 rounded border border-gray-300 shadow-sm min-w-[200px]">
        <h4 id="legend-title" className="text-sm font-medium text-gray-700 mb-2">Volume Legend</h4>
        <div className="flex items-center gap-4">
          <div id="legend-low" className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span className="text-xs text-gray-600">Low</span>
          </div>
          <div id="legend-medium" className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div id="legend-high" className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-900 rounded"></div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
      </div>
    </div>
  );
} 