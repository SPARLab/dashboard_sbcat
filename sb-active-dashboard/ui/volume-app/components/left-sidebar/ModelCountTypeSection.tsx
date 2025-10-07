import React from "react";
import Tooltip from "../../../components/Tooltip";

interface ModelCountTypeSectionProps {
  modelCountsBy: string;
  setModelCountsBy: (type: string) => void;
}

export default function ModelCountTypeSection({ 
  modelCountsBy, 
  setModelCountsBy 
}: ModelCountTypeSectionProps) {
  // Feature flag: Show Strava Bias Correction option
  const showStravaBiasCorrection = import.meta.env.VITE_SHOW_STRAVA_BIAS_CORRECTION === 'true';
  return (
    <div className="p-4">
      <div id="model-count-type-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Model Count Type</h3>
        <div className="space-y-0">
          {/* Hidden inputs - positioned outside flex containers */}
          {showStravaBiasCorrection && (
            <input
              id="strava-bias-correction-radio"
              type="radio"
              name="modelCountType"
              value="strava-bias"
              checked={modelCountsBy === 'strava-bias'}
              onChange={(e) => setModelCountsBy(e.target.value)}
              className="sr-only"
            />
          )}
          <input
            id="cost-benefit-tool-radio"
            type="radio"
            name="modelCountType"
            value="cost-benefit"
            checked={modelCountsBy === 'cost-benefit'}
            onChange={(e) => setModelCountsBy(e.target.value)}
            className="sr-only"
          />

          {/* Strava Bias Correction */}
          {showStravaBiasCorrection && (
            <label htmlFor="strava-bias-correction-radio" className="flex items-center cursor-pointer">
              <div className={`relative size-3.5 rounded-full ${
                modelCountsBy === 'strava-bias' 
                  ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                  : 'bg-transparent border border-gray-700'
              }`}>
                {modelCountsBy === 'strava-bias' && (
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
          )}

          {/* Cost Benefit Tool */}
          <label htmlFor="cost-benefit-tool-radio" className="flex items-center cursor-pointer">
            <div className={`relative size-3.5 rounded-full ${
              modelCountsBy === 'cost-benefit' 
                ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                : 'bg-transparent border border-gray-700'
            }`}>
              {modelCountsBy === 'cost-benefit' && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent border border-white w-2.5 h-2.5 rounded-full"
                  style={{ boxSizing: 'border-box' }}
                />
              )}
            </div>
            <div className="ml-2.5 flex items-start">
              <span className="text-[14px] font-normal leading-6 text-gray-700">
                Cost Benefit Tool ({''}
                <a 
                  href="https://activetravelbenefits.ucdavis.edu/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  link
                </a>
                )
              </span>
              <Tooltip 
                text="Additional information about Cost Benefit Tool can be found here: https://activetravelbenefits.ucdavis.edu/"
                className="ml-[2px]"
                align="left"
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
} 