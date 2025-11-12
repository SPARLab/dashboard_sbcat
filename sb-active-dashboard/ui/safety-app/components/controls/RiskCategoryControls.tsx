import { useState } from 'react';
import { RiskCategoryFilters, DEFAULT_RISK_FILTERS } from '../../../../lib/safety-app/utils/incidentRiskMatrix';
import CollapseExpandIcon from '../../../components/CollapseExpandIcon';
import MoreInformationIcon from '../right-sidebar/MoreInformationIcon';

interface RiskCategoryControlsProps {
  filters: RiskCategoryFilters;
  onFiltersChange: (filters: RiskCategoryFilters) => void;
}

export default function RiskCategoryControls({ 
  filters, 
  onFiltersChange
}: RiskCategoryControlsProps) {
  const [expanded, setExpanded] = useState(true); // Expanded by default

  const handleToggle = (category: keyof RiskCategoryFilters) => {
    onFiltersChange({
      ...filters,
      [category]: !filters[category]
    });
  };

  const handleShowAll = () => {
    onFiltersChange(DEFAULT_RISK_FILTERS);
  };

  const handleHideAll = () => {
    onFiltersChange({
      low: false,
      medium: false,
      high: false
    });
  };

  const allVisible = filters.low && filters.medium && filters.high;
  const allHidden = !filters.low && !filters.medium && !filters.high;
  const visibleCount = [filters.low, filters.medium, filters.high].filter(Boolean).length;

  return (
    <div 
      id="risk-category-controls"
      className="bg-white border border-gray-200 rounded-md p-4"
    >
      {/* Header */}
      <div id="risk-category-controls-header" className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 id="risk-category-controls-title" className="text-base font-medium text-gray-700">
            Volume Categories
          </h3>
          {!allVisible && !expanded && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {visibleCount} shown
            </span>
          )}
          <MoreInformationIcon 
            text="Toggle to show/hide incidents based on the traffic volume of the area where they occurred. All categories use the same visualization weight, distinguished by color."
            align="center"
            width="w-80"
          />
        </div>
        <CollapseExpandIcon 
          id="risk-category-expand-button"
          isCollapsed={!expanded}
          onClick={() => setExpanded(!expanded)}
        />
      </div>

      {/* Collapsed State - Show Active Categories */}
      {!expanded && (
        <div className="mt-2">
          <p className="text-xs text-gray-600">
            {filters.low && <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(220, 50, 32, 0.8)' }}></span>
              Low
            </span>}
            {filters.low && (filters.medium || filters.high) && <span className="mx-1">•</span>}
            {filters.medium && <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(255, 194, 10, 0.8)' }}></span>
              Medium
            </span>}
            {filters.medium && filters.high && <span className="mx-1">•</span>}
            {filters.high && <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(12, 123, 220, 0.8)' }}></span>
              High
            </span>}
            {allHidden && <span className="text-gray-500 italic">None shown</span>}
          </p>
        </div>
      )}

      {/* Expanded State - Show Toggles */}
      {expanded && (
        <div className="mt-4 space-y-4">
          
          {/* Low Volume Toggle */}
          <div id="low-volume-toggle" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: 'rgba(220, 50, 32, 0.8)' }}
              ></div>
              <div>
                <span className="text-sm font-medium text-gray-700">Low Volume Incidents</span>
                <p className="text-xs text-gray-500">Occurred in low-traffic areas</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.low}
                onChange={() => handleToggle('low')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Medium Volume Toggle */}
          <div id="medium-volume-toggle" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: 'rgba(255, 194, 10, 0.8)' }}
              ></div>
              <div>
                <span className="text-sm font-medium text-gray-700">Medium Volume Incidents</span>
                <p className="text-xs text-gray-500">Occurred in moderate-traffic areas</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.medium}
                onChange={() => handleToggle('medium')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* High Volume Toggle */}
          <div id="high-volume-toggle" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: 'rgba(12, 123, 220, 0.8)' }}
              ></div>
              <div>
                <span className="text-sm font-medium text-gray-700">High Volume Incidents</span>
                <p className="text-xs text-gray-500">Occurred in high-traffic areas</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.high}
                onChange={() => handleToggle('high')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              id="show-all-categories-button"
              onClick={handleShowAll}
              disabled={allVisible}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                allVisible
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Show All
            </button>
            <button
              id="hide-all-categories-button"
              onClick={handleHideAll}
              disabled={allHidden}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                allHidden
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Hide All
            </button>
          </div>

          {/* Info Text */}
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 space-y-2">
            <p className="text-xs text-gray-700">
              💡 <strong>How volume categories work:</strong> Incidents are grouped by the traffic volume level of the area where they occurred. This helps identify patterns in low-traffic vs. high-traffic locations.
            </p>
            <p className="text-xs text-gray-700">
              <strong>Colors:</strong> Red (#DC3220) = Low volume, Yellow (#FFC20A) = Medium volume, Blue (#0C7BDC) = High volume.
            </p>
            <p className="text-xs text-gray-600">
              <strong>Data Source:</strong> Volume categories based on 2023 bike traffic estimates. This is not based on vehicle volumes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

