import React, { useState } from "react";

export default function ModelCountTypeSection() {
  const [modelCountType, setModelCountType] = useState('strava');

  return (
    <div className="p-4">
      <div id="model-count-type-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Model Count Type</h3>
        <div className="space-y-0">
          {/* Hidden inputs - positioned outside flex containers */}
          <input
            id="strava-bias-correction-radio"
            type="radio"
            name="modelCountType"
            value="strava"
            checked={modelCountType === 'strava'}
            onChange={(e) => setModelCountType(e.target.value)}
            className="sr-only"
          />
          <input
            id="cost-benefit-tool-radio"
            type="radio"
            name="modelCountType"
            value="cost-benefit"
            checked={modelCountType === 'cost-benefit'}
            onChange={(e) => setModelCountType(e.target.value)}
            className="sr-only"
          />

          {/* Strava Bias Correction */}
          <label htmlFor="strava-bias-correction-radio" className="flex items-center cursor-pointer">
            <div className={`relative size-3.5 rounded-full ${
              modelCountType === 'strava' 
                ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                : 'bg-transparent border border-gray-700'
            }`}>
              {modelCountType === 'strava' && (
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent border border-white w-2.5 h-2.5 rounded-full"
                  style={{ boxSizing: 'border-box' }}
                />
              )}
            </div>
            <span className="ml-2.5 text-[14px] font-normal leading-6 text-gray-700">
              Strava Bias Correction
            </span>
          </label>

          {/* Cost Benefit Tool */}
          <label htmlFor="cost-benefit-tool-radio" className="flex items-center cursor-pointer">
            <div className={`relative size-3.5 rounded-full ${
              modelCountType === 'cost-benefit' 
                ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                : 'bg-transparent border border-gray-700'
            }`}>
              {modelCountType === 'cost-benefit' && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent border border-white w-2.5 h-2.5 rounded-full"
                  style={{ boxSizing: 'border-box' }}
                />
              )}
            </div>
            <div className="ml-2.5 flex items-center">
              <span className="text-[14px] font-normal leading-6 text-gray-700">
                Cost Benefit Tool
              </span>
              <div id="cost-benefit-info-icon" className="ml-1 w-2.5 h-2.5 bg-gray-300 bg-opacity-25 rounded-lg flex items-center justify-center border border-gray-600 border-opacity-50">
                <span className="text-xs text-gray-600">?</span>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
} 