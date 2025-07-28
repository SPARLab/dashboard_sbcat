import React from "react";
import CollapseExpandIcon from "./CollapseExpandIcon";

interface TimelineSparklineHeaderProps {
  confidenceLevel: string;
  contributingSites: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function TimelineSparklineHeader({
  confidenceLevel,
  contributingSites,
  isCollapsed,
  onToggleCollapse
}: TimelineSparklineHeaderProps) {
  return (
    <div
      id="timeline-sparkline-header"
      className={`bg-gray-50 px-4 py-3 border-b transition-all ease-in-out duration-500 ${
        isCollapsed
          ? 'rounded-lg border-transparent'
          : 'rounded-t-lg border-gray-200'
      }`}
    >
      <div id="timeline-sparkline-header-content" className="flex items-start gap-2">
        <div id="timeline-sparkline-header-icon-container" className="flex-shrink-0 mt-0.5">
          <svg
            id="timeline-sparkline-header-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className="text-amber-500"
          >
            <path
              fill="currentColor"
              d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
            />
          </svg>
        </div>
        <div id="timeline-sparkline-header-text-container" className="flex-1">
          <p
            id="timeline-sparkline-header-text"
            className="text-sm text-gray-700 leading-tight"
          >
            {confidenceLevel} - {contributingSites} contributing data for given
            timeframe
          </p>
        </div>
        <CollapseExpandIcon
          id="timeline-sparkline-collapse-icon"
          isCollapsed={isCollapsed}
          onClick={onToggleCollapse}
        />
      </div>
    </div>
  );
} 