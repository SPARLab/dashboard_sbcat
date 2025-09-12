import React, { useState } from "react";

interface GeographicLevelSectionProps {
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
  schoolDistrictFilter?: SchoolDistrictFilter;
  onSchoolDistrictFilterChange?: (filter: SchoolDistrictFilter) => void;
}

export interface SchoolDistrictFilter {
  gradeFilter: 'all' | 'elementary' | 'high-school' | 'unified' | 'custom';
  customGradeRange?: {
    minGrade: number;
    maxGrade: number;
  };
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
  schoolDistrictFilter = { gradeFilter: 'all' },
  onSchoolDistrictFilterChange,
}: GeographicLevelSectionProps) {
  const [showCustomGradeRange, setShowCustomGradeRange] = useState(false);

  const geographicOptions: GeographicOption[] = [
    { id: 'county', label: 'County', icon: '/icons/region-icon.svg' },
    { id: 'city-service-area', label: 'City / Service Area', icon: '/icons/city-service-area-icon.svg' },
    { id: 'census-tract', label: 'Census Tract', icon: '/icons/census-tract-icon.svg' },
    { id: 'school-districts', label: 'School Districts', icon: '/icons/region-icon.svg', hasSubOptions: true },
    { id: 'custom', label: 'Custom Draw Tool', icon: '/icons/custom-draw-tool-icon.svg' }
  ];

  const handleSchoolDistrictFilterChange = (gradeFilter: SchoolDistrictFilter['gradeFilter']) => {
    const newFilter: SchoolDistrictFilter = {
      gradeFilter,
      ...(gradeFilter === 'custom' && schoolDistrictFilter.customGradeRange 
        ? { customGradeRange: schoolDistrictFilter.customGradeRange }
        : {})
    };
    
    onSchoolDistrictFilterChange?.(newFilter);
    setShowCustomGradeRange(gradeFilter === 'custom');
  };

  const handleCustomGradeChange = (minGrade: number, maxGrade: number) => {
    const newFilter: SchoolDistrictFilter = {
      gradeFilter: 'custom',
      customGradeRange: { minGrade, maxGrade }
    };
    onSchoolDistrictFilterChange?.(newFilter);
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
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Grade Level Filter</label>
                    <select
                      id="school-district-grade-filter"
                      value={schoolDistrictFilter.gradeFilter}
                      onChange={(e) => handleSchoolDistrictFilterChange(e.target.value as SchoolDistrictFilter['gradeFilter'])}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Districts</option>
                      <option value="elementary">Elementary Only (K-8)</option>
                      <option value="high-school">High School Only (9-12)</option>
                      <option value="unified">Unified Districts (K-12)</option>
                      <option value="custom">Custom Grade Range</option>
                    </select>
                  </div>
                  
                  {/* Custom Grade Range Inputs */}
                  {(showCustomGradeRange || schoolDistrictFilter.gradeFilter === 'custom') && (
                    <div id="custom-grade-range" className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 block">Custom Grade Range</label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 block">Min Grade</label>
                          <select
                            id="min-grade-select"
                            value={schoolDistrictFilter.customGradeRange?.minGrade ?? 0}
                            onChange={(e) => handleCustomGradeChange(
                              parseInt(e.target.value), 
                              schoolDistrictFilter.customGradeRange?.maxGrade ?? 12
                            )}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 13 }, (_, i) => (
                              <option key={i} value={i}>{i === 0 ? 'K' : i}</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-xs text-gray-400">to</span>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 block">Max Grade</label>
                          <select
                            id="max-grade-select"
                            value={schoolDistrictFilter.customGradeRange?.maxGrade ?? 12}
                            onChange={(e) => handleCustomGradeChange(
                              schoolDistrictFilter.customGradeRange?.minGrade ?? 0,
                              parseInt(e.target.value)
                            )}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 13 }, (_, i) => (
                              <option key={i} value={i}>{i === 0 ? 'K' : i}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Shows districts serving grades {schoolDistrictFilter.customGradeRange?.minGrade === 0 ? 'K' : schoolDistrictFilter.customGradeRange?.minGrade ?? 'K'} 
                        {' '}through {schoolDistrictFilter.customGradeRange?.maxGrade ?? 12}
                      </p>
                    </div>
                  )}
                  
                  {/* Info about overlapping districts */}
                  <div id="school-district-info" className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="flex items-start">
                      <svg className="w-3 h-3 text-yellow-600 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-800">
                        School districts may overlap geographically. Elementary and high school districts often serve the same areas.
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
