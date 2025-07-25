import React, { useState } from "react";

export default function ModelCountTypeSection() {
  const [modelCountType, setModelCountType] = useState('strava');

  return (
    <div className="p-4">
      <div id="model-count-type-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Model Count Type</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              id="strava-bias-correction-radio"
              type="radio"
              name="modelCountType"
              value="strava"
              checked={modelCountType === 'strava'}
              onChange={(e) => setModelCountType(e.target.value)}
              className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Strava Bias Correction</span>
          </label>
          <label className="flex items-center">
            <input
              id="cost-benefit-tool-radio"
              type="radio"
              name="modelCountType"
              value="cost-benefit"
              checked={modelCountType === 'cost-benefit'}
              onChange={(e) => setModelCountType(e.target.value)}
              className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div className="ml-2 flex items-center">
              <span className="text-sm text-gray-700">Cost Benefit Tool</span>
              <div id="cost-benefit-info-icon" className="ml-1 w-2.5 h-2.5 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-600">?</span>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
} 