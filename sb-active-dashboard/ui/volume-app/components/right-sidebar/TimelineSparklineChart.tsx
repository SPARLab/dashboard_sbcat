import React, { useEffect, useRef } from "react";
import SharedTimelineChart, { type SiteData } from "./SharedTimelineChart";

interface TimelineSparklineChartProps {
  sites: SiteData[];
  startYear: number;
  endYear: number;
  dateRange: string;
  isCollapsed: boolean;
  selectedSiteId?: string;
}

export default function TimelineSparklineChart({
  sites,
  startYear,
  endYear,
  dateRange,
  isCollapsed,
  selectedSiteId
}: TimelineSparklineChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Generate year labels
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }

  // TODO: Remove this test data generation once real data integration is complete
  // Generate additional test sites for scrolling demonstration (if less than 15 sites provided)
  const testSites = sites.length < 15 ? [
    // Ensure existing sites have proper naming for demo
    ...sites.map((site, i) => ({
      ...site,
      name: `Site ${i + 1}`
    })),
    // Add additional test sites
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `test-site-${i + sites.length + 1}`,
      name: `Site ${i + sites.length + 1}`,
      dataPeriods: [
        { start: Math.random() * 30, end: Math.random() * 20 + 40 },
        { start: Math.random() * 20 + 60, end: Math.random() * 15 + 80 }
      ]
    }))
  ] : sites;

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
            <p
              id="timeline-sparkline-chart-site-count"
              className="text-xs text-gray-400 text-center mt-1"
            >
              {testSites.length} sites
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
              sites={testSites}
              years={years}
              variant="compact"
              idPrefix="timeline-sparkline-chart"
              selectedSiteId={selectedSiteId || (testSites.length > 5 ? testSites[5].id : undefined)} // Demo: select 6th site for demonstration
            />
          </div>
        </div>
      </div>
    </div>
  );
} 