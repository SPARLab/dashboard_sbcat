import React, { useState } from "react";

export default function SafetyMapArea() {
  const [activeMapTab, setActiveMapTab] = useState('incident-to-volume-ratio');

  const mapTabs = [
    { id: 'raw-incidents', label: 'Raw Incidents' },
    { id: 'incident-heatmap', label: 'Incident Heatmap' },
    { id: 'incident-to-volume-ratio', label: 'Incident to Volume Ratio Heatmap' },
  ];

  return (
    <div id="safety-map-area-container" className="flex-1 bg-white flex flex-col">
      {/* Geographic Area Header */}
      <div id="safety-geographic-header" className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <h2 id="safety-current-geographic-area" className="text-base font-bold text-gray-700">Census Tract 23</h2>
      </div>

      {/* Map Area */}
      <div id="safety-map-content" className="flex-1 bg-gradient-to-br from-blue-200 via-green-200 via-yellow-200 via-orange-200 to-red-200 relative">
        
        {/* Map Tabs - Absolutely positioned over the map */}
        <div id="safety-map-tabs-container" className="absolute top-4 right-4 z-30">
          <div id="safety-map-tabs-wrapper" className="flex bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {mapTabs.map((tab) => (
              <button
                key={tab.id}
                id={`safety-map-tab-${tab.id}`}
                onClick={() => setActiveMapTab(tab.id)}
                className={`px-4 py-2 text-xs font-normal transition-colors whitespace-nowrap focus:outline-none active:outline-none ${
                  activeMapTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Map Placeholder - This would contain the actual map component */}
        <div id="safety-map-placeholder" className="w-full h-full flex items-center justify-center">
          <div id="safety-map-info-card" className="bg-white bg-opacity-90 rounded-lg p-8 shadow-lg">
            <h3 id="safety-map-title" className="text-xl font-semibold text-gray-800 mb-2">Safety Map Area</h3>
            <p id="safety-active-tab-display" className="text-gray-600 mb-4">
              Active Tab: {mapTabs.find(tab => tab.id === activeMapTab)?.label}
            </p>
            <div id="safety-map-features-description" className="text-sm text-gray-500">
              <p id="safety-map-features-intro">This area will contain:</p>
              <ul id="safety-map-features-list" className="list-disc list-inside mt-2 space-y-1">
                <li id="safety-feature-visualization">Interactive safety incident data visualization</li>
                <li id="safety-feature-heatmap">Heatmap overlays showing incident density</li>
                <li id="safety-feature-volume-ratio">Traffic volume ratio analysis</li>
                <li id="safety-feature-geographic-tools">Geographic boundary selection tools</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legend - positioned in bottom right with proper z-index */}
        <div id="safety-map-legend" className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-32 z-10">
          <h4 id="safety-legend-title" className="text-xs font-normal text-gray-900 mb-3">Legend</h4>
          <div id="safety-legend-items" className="space-y-2">
            <div id="safety-legend-fatality" className="flex items-center gap-2">
              <div id="safety-legend-fatality-dot" className="w-3 h-3 bg-gray-600 rounded-full"></div>
              <span id="safety-legend-fatality-label" className="text-xs text-gray-700">Fatality</span>
            </div>
            <div id="safety-legend-severe-injury" className="flex items-center gap-2">
              <div id="safety-legend-severe-injury-dot" className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span id="safety-legend-severe-injury-label" className="text-xs text-gray-700">Severe Injury</span>
            </div>
            <div id="safety-legend-injury" className="flex items-center gap-2">
              <div id="safety-legend-injury-dot" className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span id="safety-legend-injury-label" className="text-xs text-gray-700">Injury</span>
            </div>
            <div id="safety-legend-near-miss" className="flex items-center gap-2">
              <div id="safety-legend-near-miss-dot" className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span id="safety-legend-near-miss-label" className="text-xs text-gray-700">Near-miss</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 