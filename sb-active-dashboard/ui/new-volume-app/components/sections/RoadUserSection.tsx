import React, { useState } from "react";

export default function RoadUserSection() {
  const [pedestrianChecked, setPedestrianChecked] = useState(true);
  const [bicyclistChecked, setBicyclistChecked] = useState(false);

  return (
    <div className="p-4">
      <div id="road-user-section">
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
    </div>
  );
} 