import React, { useState } from "react";

interface CompletenessMetricsProps {
  horizontalMargins: string;
}

export default function CompletenessMetrics({ horizontalMargins }: CompletenessMetricsProps) {
  const [isConfidenceExpanded, setIsConfidenceExpanded] = useState(false);

  // Sample data - this would come from your data source
  const timelineData = [
    {
      id: "site1",
      name: "Site 1",
      dataPeriods: [
        { start: 0, end: 35 },
        { start: 45, end: 55 },
        { start: 65, end: 85 },
        { start: 90, end: 95 }
      ]
    },
    {
      id: "site2", 
      name: "Site 2",
      dataPeriods: [
        { start: 10, end: 25 },
        { start: 40, end: 50 }
      ]
    },
    {
      id: "site3",
      name: "Site 3", 
      dataPeriods: [
        { start: 0, end: 45 },
        { start: 60, end: 100 }
      ]
    },
    {
      id: "site4",
      name: "Site 4",
      dataPeriods: [
        { start: 5, end: 95 }
      ]
    },
    {
      id: "site5",
      name: "Site 5",
      dataPeriods: [
        { start: 0, end: 15 },
        { start: 25, end: 35 },
        { start: 45, end: 55 },
        { start: 65, end: 75 },
        { start: 85, end: 95 }
      ]
    },
    {
      id: "site6",
      name: "Site 6",
      dataPeriods: []
    },
    {
      id: "site7",
      name: "Site 7",
      dataPeriods: []
    }
  ];

  return (
    <div id="data-completeness-container" className="w-[calc(100%-2rem)] bg-white border border-gray-200 rounded-md overflow-hidden mx-4">
      {/* Zone Locator Container */}
      <div id="zone-locator-container" className="bg-white">
        <div className={`py-4 ${horizontalMargins}`}>
          <h3 id="zone-locator-title" className="text-lg font-medium text-gray-800 leading-normal">
            Santa Barbara, CA<br />
            Census Tract 2039
          </h3>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Data Completeness Section */}
      <div id="data-completeness-section" className="bg-white">
        <div className={`py-2 space-y-1.5 ${horizontalMargins}`}>
          <h4 id="data-completeness-title" className="text-sm font-medium text-gray-700">
            Data Completeness
          </h4>
          
          {/* Progress Bar */}
          <div id="data-completeness-progress-container" className="flex items-center justify-between">
            <div id="data-completeness-progress-bar" className="bg-gray-200 h-4 rounded-full flex-1 mr-4">
              <div 
                id="data-completeness-progress-fill"
                className="bg-yellow-400 h-4 rounded-full" 
                style={{ width: '65%' }}
              />
            </div>
            <span id="data-completeness-percentage" className="text-sm font-medium text-black">65%</span>
          </div>
          
          <p id="data-completeness-confidence" className="text-xs text-gray-500">
            Medium confidence level
          </p>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Data Breakdown Section */}
      <div id="data-breakdown-section" className="bg-white">
        <div className={`py-2 space-y-3 ${horizontalMargins}`}>
          <h4 id="data-breakdown-title" className="text-sm font-medium text-gray-700">
            Data Breakdown
          </h4>
          
          {/* Freshness */}
          <div id="freshness-metric" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Freshness</span>
              <span className="text-xs font-medium text-black">72%</span>
            </div>
            <p className="text-sm text-black">Avg. last data upload: April 2024</p>
          </div>
          
          {/* Spatial Density */}
          <div id="spatial-density-metric" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Spatial Density</span>
              <span className="text-xs font-medium text-black">58%</span>
            </div>
            <p className="text-sm text-black">4 count sites in this zone</p>
          </div>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Stale Count Sites Section */}
      <div id="stale-count-sites-section" className="bg-white">
        <div className={`py-2 space-y-1.5 ${horizontalMargins}`}>
          <h4 id="stale-count-sites-title" className="text-sm font-medium text-gray-700">
            Stale Count Sites
          </h4>
          
          <div id="stale-sites-list" className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-sm text-black">Main St & Broadway (Last count: 2021)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-sm text-black">Oak Ave & 5th St (Last count: 2020)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Medium Confidence Warning with Timeline */}
      <div id="confidence-warning-section" className="bg-gray-50 border-t border-b rounded-t-md border-gray-200 overflow-hidden">
          <div 
            id="confidence-warning-header"
            className="px-3 py-2 cursor-pointer flex items-center justify-between"
            onClick={() => setIsConfidenceExpanded(!isConfidenceExpanded)}
          >
            <div className="flex items-center gap-2">
              <div id="warning-icon" className="w-4 h-4 flex-shrink-0">
                <svg viewBox="0 0 16 16" className="w-full h-full text-amber-500">
                  <path
                    fill="currentColor"
                    d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-800 leading-tight">
                Medium confidence - 5 out of 7 selected sites contributing data for given timeframe
              </p>
            </div>
            <div id="expand-icon" className={`transform transition-transform ${isConfidenceExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-3.5 h-2 text-gray-500" viewBox="0 0 14 8">
                <path
                  fill="currentColor"
                  d="M7 8L0 1l1.41-1.41L7 5.17l5.59-5.58L14 1 7 8z"
                />
              </svg>
            </div>
          </div>

          {/* Timeline Sparkline */}
          <div className={`transition-all duration-300 ease-in-out ${isConfidenceExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div id="timeline-sparkline-section" className="bg-white border-t border-gray-200 p-4">
              <div className="text-center mb-4">
                <h3 className="text-sm font-medium text-gray-600">Timeline of available data per site</h3>
                <p className="text-xs text-gray-500 mt-1">(Jan 2022 – Sept 2025)</p>
              </div>
              
              {/* Year Labels */}
              <div className="flex items-center mb-2">
                <div className="w-12 shrink-0"></div>
                <div className="flex-1 flex justify-between text-xs text-gray-500">
                  <span>2022</span>
                  <span>2023</span>
                  <span>2025</span>
                </div>
              </div>
              
              {/* Timeline Bars */}
              <div className="space-y-1">
                {timelineData.map((site) => (
                  <div key={site.id} className="flex items-center">
                    <div className="w-12 text-xs text-gray-600 font-medium">{site.name}</div>
                    <div className="flex-1 relative h-3 bg-gray-100 rounded-sm">
                      {site.dataPeriods.map((period, index) => (
                        <div
                          key={index}
                          className="absolute top-0 h-full bg-gray-800 rounded-sm"
                          style={{
                            left: `${period.start}%`,
                            width: `${period.end - period.start}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>

      {/* Total Data Collected Section */}
      <div id="total-data-collected-section" className="bg-white">
        <div className={`py-2 space-y-1.5 ${horizontalMargins}`}>
          <h4 id="total-data-title" className="text-sm font-medium text-gray-700">
            Total Data Collected
          </h4>
          <div id="total-data-card" className="bg-gray-50 rounded-md p-3">
            <div className="text-2xl font-medium text-black">1,248</div>
            <div className="text-xs text-gray-500">Hours of data collected in 2023</div>
          </div>
        </div>
      </div>
    </div>
  );
} 