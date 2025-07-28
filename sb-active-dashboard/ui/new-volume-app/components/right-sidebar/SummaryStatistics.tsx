import React, { useState } from "react";
import MoreInformationIconCostBenefitTool from "./MoreInformationIcon";
import CollapseExpandIcon from "./CollapseExpandIcon";

const StatsRow = ({ label, value, tooltip, idPrefix }: { label: string, value: string | number, tooltip?: boolean, idPrefix: string }) => (
    <div className="grid grid-cols-[1fr,auto] items-center gap-2" id={`${idPrefix}-row`}>
        <div className="flex items-center" id={`${idPrefix}-label-container`}>
            <p className="text-gray-600 whitespace-nowrap" id={`${idPrefix}-label`}>{label}</p>
            {tooltip && <MoreInformationIconCostBenefitTool />}
        </div>
        <p className="text-gray-800 font-medium justify-self-end" id={`${idPrefix}-value`}>{value}</p>
    </div>
);

export default function SummaryStatistics() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

  return (
    <div
      className="bg-white border border-gray-200 rounded-md p-4"
      id="summary-statistics-container"
    >
        <div id="summary-statistics-header" className={`transition-all duration-300 ease-in-out flex justify-between items-center ${!isCollapsed ? "mb-2" : ""}`}>
          <h3
            id="summary-statistics-title"
            className="text-lg font-medium text-gray-700"
          >
            Summary Statistics
          </h3>
          <CollapseExpandIcon id="summary-statistics-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
        </div>
      <div id="summary-statistics-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-y-hidden ${isCollapsed ? 'max-h-0' : 'max-h-96'}`}>
          <div id="summary-statistics-content" className="space-y-2 text-sm">
              <StatsRow idPrefix="sites-selected" label="Sites Selected" value={7} />

              <div id="weekday-section" className="space-y-2">
                <p id="weekday-label" className="font-medium text-gray-600">Weekday</p>
                <div id="weekday-stats" className="pl-4 space-y-2">
                    <StatsRow idPrefix="weekday-ped-aadt" label="Median Pedestrian AADT" value={102} tooltip />
                    <StatsRow idPrefix="weekday-bike-aadt" label="Median Bike AADT" value={56} tooltip />
                </div>
              </div>

              <div id="weekend-section" className="space-y-2">
                <p id="weekend-label" className="font-medium text-gray-600">Weekend</p>
                <div id="weekend-stats" className="pl-4 space-y-2">
                    <StatsRow idPrefix="weekend-ped-aadt" label="Median Pedestrian AADT" value={89} tooltip />
                    <StatsRow idPrefix="weekend-bike-aadt" label="Median Bike AADT" value={67} tooltip />
                </div>
              </div>
          </div>
      </div>
    </div>
  );
} 