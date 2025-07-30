import React from "react";

export interface DataPeriod {
  start: number; // percentage from start of timeline
  end: number;   // percentage from start of timeline
}

export interface SiteData {
  id: string;
  name: string;
  dataPeriods: DataPeriod[];
}

export interface TimelineChartVariant {
  barHeight: 'h-3' | 'h-4';
  rowSpacing: 'space-y-1' | 'space-y-2';
  barColor: 'bg-gray-800' | 'bg-slate-800';
  siteLabelWidth: 'w-12';
}

export interface SharedTimelineChartProps {
  sites: SiteData[];
  years: (string | number)[];
  variant?: 'compact' | 'standard';
  className?: string;
  idPrefix?: string;
}

const VARIANTS: Record<'compact' | 'standard', TimelineChartVariant> = {
  compact: {
    barHeight: 'h-3',
    rowSpacing: 'space-y-1',
    barColor: 'bg-gray-800',
    siteLabelWidth: 'w-12'
  },
  standard: {
    barHeight: 'h-4',
    rowSpacing: 'space-y-2', 
    barColor: 'bg-slate-800',
    siteLabelWidth: 'w-12'
  }
};

export default function SharedTimelineChart({
  sites,
  years,
  variant = 'standard',
  className = '',
  idPrefix = 'timeline-chart'
}: SharedTimelineChartProps) {
  const styles = VARIANTS[variant];

  return (
    <div id={`${idPrefix}-container`} className={className}>
      {/* Year Labels */}
      <div id={`${idPrefix}-year-labels-container`} className="flex items-center mb-2">
        <div className={`${styles.siteLabelWidth} shrink-0`}>
          {/* Spacer to align with site labels below */}
        </div>
        <div 
          id={`${idPrefix}-year-labels`}
          className="flex-1 flex justify-between text-xs text-gray-500"
        >
          {years.map((year, index) => (
            <span
              id={`${idPrefix}-year-label-${year}`}
              key={`${year}-${index}`}
            >
              {year}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline Rows */}
      <div id={`${idPrefix}-rows`} className={styles.rowSpacing}>
        {sites.map((site) => (
          <div
            id={`${idPrefix}-row-${site.id}`}
            key={site.id}
            className="flex items-center"
          >
            {/* Site Label */}
            <div
              id={`${idPrefix}-site-label-${site.id}`}
              className={`${styles.siteLabelWidth} text-xs text-gray-600 font-medium`}
            >
              {site.name}
            </div>

            {/* Timeline Bar Container */}
            <div
              id={`${idPrefix}-bar-container-${site.id}`}
              className={`flex-1 relative ${styles.barHeight} bg-gray-100 rounded-sm`}
            >
              {/* Data Period Bars */}
              {site.dataPeriods.map((period, index) => (
                <div
                  id={`${idPrefix}-data-period-${site.id}-${index}`}
                  key={index}
                  className={`absolute top-0 h-full ${styles.barColor} rounded-sm`}
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
  );
} 