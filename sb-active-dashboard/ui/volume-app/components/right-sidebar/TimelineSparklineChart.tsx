import React from "react";
import SharedTimelineChart, { type SiteData } from "./SharedTimelineChart";

interface TimelineSparklineChartProps {
  sites: SiteData[];
  startYear: number;
  endYear: number;
  dateRange: string;
  isCollapsed: boolean;
}

export default function TimelineSparklineChart({
  sites,
  startYear,
  endYear,
  dateRange,
  isCollapsed
}: TimelineSparklineChartProps) {
  // Generate year labels
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }

  return (
    <div
      id="timeline-sparkline-chart"
      className={`grid bg-white rounded-b-lg transition-[grid-template-rows] ease-in-out duration-500 ${
        isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}
    >
      <div id="timeline-sparkline-chart-overflow-container" className="overflow-hidden">
        <div id="timeline-sparkline-chart-padding-container" className="px-4 pb-4">
          {/* Chart Title */}
          <div id="timeline-sparkline-chart-title-container" className="pt-4 mb-4">
            <h3
              id="timeline-sparkline-chart-title"
              className="text-sm font-medium text-gray-900 text-center"
            >
              Timeline of available data per site
            </h3>
            <p
              id="timeline-sparkline-chart-date-range"
              className="text-xs text-gray-500 text-center mt-1"
            >
              ({dateRange})
            </p>
          </div>

          <SharedTimelineChart
            sites={sites}
            years={years}
            variant="standard"
            idPrefix="timeline-sparkline-chart"
          />
        </div>
      </div>
    </div>
  );
} 