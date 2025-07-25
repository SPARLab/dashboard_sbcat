import React, { useState } from "react";

export default function DateRangeSection() {
  const [dateRange, setDateRange] = useState([20, 80]);

  const handleDateRangeChange = (index: number, value: number) => {
    const newRange = [...dateRange];
    newRange[index] = value;
    setDateRange(newRange);
  };

  return (
    <div className="p-4">
      <div id="date-range-section">
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
    </div>
  );
} 