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
  customMessage?: string;
}

export default function TimelineSparklineHeader({
  confidence,
  contributingSites,
  totalSites,
  isCollapsed,
  onToggleCollapse,
  customMessage
}: TimelineSparklineHeaderProps) {
  // Use custom message if provided, otherwise handle normal confidence display
  const hasCustomMessage = customMessage !== undefined;
  
  const displayBgColor = confidence.bgColor;
  const displayBorderColor = confidence.borderColor;
  const displayTextColor = confidence.color;
  const displayIcon = confidence.icon;
  
  const displayText = hasCustomMessage 
    ? customMessage
    : `${confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)} confidence - ${contributingSites} out of ${totalSites} selected sites contributing data for given timeframe`;

  return (
    <div
      id="timeline-sparkline-header"
      className={`${displayBgColor} ${displayBorderColor} px-4 py-3 border-b transition-all ease-in-out duration-500 ${
        isCollapsed
          ? 'rounded-lg border-transparent'
          : 'rounded-t-lg'
      }`}
    >
      <div id="timeline-sparkline-header-content" className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div id="timeline-sparkline-header-icon-container" className="w-4 h-4 flex-shrink-0">
            {displayIcon}
          </div>
          <p
            id="timeline-sparkline-header-text"
            className={`text-xs ${displayTextColor} leading-tight`}
          >
            {displayText}
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