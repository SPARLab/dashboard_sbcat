import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function MostDangerousAreas() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const dangerousAreas = [
    { rank: 1, location: "Mission St & De La Vina", incidents: 5 },
    { rank: 2, location: "State St & Cabrillo Blvd", incidents: 4 },
    { rank: 3, location: "Milpas St & Montecito St", incidents: 3 },
    { rank: 4, location: "Hollister Ave & Storke Rd", incidents: 2 },
  ];

  return (
    <div id="safety-most-dangerous-areas" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-dangerous-areas-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-dangerous-areas-title" className="text-base font-medium text-gray-700">Most Dangerous Areas</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-dangerous-areas-list" className="space-y-1">
          {dangerousAreas.map((area, index) => (
            <div 
              key={area.rank}
              id={`safety-dangerous-area-${area.rank}`}
              className={`flex justify-between items-center px-2 py-0.5 rounded-md text-xs ${
                index % 2 === 0 ? 'bg-gray-200' : 'bg-white'
              }`}
            >
              <span className="text-gray-900">
                {area.rank}. {area.location}
              </span>
              <span className="text-gray-600">
                {area.incidents} Incidents
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 