import React, { useState, useCallback } from "react";
import TimelineSparklineHeader from "./TimelineSparklineHeader";
import TimelineSparklineChart from "./TimelineSparklineChart";
import { type SiteData } from "./SharedTimelineChart";

interface TimelineSparklineProps {
  sites: SiteData[];
  startDate: Date;
  endDate: Date;
  dateRange: string;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
}

interface ConfidenceData {
  confidence: {
    level: 'high' | 'medium' | 'low';
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
  };
  contributingSites: number;
  totalSites: number;
}

export default function TimelineSparkline({
  sites,
  startDate,
  endDate,
  dateRange,
  selectedSiteId,
  onSiteSelect
}: TimelineSparklineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleConfidenceUpdate = useCallback((data: ConfidenceData) => {
    setConfidenceData(data);
  }, []);

  return (
    <div id="timeline-sparkline-container" className="border border-gray-200 rounded-lg overflow-hidden">
      {confidenceData && (
        <TimelineSparklineHeader
          confidence={confidenceData.confidence}
          contributingSites={confidenceData.contributingSites}
          totalSites={confidenceData.totalSites}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      )}
      <TimelineSparklineChart
        sites={sites}
        startDate={startDate}
        endDate={endDate}
        dateRange={dateRange}
        isCollapsed={isCollapsed}
        selectedSiteId={selectedSiteId}
        onConfidenceUpdate={handleConfidenceUpdate}
        onSiteSelect={onSiteSelect}
      />
    </div>
  );
} 