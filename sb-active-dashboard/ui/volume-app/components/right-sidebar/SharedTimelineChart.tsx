import React from "react";

// No custom CSS needed anymore - arrow removed for cleaner design

export interface DataPeriod {
  start: number; // percentage from start of timeline
  end: number;   // percentage from start of timeline
}

export interface SiteData {
  id: string;
  name: string;
  label: string;
  dataPeriods: DataPeriod[];
}

export interface TimelineChartVariant {
  barHeight: 'h-3' | 'h-4';
  rowSpacing: 'space-y-1' | 'space-y-2';
  barColor: 'bg-gray-800' | 'bg-slate-800';
  siteLabelWidth: 'w-16' | 'w-20';
}

export interface SharedTimelineChartProps {
  sites: SiteData[];
  years: (string | number)[];
  variant?: 'compact' | 'standard';
  className?: string;
  idPrefix?: string;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
}

const VARIANTS: Record<'compact' | 'standard', TimelineChartVariant> = {
  compact: {
    barHeight: 'h-3',
    rowSpacing: 'space-y-1',
    barColor: 'bg-gray-800',
    siteLabelWidth: 'w-16'
  },
  standard: {
    barHeight: 'h-4',
    rowSpacing: 'space-y-2', 
    barColor: 'bg-slate-800',
    siteLabelWidth: 'w-20'
  }
};

export default function SharedTimelineChart({
  sites,
  years,
  variant = 'standard',
  className = '',
  idPrefix = 'timeline-chart',
  selectedSiteId,
  onSiteSelect
}: SharedTimelineChartProps) {
  const styles = VARIANTS[variant];

  return (
    <>
      <div 
        id={`${idPrefix}-container`} 
        className={`w-full ${className}`}
      >
      {/* Year Labels */}
      <div id={`${idPrefix}-year-labels-container`} className="flex items-center mb-2">
        <div className={`${styles.siteLabelWidth} shrink-0`}>
          {/* Spacer to align with site labels below */}
        </div>
        <div 
          id={`${idPrefix}-year-labels`}
          className="flex-1 flex justify-between text-xs text-gray-500 min-w-0"
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
      <div id={`${idPrefix}-rows`} className={`${styles.rowSpacing} w-full`}>
        {sites.map((site) => {
          const isSelected = selectedSiteId === site.name;
          return (
            <div
              id={`${idPrefix}-row-${site.id}`}
              key={site.id}
              className={`group relative flex items-center transition-colors duration-200 rounded-sm px-1 py-0.5 cursor-pointer ${
                isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'
              }`}
              onClick={() => onSiteSelect?.(isSelected ? null : site.name)}
            >
              {/* Site Label */}
              <div
                id={`${idPrefix}-site-label-${site.id}`}
                className={`${styles.siteLabelWidth} text-xs font-medium truncate ${
                  isSelected ? 'text-blue-800' : 'text-gray-600'
                }`}
              >
                {site.label}
              </div>
              
              {/* Custom fast tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-100 border border-gray-300 text-gray-900 text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 ease-in-out z-50 shadow-sm">
                {site.name}
              </div>

              {/* Timeline Bar Container */}
              <div
                id={`${idPrefix}-bar-container-${site.id}`}
                className={`flex-1 relative ${styles.barHeight} rounded-sm ml-2 ${
                  isSelected ? 'bg-blue-50' : 'bg-gray-100'
                }`}
              >
                {/* Data Period Bars */}
                {site.dataPeriods.map((period, index) => (
                  <div
                    id={`${idPrefix}-data-period-${site.id}-${index}`}
                    key={index}
                    className={`absolute top-0 h-full rounded-sm ${
                      isSelected ? 'bg-blue-600' : styles.barColor
                    }`}
                    style={{
                      left: `${period.start}%`,
                      width: `${period.end - period.start}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
} 