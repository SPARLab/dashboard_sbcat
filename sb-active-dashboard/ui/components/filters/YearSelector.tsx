import React from 'react';

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears?: number[];
  modelType?: string;
}

function YearSelector({ 
  selectedYear, 
  onYearChange, 
  availableYears,
  modelType = "cost-benefit" 
}: YearSelectorProps) {
  // Default available years based on the documentation
  const getDefaultYears = () => {
    if (modelType === "cost-benefit") {
      return [2019, 2020, 2021, 2022, 2023];
    } else if (modelType === "strava-bias") {
      return [2023];
    }
    return [2023]; // fallback
  };

  const years = availableYears || getDefaultYears();

  return (
    <div className="p-4">
      <div id="year-selector-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Model Year</h3>
        <div className="bg-gray-100 p-3 rounded-md">
          <select
            id="year-dropdown"
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <div className="mt-2 text-xs text-gray-600">
            {modelType === "cost-benefit" && (
              <p>Cost Benefit Tool model data available for 2019-2023</p>
            )}
            {modelType === "strava-bias" && (
              <p>Strava Bias-Corrected model data available for 2023 only</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(YearSelector);