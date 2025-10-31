import { useState, useEffect } from 'react';
import { DEFAULT_VOLUME_WEIGHTS, VolumeWeightConfig } from '../../../../lib/safety-app/utils/incidentRiskMatrix';
import CollapseExpandIcon from '../../../components/CollapseExpandIcon';
import MoreInformationIcon from '../right-sidebar/MoreInformationIcon';

interface VolumeWeightControlsProps {
  weights: VolumeWeightConfig;
  onWeightsChange: (weights: VolumeWeightConfig) => void;
}

export default function VolumeWeightControls({ 
  weights, 
  onWeightsChange
}: VolumeWeightControlsProps) {
  const [expanded, setExpanded] = useState(true); // Expanded by default
  const [draftWeights, setDraftWeights] = useState<VolumeWeightConfig>(weights);

  // Sync draft weights when committed weights change externally (e.g., from reset)
  useEffect(() => {
    setDraftWeights(weights);
  }, [weights]);

  const handleWeightChange = (category: keyof VolumeWeightConfig, value: number) => {
    setDraftWeights({
      ...draftWeights,
      [category]: value
    });
  };

  const handleApply = () => {
    onWeightsChange(draftWeights);
  };

  const handleReset = () => {
    setDraftWeights(DEFAULT_VOLUME_WEIGHTS);
    onWeightsChange(DEFAULT_VOLUME_WEIGHTS);
  };

  const hasUnappliedChanges = 
    draftWeights.low !== weights.low ||
    draftWeights.medium !== weights.medium ||
    draftWeights.high !== weights.high;

  const isDefault = 
    draftWeights.low === DEFAULT_VOLUME_WEIGHTS.low &&
    draftWeights.medium === DEFAULT_VOLUME_WEIGHTS.medium &&
    draftWeights.high === DEFAULT_VOLUME_WEIGHTS.high;

  const getWeightDescription = (weight: number, category: string, baseline: number = 1.0) => {
    if (weight === 0) return "Hidden (filtered out)";
    
    // Calculate relative intensity compared to baseline
    const ratio = weight / baseline;
    
    // Show what this means in practical terms
    if (ratio >= 4) {
      return `Much more visible - hotspots form ~${ratio.toFixed(0)}x faster than medium-volume areas`;
    } else if (ratio >= 2) {
      return `More visible - hotspots form ~${ratio.toFixed(1)}x faster than medium-volume areas`;
    } else if (ratio > 1.2) {
      return `Slightly more visible than medium-volume areas`;
    } else if (ratio >= 0.8 && ratio <= 1.2) {
      return `Similar visibility to medium-volume areas (baseline)`;
    } else if (ratio >= 0.5) {
      return `Less visible - needs ~${(1/ratio).toFixed(1)}x more incidents than medium-volume for same intensity`;
    } else {
      return `Much less visible - needs ~${(1/ratio).toFixed(0)}x more incidents than medium-volume for same intensity`;
    }
  };

  return (
    <div 
      id="volume-weight-controls"
      className="bg-white border border-gray-200 rounded-md p-4"
    >
      {/* Header */}
      <div id="volume-weight-controls-header" className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 id="volume-weight-controls-title" className="text-base font-medium text-gray-700">
            Volume Weighting
          </h3>
          {hasUnappliedChanges && !expanded && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded">
              Pending
            </span>
          )}
          <MoreInformationIcon 
            text="Adjust weights to change how traffic volume affects incident visibility. 1.0x = neutral. Higher values emphasize incidents. Volume estimates based on 2023 bike traffic data."
            align="center"
            width="w-80"
          />
        </div>
        <CollapseExpandIcon 
          id="volume-weight-expand-button"
          isCollapsed={!expanded}
          onClick={() => setExpanded(!expanded)}
        />
      </div>

      {/* Collapsed State - Show Current Values */}
      {!expanded && (
        <div className="mt-2">
          <p className="text-xs text-gray-600">
            Low: {weights.low.toFixed(1)}x • Medium: {weights.medium.toFixed(1)}x • High: {weights.high.toFixed(1)}x
          </p>
        </div>
      )}

      {/* Expanded State - Show Sliders */}
      {expanded && (
        <div className="mt-4 space-y-6">
          
          {/* Low Volume Weight */}
          <div id="low-volume-weight-control">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Low Volume Areas</span>
              <span className="px-3 py-1 text-sm font-bold bg-blue-600 text-white rounded">
                {draftWeights.low.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              value={draftWeights.low}
              onChange={(e) => handleWeightChange('low', parseFloat(e.target.value))}
              min="0"
              max="5"
              step="0.1"
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0x</span>
              <span>2.5x</span>
              <span>5x</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {getWeightDescription(draftWeights.low, 'low-volume', draftWeights.medium)}
            </p>
          </div>

          {/* Medium Volume Weight */}
          <div id="medium-volume-weight-control">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Medium Volume Areas</span>
              <span className="px-3 py-1 text-sm font-bold bg-blue-600 text-white rounded">
                {draftWeights.medium.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              value={draftWeights.medium}
              onChange={(e) => handleWeightChange('medium', parseFloat(e.target.value))}
              min="0"
              max="5"
              step="0.1"
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0x</span>
              <span>2.5x</span>
              <span>5x</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {getWeightDescription(draftWeights.medium, 'medium-volume', draftWeights.medium)}
            </p>
          </div>

          {/* High Volume Weight */}
          <div id="high-volume-weight-control">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">High Volume Areas</span>
              <span className="px-3 py-1 text-sm font-bold bg-blue-600 text-white rounded">
                {draftWeights.high.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              value={draftWeights.high}
              onChange={(e) => handleWeightChange('high', parseFloat(e.target.value))}
              min="0"
              max="5"
              step="0.1"
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0x</span>
              <span>2.5x</span>
              <span>5x</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {getWeightDescription(draftWeights.high, 'high-volume', draftWeights.medium)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {hasUnappliedChanges && (
              <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2">
                <p className="text-xs font-medium text-orange-800">
                  ⚠️ Changes pending - click Apply to update map
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                id="apply-weights-button"
                onClick={handleApply}
                disabled={!hasUnappliedChanges}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors ${
                  hasUnappliedChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                APPLY
              </button>
              <button
                id="reset-weights-button"
                onClick={handleReset}
                disabled={isDefault}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  isDefault
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                RESET
              </button>
            </div>
          </div>

          {/* Info Text */}
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 space-y-2">
            <p className="text-xs text-gray-700">
              💡 <strong>How weights work:</strong> 1.0x = neutral (no adjustment). Values &gt; 1.0x emphasize incidents, values &lt; 1.0x de-emphasize them. Set all to 1.0x to match the raw incident heatmap.
            </p>
            <p className="text-xs text-gray-700">
              <strong>Tip:</strong> Adjust sliders to preview values, then click <strong>Apply</strong> to update the map. Set to 0x to hide a category entirely.
            </p>
            <p className="text-xs text-gray-600">
              <strong>Data Source:</strong> Volume categories based on 2023 bike traffic estimates. Descriptions show relative visibility compared to medium-volume areas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
