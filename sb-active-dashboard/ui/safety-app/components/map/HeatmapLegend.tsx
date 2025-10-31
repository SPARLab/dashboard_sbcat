import React from 'react';

interface HeatmapLegendProps {
  colorStops: Array<{ ratio: number; color: string | __esri.Color }>;
  title?: string;
  minLabel?: string;
  maxLabel?: string;
}

export default function HeatmapLegend({ 
  colorStops, 
  title = "Incident Density",
  minLabel = "Low",
  maxLabel = "High"
}: HeatmapLegendProps) {
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
    <div id="heatmap-legend-container" className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-[8rem]">
      <h4 id="heatmap-legend-title" className="text-xs font-normal text-gray-900 mb-3">
        {title}
      </h4>
      
      <div id="heatmap-legend-content" className="flex justify-center">
        {/* Gradient bar and labels container */}
        <div id="heatmap-gradient-container" className="flex items-center gap-2">
          <div 
            id="heatmap-gradient-bar"
            className="w-4 h-24 rounded border border-gray-300"
            style={gradientStyle}
          />
          <div id="heatmap-gradient-labels" className="flex flex-col justify-between h-24 text-xs text-gray-700">
            <span id="heatmap-max-label" className="text-right">
              {maxLabel}
            </span>
            <span id="heatmap-min-label" className="text-right">
              {minLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

