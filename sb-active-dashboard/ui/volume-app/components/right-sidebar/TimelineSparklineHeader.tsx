import React from "react";
import CollapseExpandIcon from "./CollapseExpandIcon";

interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface TimelineSparklineHeaderProps {
  confidence: ConfidenceLevel;
  contributingSites: number;
  totalSites: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function TimelineSparklineHeader({
  confidence,
  contributingSites,
  totalSites,
  isCollapsed,
  onToggleCollapse
}: TimelineSparklineHeaderProps) {
  return (
    <div
      id="timeline-sparkline-header"
      className={`${confidence.bgColor} ${confidence.borderColor} px-4 py-3 border-b transition-all ease-in-out duration-500 ${
        isCollapsed
          ? 'rounded-lg border-transparent'
          : 'rounded-t-lg'
      }`}
    >
      <div id="timeline-sparkline-header-content" className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div id="timeline-sparkline-header-icon-container" className="w-4 h-4 flex-shrink-0">
            {confidence.icon}
          </div>
          <p
            id="timeline-sparkline-header-text"
            className={`text-xs ${confidence.color} leading-tight`}
          >
            {confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)} confidence - {contributingSites} out of {totalSites} selected sites contributing data for given timeframe
          </p>
        </div>
        <div className="flex-shrink-0">
          <CollapseExpandIcon
            id="timeline-sparkline-collapse-icon"
            isCollapsed={isCollapsed}
            onClick={onToggleCollapse}
          />
        </div>
      </div>
    </div>
  );
} 