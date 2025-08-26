import { useState } from "react";
import { SafetyFilters, SafetyVisualizationType } from "../../../../lib/safety-app/types";
import NewSafetyMap from "./NewSafetyMap";

interface SafetyMapAreaProps {
  filters?: Partial<SafetyFilters>;
  geographicLevel?: string;
  onMapViewReady?: (mapView: __esri.MapView) => void;
  onSelectionChange?: (data: { geometry: __esri.Polygon | null; areaName?: string | null } | null) => void;
  selectedAreaName?: string | null;
}

export default function SafetyMapArea({ 
  filters = {},
  geographicLevel = 'cities',
  onMapViewReady,
  onSelectionChange,
  selectedAreaName
}: SafetyMapAreaProps) {
  const [activeMapTab, setActiveMapTab] = useState<SafetyVisualizationType>('raw-incidents');

  const mapTabs: Array<{ id: SafetyVisualizationType; label: string }> = [
    { id: 'raw-incidents', label: 'Raw Incidents' },
    { id: 'incident-heatmap', label: 'Incident Heatmap' },
    { id: 'incident-to-volume-ratio', label: 'Incident to Volume Ratio Heatmap' },
  ];

  return (
    <div id="safety-map-area-container" className="flex-1 bg-white flex flex-col">
      {/* Geographic Area Header */}
      <div id="safety-geographic-header" className="bg-gray-100 border-b border-gray-200 px-4 py-[1.15rem] flex-shrink-0">
        <h2 id="safety-current-geographic-area" className="text-base font-bold italic text-gray-700">
          {selectedAreaName || 'Please select a region on the map'}
        </h2>
      </div>

      {/* Map Area */}
      <div id="safety-map-content" className="flex-1 bg-gray-100 relative">
        
        {/* Map Tabs - Absolutely positioned over the map */}
        <div id="safety-map-tabs-container" className="absolute top-2 right-2 z-30">
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
        {/* Actual Map Component */}
        <div id="safety-map-container" className="w-full h-full">
          <NewSafetyMap
            activeVisualization={activeMapTab}
            filters={filters}
            geographicLevel={geographicLevel}
            onMapViewReady={onMapViewReady}
            onSelectionChange={onSelectionChange}
          />
        </div>

        {/* Legend - positioned in bottom right with proper z-index */}
        <div id="safety-map-legend" className="absolute bottom-6 right-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-36 z-10">
          <h4 id="safety-legend-title" className="text-xs font-normal text-gray-900 mb-3">Legend</h4>
          <div id="safety-legend-items" className="space-y-2">
            <div id="safety-legend-fatality" className="flex items-center gap-2">
              <div id="safety-legend-fatality-dot" className="w-3 h-3 bg-safety-fatality rounded-full"></div>
              <span id="safety-legend-fatality-label" className="text-xs text-gray-700">Fatality</span>
            </div>
            <div id="safety-legend-severe-injury" className="flex items-center gap-2">
              <div id="safety-legend-severe-injury-dot" className="w-3 h-3 bg-safety-severe-injury rounded-full"></div>
              <span id="safety-legend-severe-injury-label" className="text-xs text-gray-700">Severe Injury</span>
            </div>
            <div id="safety-legend-injury" className="flex items-center gap-2">
              <div id="safety-legend-injury-dot" className="w-3 h-3 bg-safety-injury rounded-full"></div>
              <span id="safety-legend-injury-label" className="text-xs text-gray-700">Injury</span>
            </div>
            <div id="safety-legend-near-miss" className="flex items-center gap-2">
              <div id="safety-legend-near-miss-dot" className="w-3 h-3 bg-safety-near-miss rounded-full"></div>
              <span id="safety-legend-near-miss-label" className="text-xs text-gray-700">Near Miss</span>
            </div>
            <div id="safety-legend-unknown" className="flex items-center gap-2">
              <div id="safety-legend-unknown-dot" className="w-3 h-3 bg-safety-unknown rounded-full"></div>
              <span id="safety-legend-unknown-label" className="text-xs text-gray-700">Unknown</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 