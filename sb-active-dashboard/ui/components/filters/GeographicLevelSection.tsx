import React from "react";

interface GeographicLevelSectionProps {
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
}

export default function GeographicLevelSection({
  geographicLevel,
  onGeographicLevelChange,
}: GeographicLevelSectionProps) {
  const geographicOptions = [
    { id: 'county', label: 'County', icon: '/icons/region-icon.svg' },
    { id: 'city-service-area', label: 'City / Service Area', icon: '/icons/city-service-area-icon.svg' },
    { id: 'census-tract', label: 'Census Tract', icon: '/icons/census-tract-icon.svg' },
    { id: 'custom', label: 'Custom Draw Tool', icon: '/icons/custom-draw-tool-icon.svg' }
  ];

  return (
    <div className="p-4">
      <div id="geographic-level-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Geographic Level</h3>
        <div className="space-y-1">
          {geographicOptions.map((option) => (
            <button
              key={option.id}
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
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
