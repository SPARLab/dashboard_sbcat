import React from "react";
import MoreInformationIconCostBenefitTool from "./MoreInformationIcon";

const StatsRow = ({ label, value, tooltip }: { label: string, value: string | number, tooltip?: boolean }) => (
    <div className="grid grid-cols-[1fr,auto] items-center gap-2">
        <div className="flex items-center">
            <p className="text-gray-600 whitespace-nowrap">{label}</p>
            {tooltip && <MoreInformationIconCostBenefitTool />}
        </div>
        <p className="text-gray-800 font-medium justify-self-end">{value}</p>
    </div>
);

export default function SummaryStatistics() {
  return (
    <div
      className="bg-white border border-gray-200 rounded-md p-4"
      id="summary-statistics-container"
    >
      <h3
        className="text-lg font-medium text-gray-700 mb-2"
        id="summary-statistics-title"
      >
        Summary Statistics
      </h3>
      <div className="space-y-2 text-sm" id="summary-statistics-content">
        <StatsRow label="Sites Selected" value={7} />

        <div className="space-y-2" id="weekday-section">
          <p className="font-medium text-gray-600" id="weekday-label">Weekday</p>
          <div className="pl-4 space-y-2" id="weekday-stats">
            <StatsRow label="Median Pedestrian AADT" value={102} tooltip />
            <StatsRow label="Median Bike AADT" value={56} tooltip />
          </div>
        </div>

        <div className="space-y-2" id="weekend-section">
          <p className="font-medium text-gray-600" id="weekend-label">Weekend</p>
          <div className="pl-4 space-y-2" id="weekend-stats">
            <StatsRow label="Median Pedestrian AADT" value={89} tooltip />
            <StatsRow label="Median Bike AADT" value={67} tooltip />
          </div>
        </div>
      </div>
    </div>
  );
} 