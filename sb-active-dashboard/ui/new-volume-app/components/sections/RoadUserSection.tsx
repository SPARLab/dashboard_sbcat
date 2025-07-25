import React, { useState } from "react";

export default function RoadUserSection() {
  const [pedestrianChecked, setPedestrianChecked] = useState(true);
  const [bicyclistChecked, setBicyclistChecked] = useState(false);

  return (
    <div className="p-4">
      <div id="road-user-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Select Road User</h3>
        <div className="space-y-0">
          <input
            id="pedestrian-checkbox"
            type="checkbox"
            checked={pedestrianChecked}
            onChange={(e) => setPedestrianChecked(e.target.checked)}
            className="sr-only"
          />
          <label htmlFor="pedestrian-checkbox" className="flex items-center cursor-pointer">
            <div className={`relative size-3.5 rounded ${
              pedestrianChecked 
                ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                : 'bg-transparent border border-gray-700'
            }`}>
              {pedestrianChecked && (
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="ml-2.5 text-[14px] font-normal leading-6 text-gray-700">Pedestrian</span>
          </label>
          
          <input
            id="bicyclist-checkbox"
            type="checkbox"
            checked={bicyclistChecked}
            onChange={(e) => setBicyclistChecked(e.target.checked)}
            className="sr-only"
          />
          <label htmlFor="bicyclist-checkbox" className="flex items-center cursor-pointer">
            <div className={`relative size-3.5 rounded ${
              bicyclistChecked 
                ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                : 'bg-transparent border border-gray-700'
            }`}>
              {bicyclistChecked && (
                 <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="ml-2.5 text-[14px] font-normal leading-6 text-gray-700">Bicyclist</span>
          </label>
        </div>
      </div>
    </div>
  );
} 