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
  // Handle case with no data - show "Please select data" instead of confidence
  const isNoData = totalSites === 0;
  
  const displayBgColor = isNoData ? 'bg-gray-50' : confidence.bgColor;
  const displayBorderColor = isNoData ? 'border-gray-200' : confidence.borderColor;
  const displayTextColor = isNoData ? 'text-gray-700' : confidence.color;
  
  const displayIcon = isNoData ? (
    <svg viewBox="0 0 16 16" className="w-full h-full text-gray-500">
      <path
        fill="currentColor"
        d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
      />
    </svg>
  ) : confidence.icon;
  
  const displayText = isNoData 
    ? 'Please select data'
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