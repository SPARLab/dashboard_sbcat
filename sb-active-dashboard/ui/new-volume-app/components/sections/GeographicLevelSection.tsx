import React, { useState } from "react";

export default function GeographicLevelSection() {
  const [geographicLevel, setGeographicLevel] = useState('census-tract');

  const geographicOptions = [
    { id: 'region', label: 'Region', icon: '🗺️' },
    { id: 'city', label: 'City / Service Area', icon: '🏙️' },
    { id: 'census-tract', label: 'Census Tract', icon: '📊' },
    { id: 'hexagons', label: 'Hexagons', icon: '⬡' },
    { id: 'custom', label: 'Custom Draw Tool', icon: '✏️' }
  ];

  return (
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
  );
} 