import React, { useState } from "react";

interface GeographicLevelSectionProps {
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
  schoolDistrictFilter?: SchoolDistrictFilter;
  onSchoolDistrictFilterChange?: (filter: SchoolDistrictFilter) => void; // Make optional for Safety app
}

export interface SchoolDistrictFilter {
  gradeFilter: 'high-school' | 'secondary' | 'elementary';
}

interface GeographicOption {
  id: string;
  label: string;
  icon: string;
  hasSubOptions?: boolean;
}

export default function GeographicLevelSection({
  geographicLevel,
  onGeographicLevelChange,
  schoolDistrictFilter = { gradeFilter: 'high-school' },
  onSchoolDistrictFilterChange,
}: GeographicLevelSectionProps) {
  

  const geographicOptions: GeographicOption[] = [
    { id: 'county', label: 'County', icon: '/icons/region-icon.svg' },
    { id: 'city-service-area', label: 'City / Service Area', icon: '/icons/city-service-area-icon.svg' },
    { id: 'census-tract', label: 'Census Tract', icon: '/icons/census-tract-icon.svg' },
    { id: 'school-districts', label: 'School Districts', icon: '/icons/region-icon.svg', hasSubOptions: true },
    { id: 'unincorporated-areas', label: 'Unincorporated Areas', icon: '/icons/region-icon.svg' },
    { id: 'caltrans-highways', label: 'Caltrans Highways', icon: '/icons/region-icon.svg' },
    { id: 'custom', label: 'Custom Draw Tool', icon: '/icons/custom-draw-tool-icon.svg' }
  ];

  const handleSchoolDistrictFilterChange = (gradeFilter: SchoolDistrictFilter['gradeFilter']) => {
    const newFilter: SchoolDistrictFilter = {
      gradeFilter
    };
    
    if (onSchoolDistrictFilterChange) {
      onSchoolDistrictFilterChange(newFilter);
    }
  };

  return (
    <div className="p-4">
      <div id="geographic-level-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Geographic Level</h3>
        <div className="space-y-1">
          {geographicOptions.map((option) => (
            <div key={option.id}>
              <button
                id={`geographic-${option.id}-button`}
                onClick={() => onGeographicLevelChange(option.id)}
                className={`w-full flex items-center justify-start px-3 py-2 text-sm rounded border transition-colors duration-200 focus:outline-none active:outline-none ${
                  geographicLevel === option.id
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <img 
                  src={option.icon} 
                  alt={`${option.label} icon`}
                  className="w-4 h-4 mr-2"
                />
                {option.label}
                {option.hasSubOptions && geographicLevel === option.id && (
                  <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {/* School District Sub-Options */}
              {option.id === 'school-districts' && geographicLevel === 'school-districts' && (
                <div id="school-district-sub-options" className="mt-2 ml-6 space-y-2 border-l-2 border-blue-200 pl-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Grade Level Group</label>
                    <select
                      id="school-district-grade-filter"
                      value={schoolDistrictFilter.gradeFilter}
                      onChange={(e) => handleSchoolDistrictFilterChange(e.target.value as SchoolDistrictFilter['gradeFilter'])}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="high-school">High School (9-12)</option>
                      <option value="secondary">Secondary (7-8)</option>
                      <option value="elementary">Elementary (K-6)</option>
                    </select>
                  </div>
                  
                  {/* Info about grade level filtering */}
                  <div id="school-district-info" className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-start">
                      <svg className="w-3 h-3 text-blue-600 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-blue-800">
                        Shows district boundaries for the selected grade level group. District polygons may differ between Elementary, Secondary, and High School levels.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
