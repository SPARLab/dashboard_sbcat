import React, { useState } from "react";

export default function NewVolumePage() {
  const [activeTab, setActiveTab] = useState('modeled-data');
  const [modelCountType, setModelCountType] = useState('strava');
  const [pedestrianChecked, setPedestrianChecked] = useState(true);
  const [bicyclistChecked, setBicyclistChecked] = useState(false);
  const [dateRange, setDateRange] = useState([20, 80]);
  const [geographicLevel, setGeographicLevel] = useState('census-tract');

  const handleDateRangeChange = (index: number, value: number) => {
    const newRange = [...dateRange];
    newRange[index] = value;
    setDateRange(newRange);
  };

  const geographicOptions = [
    { id: 'region', label: 'Region', icon: '🗺️' },
    { id: 'city', label: 'City / Service Area', icon: '🏙️' },
    { id: 'census-tract', label: 'Census Tract', icon: '📊' },
    { id: 'hexagons', label: 'Hexagons', icon: '⬡' },
    { id: 'custom', label: 'Custom Draw Tool', icon: '✏️' }
  ];

  const tabs = [
    { id: 'modeled-data', label: 'Modeled Data' },
    { id: 'raw-data', label: 'Raw Data' },
    { id: 'data-completeness', label: 'Data Completeness' }
  ];

  return (
    <div id="new-volumes-page" className="flex flex-col h-screen bg-white">
      {/* Sub-navigation Tabs */}
      <div id="volume-sub-navigation" className="flex justify-center items-center bg-gray-50 border-b border-gray-200 h-[3rem]">
        <div className="flex justify-center items-center h-[38px] px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-8 py-2 text-[14px] font-medium bg-transparent border-none cursor-pointer hover:bg-gray-100 transition-colors ${
                activeTab === tab.id ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div id="volume-main-content" className="flex flex-1">
        {/* Left Sidebar */}
        <div id="volume-filters-sidebar" className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            {/* Sort Data Header */}
            <h2 id="sort-data-header" className="text-xl font-semibold text-gray-900 mb-4">Sort Data</h2>
            
            <hr className="border-gray-200 mb-4" />

            {/* Model Count Type */}
            <div id="model-count-type-section" className="mb-6">
              <h3 className="text-base font-medium text-gray-700 mb-3">Model Count Type</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    id="strava-bias-correction-radio"
                    type="radio"
                    name="modelCountType"
                    value="strava"
                    checked={modelCountType === 'strava'}
                    onChange={(e) => setModelCountType(e.target.value)}
                    className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Strava Bias Correction</span>
                </label>
                <label className="flex items-center">
                  <input
                    id="cost-benefit-tool-radio"
                    type="radio"
                    name="modelCountType"
                    value="cost-benefit"
                    checked={modelCountType === 'cost-benefit'}
                    onChange={(e) => setModelCountType(e.target.value)}
                    className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-2 flex items-center">
                    <span className="text-sm text-gray-700">Cost Benefit Tool</span>
                    <div id="cost-benefit-info-icon" className="ml-1 w-2.5 h-2.5 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-600">?</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Select Road User */}
            <div id="road-user-section" className="mb-6">
              <h3 className="text-base font-medium text-gray-700 mb-3">Select Road User</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    id="pedestrian-checkbox"
                    type="checkbox"
                    checked={pedestrianChecked}
                    onChange={(e) => setPedestrianChecked(e.target.checked)}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Pedestrian</span>
                </label>
                <label className="flex items-center">
                  <input
                    id="bicyclist-checkbox"
                    type="checkbox"
                    checked={bicyclistChecked}
                    onChange={(e) => setBicyclistChecked(e.target.checked)}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Bicyclist</span>
                </label>
              </div>
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Date Range */}
            <div id="date-range-section" className="mb-6">
              <h3 className="text-base font-medium text-gray-700 mb-3">Date Range</h3>
              <div id="date-range-picker" className="bg-gray-100 p-2 rounded">
                <div className="flex justify-between mb-2">
                  <span id="start-date-label" className="text-xs text-gray-500">Jan 1, 2023</span>
                  <span id="end-date-label" className="text-xs text-gray-500">Dec 31, 2023</span>
                </div>
                <div className="relative">
                  <input
                    id="date-range-start-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={dateRange[0]}
                    onChange={(e) => handleDateRangeChange(0, parseInt(e.target.value))}
                    className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <input
                    id="date-range-end-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={dateRange[1]}
                    onChange={(e) => handleDateRangeChange(1, parseInt(e.target.value))}
                    className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <div id="date-range-track" className="relative h-2 bg-gray-200 rounded-lg">
                    <div 
                      id="date-range-selection"
                      className="absolute h-2 bg-blue-500 rounded-lg"
                      style={{
                        left: `${dateRange[0]}%`,
                        width: `${dateRange[1] - dateRange[0]}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Geographic Level */}
            <div id="geographic-level-section" className="mb-4">
              <h3 className="text-base font-medium text-gray-700 mb-3">Geographic Level</h3>
              <div className="space-y-1">
                {geographicOptions.map((option) => (
                  <button
                    key={option.id}
                    id={`geographic-${option.id}-button`}
                    onClick={() => setGeographicLevel(option.id)}
                    className={`w-full flex items-center justify-start px-3 py-2 text-sm rounded border transition-colors duration-200 ${
                      geographicLevel === option.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div id="volume-map-container" className="flex-1 bg-gray-200 relative flex items-center justify-center">
          <h2 id="map-placeholder-text" className="text-lg text-gray-600">Interactive Map - Heatmap View</h2>
          
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

        {/* Right Sidebar */}
        <div id="volume-trends-sidebar" className="w-[412px] bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 id="trends-header" className="text-xl font-semibold text-gray-900 mb-6">
              Trends Derived From Modeled Data
            </h2>

            {/* Bar Chart Container */}
            <div id="volume-bar-chart-container" className="border border-gray-200 rounded p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 id="bar-chart-title" className="text-base font-medium text-gray-700">
                  Miles of Street by Traffic Level
                </h3>
                <span id="chart-collapse-button" className="text-sm cursor-pointer text-gray-600">−</span>
              </div>

              <p id="chart-summary" className="text-sm text-blue-600 text-center mb-2 font-semibold">
                124 Pedestrians & Bicyclists
              </p>

              <p id="chart-description" className="text-xs text-gray-500 text-center mb-6">
                Miles within network assigned to each category, based on current selection
              </p>

              {/* Mock Bar Chart */}
              <div id="volume-bar-chart" className="flex items-end justify-center gap-4 h-48 mb-4">
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

              {/* Y-axis labels would go here in a real implementation */}
              <div id="chart-y-axis-label" className="text-xs text-gray-500 text-center">
                <span className="block transform -rotate-90 absolute left-2 top-1/2">Network Miles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div id="volume-footer" className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="max-w-none px-6">
          <p id="footer-copyright" className="text-sm text-gray-600 text-center">
            © 2025 Active SB Dashboard. Data completeness and modeling information.
          </p>
        </div>
      </div>
    </div>
  );
} 