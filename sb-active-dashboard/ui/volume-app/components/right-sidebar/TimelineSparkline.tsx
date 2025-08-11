import React, { useState, useCallback } from "react";
import TimelineSparklineHeader from "./TimelineSparklineHeader";
import TimelineSparklineChart from "./TimelineSparklineChart";
import { type SiteData } from "./SharedTimelineChart";
import Polygon from "@arcgis/core/geometry/Polygon";
import SelectRegionPlaceholder from "../../../components/SelectRegionPlaceholder";

interface TimelineSparklineProps {
  sites: SiteData[];
  startDate: Date;
  endDate: Date;
  dateRange: string;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
  onConfidenceUpdate?: (data: ConfidenceData) => void;
  selectedGeometry?: Polygon | null;
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
  onSiteSelect,
  onConfidenceUpdate,
  selectedGeometry = null
}: TimelineSparklineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleConfidenceUpdate = useCallback((data: ConfidenceData) => {
    setConfidenceData(data);
    onConfidenceUpdate?.(data);
  }, [onConfidenceUpdate]);

  return (
    <div id="timeline-sparkline-container" className="border border-gray-200 rounded-lg overflow-hidden overflow-x-hidden">
      {confidenceData && (
        <TimelineSparklineHeader
          confidence={confidenceData.confidence}
          contributingSites={confidenceData.contributingSites}
          totalSites={confidenceData.totalSites}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      )}
      {!selectedGeometry ? (
        <div
          id="timeline-sparkline-no-selection-grid"
          className={`grid bg-white rounded-b-lg transition-[grid-template-rows] ease-in-out duration-500 ${
            isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div id="timeline-sparkline-no-selection-overflow" className="overflow-hidden">
            <div id="timeline-sparkline-no-selection-padding" className="px-4 pb-4">
              <SelectRegionPlaceholder id="timeline-sparkline-no-selection" subtext="Use the polygon tool or click on a boundary to see the timeline for that area" />
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
} 