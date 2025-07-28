import React from "react";

interface DataPeriod {
  start: number; // percentage from start of timeline
  end: number;   // percentage from start of timeline
}

interface SiteData {
  id: string;
  name: string;
  dataPeriods: DataPeriod[];
}

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

          {/* Year Labels */}
          <div
            id="timeline-sparkline-chart-year-labels-container"
            className="flex items-center mb-2"
          >
            <div className="w-12 shrink-0">
              {/* This is a spacer to align with the site labels below */}
            </div>
            <div
              id="timeline-sparkline-chart-year-labels"
              className="flex flex-1 justify-between text-xs text-gray-500"
            >
              {years.map((year) => (
                <span
                  id={`timeline-sparkline-chart-year-label-${year}`}
                  key={year}
                >
                  {year}
                </span>
              ))}
            </div>
          </div>

          {/* Timeline Chart */}
          <div id="timeline-sparkline-chart-rows-container" className="space-y-2">
            {sites.map((site) => (
              <div
                id={`timeline-sparkline-chart-row-${site.id}`}
                key={site.id}
                className="flex items-center"
              >
                {/* Site Label */}
                <div
                  id={`timeline-sparkline-chart-site-label-${site.id}`}
                  className="w-12 text-xs text-gray-600 font-medium"
                >
                  {site.name}
                </div>

                {/* Timeline Bar Container */}
                <div
                  id={`timeline-sparkline-chart-bar-container-${site.id}`}
                  className="flex-1 relative h-4 bg-gray-100 rounded-sm"
                >
                  {/* Data Period Bars */}
                  {site.dataPeriods.map((period, index) => (
                    <div
                      id={`timeline-sparkline-chart-data-period-${site.id}-${index}`}
                      key={index}
                      className="absolute top-0 h-full bg-slate-800 rounded-sm"
                      style={{
                        left: `${period.start}%`,
                        width: `${period.end - period.start}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 