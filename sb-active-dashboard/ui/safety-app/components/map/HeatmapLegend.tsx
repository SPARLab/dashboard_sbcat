import React from 'react';
import { VolumeWeightConfig } from '../../../../lib/safety-app/utils/incidentRiskMatrix';

interface HeatmapLegendProps {
  colorStops: Array<{ ratio: number; color: string | __esri.Color }>;
  title?: string;
  minLabel?: string;
  maxLabel?: string;
  volumeWeights?: VolumeWeightConfig;
  showIncidentCounts?: boolean;
}

export default function HeatmapLegend({ 
  colorStops, 
  title = "Incident Density",
  minLabel = "Low",
  maxLabel = "High",
  volumeWeights,
  showIncidentCounts = false
}: HeatmapLegendProps) {
  // Calculate approximate incident counts if weights provided
  const getIncidentGuidance = () => {
    if (!volumeWeights || !showIncidentCounts) return null;
    
    const maxDensity = 0.06; // Match the heatmap renderer setting (ArcGIS pixel density units)
    const avgWeight = (volumeWeights.low + volumeWeights.medium + volumeWeights.high) / 3;
    
    // Rough approximations for incident counts at different intensity levels
    const highCount = Math.max(1, Math.ceil(maxDensity / avgWeight)); // Dark purple
    const lowCount = Math.max(1, Math.ceil((maxDensity * 0.2) / avgWeight)); // Light purple
    
    return { high: highCount, low: lowCount };
  };
  
  const incidentCounts = getIncidentGuidance();
  // Create gradient string from color stops
  const gradientStops = colorStops
    .filter(stop => {
      const colorStr = typeof stop.color === 'string' ? stop.color : stop.color.toString();
      return colorStr !== "rgba(255, 255, 255, 0)"; // Filter out transparent
    })
    .map(stop => {
      const colorStr = typeof stop.color === 'string' ? stop.color : stop.color.toString();
      return `${colorStr} ${stop.ratio * 100}%`;
    })
    .join(', ');

  const gradientStyle = {
    background: `linear-gradient(to top, ${gradientStops})`
  };

  return (
    <div id="heatmap-legend-container" className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-36">
      <h4 id="heatmap-legend-title" className="text-xs font-normal text-gray-900 mb-3">
        {title}
      </h4>
      
      <div id="heatmap-legend-content" className="space-y-2">
        {/* Gradient bar */}
        <div id="heatmap-gradient-container" className="flex items-center gap-2">
          <div 
            id="heatmap-gradient-bar"
            className="w-4 h-24 rounded border border-gray-300"
            style={gradientStyle}
          />
          <div id="heatmap-gradient-labels" className="flex flex-col justify-between h-24 text-xs text-gray-700">
            <span id="heatmap-max-label" className="text-right">
              {maxLabel}
              {incidentCounts && <div className="text-[0.65rem] text-gray-500">~{incidentCounts.high}+ incidents</div>}
            </span>
            <span id="heatmap-min-label" className="text-right">
              {minLabel}
              {incidentCounts && <div className="text-[0.65rem] text-gray-500">~{incidentCounts.low} incidents</div>}
            </span>
          </div>
        </div>
        
        {incidentCounts && (
          <div id="heatmap-incident-note" className="text-[0.65rem] text-gray-500 italic mt-2 pt-2 border-t border-gray-200">
            Counts show overlapping incidents in same area
          </div>
        )}
      </div>
    </div>
  );
}

