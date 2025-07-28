import React, { useState } from "react";

export default function SafetyRightSidebar() {
  return (
    <div id="safety-analysis-sidebar" className="w-[374px] bg-white border-l border-gray-200 overflow-y-auto no-scrollbar">
      <div id="safety-analysis-content" className="py-4">
        {/* Analysis Header */}
        <div id="safety-analysis-header" className="px-4 pb-4 border-b border-gray-200">
          <h2 id="safety-analysis-title" className="text-xl font-semibold text-gray-900">Analysis of Current View</h2>
        </div>

        {/* Analysis Components */}
        <div id="safety-analysis-components" className="space-y-3 px-3.5 py-2">
          <SummaryStatistics />
          <MostDangerousAreas />
          <AnnualIncidentsComparison />
          <IncidentsVsTrafficRatios />
          <SeverityBreakdown />
          <ConflictTypeBreakdown />
        </div>
      </div>
    </div>
  );
}

function SummaryStatistics() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div id="safety-summary-statistics" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-summary-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-summary-title" className="text-base font-medium text-gray-700">Summary Statistics</h3>
        <CollapseButton isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-summary-breakdown" className="space-y-0.5">
          <div id="safety-summary-total" className="bg-gray-100 flex justify-between items-center px-1 py-0 rounded text-xs">
            <span id="safety-summary-total-label" className="text-gray-900">Total Incidents</span>
            <span id="safety-summary-total-value" className="text-gray-900">1,847</span>
          </div>
          <div id="safety-summary-fatalities" className="bg-white flex justify-between items-center pl-4 pr-1 py-0 rounded text-xs">
            <span id="safety-summary-fatalities-label" className="text-gray-900">Fatalities</span>
            <span id="safety-summary-fatalities-value" className="text-gray-900">44</span>
          </div>
          <div id="safety-summary-severe-injuries" className="bg-gray-100 flex justify-between items-center pl-4 pr-1 py-0 rounded text-xs">
            <span id="safety-summary-severe-injuries-label" className="text-gray-900">Severe Injuries (Hospitalizations)</span>
            <span id="safety-summary-severe-injuries-value" className="text-gray-900">122</span>
          </div>
          <div id="safety-summary-injuries" className="bg-white flex justify-between items-center pl-4 pr-1 py-0 rounded text-xs">
            <span id="safety-summary-injuries-label" className="text-gray-900">Injuries</span>
            <span id="safety-summary-injuries-value" className="text-gray-900">1,003</span>
          </div>
          <div id="safety-summary-near-misses" className="bg-gray-100 flex justify-between items-center pl-4 pr-1 py-0 rounded text-xs">
            <span id="safety-summary-near-misses-label" className="text-gray-900">Near Misses</span>
            <span id="safety-summary-near-misses-value" className="text-gray-900">678</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MostDangerousAreas() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const dangerousAreas = [
    { rank: 1, location: "Mission St & De La Vina", incidents: 5 },
    { rank: 2, location: "State St & Cabrillo Blvd", incidents: 4 },
    { rank: 3, location: "Milpas St & Montecito St", incidents: 3, highlighted: true },
    { rank: 4, location: "Hollister Ave & Storke Rd", incidents: 2 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium text-gray-700">Most Dangerous Areas</h3>
        <CollapseButton isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div className="space-y-1">
          {dangerousAreas.map((area) => (
            <div 
              key={area.rank}
              className={`flex justify-between items-center px-2 py-0.5 rounded-md text-xs ${
                area.highlighted ? 'bg-gray-200' : 'bg-white'
              }`}
            >
              <span className="text-gray-900">
                {area.rank}. {area.location}
              </span>
              <span className={area.highlighted ? 'text-gray-500' : 'text-gray-600'}>
                {area.incidents} Incidents
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnualIncidentsComparison() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');

  const timeframes = ['Day', 'Month', 'Year'];

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-700">Annual Incidents Comparison</h3>
          <CollapseButton isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
        </div>
        
        {!isCollapsed && (
          <>
            <div className="flex items-center justify-between">
              {timeframes.map((timeframe) => (
                <button
                  key={timeframe}
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
            <div className="h-96 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Annual Incidents Chart</p>
                <p className="text-xs text-gray-500">
                  Line chart comparing 2023 vs 2024 incidents by day of week
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
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

function IncidentsVsTrafficRatios() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium text-gray-700">Incidents vs. Traffic Ratios</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          <hr className="border-gray-200 mb-2" />
          <div className="h-80 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
            <div className="text-center">
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

function SeverityBreakdown() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium text-gray-700">Severity Breakdown</h3>
        <CollapseButton isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div className="bg-white p-2">
          <div className="h-48 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Bar Chart</p>
              <p className="text-xs text-gray-500">Incidents by User Type</p>
              <div className="mt-2 flex items-center justify-center gap-4">
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

function ConflictTypeBreakdown() {
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
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium text-gray-700">Conflict Type Breakdown</h3>
        <CollapseButton isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          {/* Bar Chart */}
          <div className="h-48 bg-gray-50 rounded border border-gray-200 flex items-center justify-center mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Bar Chart</p>
              <p className="text-xs text-gray-500">Incidents by Conflict Type</p>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-1.5">
            {conflictTypes.map((conflict, index) => (
              <div key={index} className="flex items-center gap-1.5">
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

function CollapseButton({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-3.5 h-6 flex items-center justify-center">
      <div className="w-3.5 h-3.5 flex items-center justify-center">
        <svg 
          className={`w-3 h-3 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
    </button>
  );
}

function CollapseExpandIcon({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-3.5 h-6 flex items-center justify-center">
      <div className="w-3 h-2 bg-gray-400 rounded-sm"></div>
    </button>
  );
} 