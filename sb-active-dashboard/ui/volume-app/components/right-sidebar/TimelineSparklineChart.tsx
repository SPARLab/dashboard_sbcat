import React, { useEffect, useRef, useMemo } from "react";
import SharedTimelineChart, { type SiteData } from "./SharedTimelineChart";

interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface ConfidenceData {
  confidence: ConfidenceLevel;
  contributingSites: number;
  totalSites: number;
}

interface TimelineSparklineChartProps {
  sites: SiteData[];
  startDate: Date;
  endDate: Date;
  dateRange: string;
  isCollapsed: boolean;
  selectedSiteId?: string | null;
  onConfidenceUpdate: (data: ConfidenceData) => void;
  onSiteSelect?: (siteId: string | null) => void;
}

// Confidence level configurations
const CONFIDENCE_LEVELS: Record<'high' | 'medium' | 'low', ConfidenceLevel> = {
  high: {
    level: 'high',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: (
      <svg viewBox="0 0 16 16" className="w-full h-full text-green-500">
        <path
          fill="currentColor"
          d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
        />
      </svg>
    )
  },
  medium: {
    level: 'medium',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: (
      <svg viewBox="0 0 16 16" className="w-full h-full text-amber-500">
        <path
          fill="currentColor"
          d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
        />
      </svg>
    )
  },
  low: {
    level: 'low',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: (
      <svg viewBox="0 0 16 16" className="w-full h-full text-red-500">
        <path
          fill="currentColor"
          d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
        />
        <path
          fill="currentColor" 
          d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"
        />
      </svg>
    )
  }
};

// Calculate confidence level based on data contribution ratio
function calculateConfidence(sites: SiteData[]): ConfidenceData {
  const totalSites = sites.length;
  const contributingSites = sites.filter(site => site.dataPeriods.length > 0).length;
  const contributionRatio = totalSites > 0 ? contributingSites / totalSites : 0;
  
  let confidenceLevel: 'high' | 'medium' | 'low';
  
  if (contributionRatio >= 0.8) {
    confidenceLevel = 'high';
  } else if (contributionRatio >= 0.5) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }
  
  return {
    confidence: CONFIDENCE_LEVELS[confidenceLevel],
    contributingSites,
    totalSites
  };
}

export default function TimelineSparklineChart({
  sites,
  startDate,
  endDate,
  dateRange,
  isCollapsed,
  selectedSiteId,
  onConfidenceUpdate,
  onSiteSelect
}: TimelineSparklineChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Generate year labels from date range
  const years = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }

  // Use real data from props only - no test data fallback

  // Auto-scroll to selected site
  useEffect(() => {
    if (selectedSiteId && scrollContainerRef.current && !isCollapsed) {
      const selectedElement = document.getElementById(`timeline-sparkline-chart-row-${selectedSiteId}`);
      if (selectedElement) {
        const container = scrollContainerRef.current;
        const elementTop = selectedElement.offsetTop;
        const elementHeight = selectedElement.offsetHeight;
        const containerHeight = container.clientHeight;
        const scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [selectedSiteId, isCollapsed]);

  // Calculate confidence data, memoized to prevent unnecessary recalculations
  const confidenceData = useMemo(() => {
    return calculateConfidence(sites);
  }, [sites]);

  // Update parent component when confidence data changes
  useEffect(() => {
    onConfidenceUpdate(confidenceData);
  }, [confidenceData, onConfidenceUpdate]);

  // Handle case with no sites
  if (!sites || sites.length === 0) {
    return (
      <div
        id="timeline-sparkline-chart-no-data"
        className={`grid bg-white rounded-b-lg transition-[grid-template-rows] ease-in-out duration-500 ${
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div id="timeline-sparkline-chart-no-data-overflow-container" className="overflow-hidden">
          <div id="timeline-sparkline-chart-no-data-padding-container" className="px-4 pb-4">
            <div id="timeline-sparkline-chart-no-data-message-container" className="pt-4 mb-4 flex items-center justify-center min-h-60">
              <p id="timeline-sparkline-chart-no-data-message" className="text-sm font-medium text-gray-900 text-center">
                No count site data available for the selected region for the selected timeframe.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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

          {/* Scrollable Timeline Container */}
          <div 
            ref={scrollContainerRef}
            id="timeline-sparkline-chart-scrollable-container" 
            className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db transparent'
            }}
          >
            <SharedTimelineChart
              sites={sites}
              years={years}
              variant="compact"
              idPrefix="timeline-sparkline-chart"
              selectedSiteId={selectedSiteId}
              onSiteSelect={onSiteSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
