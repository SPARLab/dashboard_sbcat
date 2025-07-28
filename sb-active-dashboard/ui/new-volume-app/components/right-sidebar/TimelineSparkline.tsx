import React, { useState } from "react";
import TimelineSparklineHeader from "./TimelineSparklineHeader";
import TimelineSparklineChart from "./TimelineSparklineChart";
import { type SiteData } from "./SharedTimelineChart";

interface TimelineSparklineProps {
  sites: SiteData[];
  startYear: number;
  endYear: number;
  dateRange: string;
  confidenceLevel: string;
  contributingSites: string;
}

export default function TimelineSparkline({
  sites,
  startYear,
  endYear,
  dateRange,
  confidenceLevel,
  contributingSites
}: TimelineSparklineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div id="timeline-sparkline-container" className="border border-gray-200 rounded-lg overflow-hidden">
      <TimelineSparklineHeader
        confidenceLevel={confidenceLevel}
        contributingSites={contributingSites}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <TimelineSparklineChart
        sites={sites}
        startYear={startYear}
        endYear={endYear}
        dateRange={dateRange}
        isCollapsed={isCollapsed}
      />
    </div>
  );
} 