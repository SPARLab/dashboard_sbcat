import React, { useState } from "react";
import { SafetyFilters } from "../../../../lib/safety-app/types";
import { useSafetySpatialQuery } from "../../../../lib/hooks/useSpatialQuery";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

interface SummaryStatisticsProps {
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
}

export default function SummaryStatistics({ 
  selectedGeometry = null, 
  filters = {} 
}: SummaryStatisticsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Use spatial query hook to get filtered data based on selection
  const { result, isLoading, error } = useSafetySpatialQuery(selectedGeometry, filters);
  
  // Use the summary data from the spatial query only when there's a selection
  const summaryData = result?.summary;

  return (
    <div id="safety-summary-statistics" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-summary-header" className="flex items-center justify-between">
        <h3 id="safety-summary-title" className="text-base font-medium text-gray-700">Summary Statistics</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-summary-breakdown" className="space-y-0.5 min-h-[120px]">
          {/* No selection state */}
          {!selectedGeometry && (
            <div id="safety-summary-no-selection" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center mt-2 min-h-[120px]">
              <div id="safety-summary-instruction-icon" className="mb-2 text-gray-400">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p id="safety-summary-instruction-text" className="text-sm text-gray-600 mb-1">
                Select a region on the map
              </p>
              <p id="safety-summary-instruction-subtext" className="text-xs text-gray-500">
                Use the polygon tool or click on a boundary to see incident statistics for that area
              </p>
            </div>
          )}

          {/* Data display with loading overlay */}
          {selectedGeometry && (
            <div id="safety-summary-data-container" className="relative mt-2">
              {/* Loading overlay */}
              {isLoading && (
                <div 
                  id="safety-summary-loading-overlay" 
                  className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                >
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-sm text-gray-700 font-medium">Loading summary data...</span>
                    <span className="text-xs text-gray-500 mt-1">Analyzing selected area</span>
                  </div>
                </div>
              )}

              {/* Data content */}
              <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'} min-h-[120px]`}>
                {summaryData ? (
                  <>
                    <div id="safety-summary-total" className="bg-gray-100 flex justify-between items-center px-1 py-0.5 rounded-md text-sm">
                      <span id="safety-summary-total-label" className="text-gray-900">Total Incidents</span>
                      <span id="safety-summary-total-value" className="text-gray-900">{summaryData.totalIncidents.toLocaleString()}</span>
                    </div>
                    <div id="safety-summary-fatalities" className="bg-white flex justify-between items-center pl-4 pr-1 py-0.5 rounded-md text-sm">
                      <span id="safety-summary-fatalities-label" className="text-gray-900">Fatalities</span>
                      <span id="safety-summary-fatalities-value" className="text-gray-900">{summaryData.fatalIncidents.toLocaleString()}</span>
                    </div>
                    <div id="safety-summary-severe-injuries" className="bg-gray-100 flex justify-between items-center pl-4 pr-1 py-0.5 rounded-md text-sm">
                      <span id="safety-summary-severe-injuries-label" className="text-gray-900">Severe Injuries (Hospitalizations)</span>
                      <span id="safety-summary-severe-injuries-value" className="text-gray-900">
                        {Math.floor(summaryData.injuryIncidents * 0.11).toLocaleString()}
                      </span>
                    </div>
                    <div id="safety-summary-injuries" className="bg-white flex justify-between items-center pl-4 pr-1 py-0.5 rounded-md text-sm">
                      <span id="safety-summary-injuries-label" className="text-gray-900">Injuries</span>
                      <span id="safety-summary-injuries-value" className="text-gray-900">
                        {Math.floor(summaryData.injuryIncidents * 0.89).toLocaleString()}
                      </span>
                    </div>
                    <div id="safety-summary-near-misses" className="bg-gray-100 flex justify-between items-center pl-4 pr-1 py-0.5 rounded-md text-sm">
                      <span id="safety-summary-near-misses-label" className="text-gray-900">Near Misses</span>
                      <span id="safety-summary-near-misses-value" className="text-gray-900">{summaryData.nearMissIncidents.toLocaleString()}</span>
                    </div>
                  </>
                ) : error ? (
                  <div id="safety-summary-error" className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm text-red-800">
                      <strong>Data Error:</strong> {error}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Unable to load summary data.
                    </div>
                  </div>
                ) : (
                  <div 
                    id="safety-summary-no-data" 
                    className="flex justify-center items-center min-h-[120px]"
                  >
                    <div className="text-center">
                      <div className="text-gray-400 text-sm">No data available for selected area</div>
                      <div className="text-gray-300 text-xs mt-1">Try selecting a different area or adjusting filters</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
} 