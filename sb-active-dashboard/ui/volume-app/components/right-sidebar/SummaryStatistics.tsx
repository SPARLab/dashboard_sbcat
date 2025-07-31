import React, { useState } from "react";
import MoreInformationIconCostBenefitTool from "./MoreInformationIcon";
import CollapseExpandIcon from "./CollapseExpandIcon";

interface SpatialQueryResult {
  totalCount: number;
  medianPedestrianWeekdayAADT?: number;
  medianPedestrianWeekendAADT?: number;
  medianBikeWeekdayAADT?: number;
  medianBikeWeekendAADT?: number;
}

interface SummaryStatisticsProps {
  spatialResult?: SpatialQueryResult | null;
  isLoading?: boolean;
}

// Set default props to ensure backward compatibility
const defaultProps: SummaryStatisticsProps = {
  spatialResult: null,
  isLoading: false,
};

const StatsRow = ({ label, value, tooltip, idPrefix }: { label: string, value: string | number, tooltip?: boolean, idPrefix: string }) => (
    <div className="grid grid-cols-[1fr,auto] items-center gap-2" id={`${idPrefix}-row`}>
        <div className="flex items-center" id={`${idPrefix}-label-container`}>
            <p className="text-gray-600 whitespace-nowrap" id={`${idPrefix}-label`}>{label}</p>
            {tooltip && <MoreInformationIconCostBenefitTool />}
        </div>
        <p className="text-gray-800 font-medium justify-self-end" id={`${idPrefix}-value`}>{value}</p>
    </div>
);

export default function SummaryStatistics({ 
  spatialResult = null, 
  isLoading = false 
}: SummaryStatisticsProps = defaultProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Extract values from spatial result with defaults
    const sitesSelected = spatialResult?.totalCount || 0;
    const pedWeekdayAADT = spatialResult?.medianPedestrianWeekdayAADT || 0;
    const pedWeekendAADT = spatialResult?.medianPedestrianWeekendAADT || 0;
    const bikeWeekdayAADT = spatialResult?.medianBikeWeekdayAADT || 0;
    const bikeWeekendAADT = spatialResult?.medianBikeWeekendAADT || 0;

    // Format values for display
    const formatValue = (value: number) => {
        if (isLoading) return "Loading...";
        if (value === 0) return "No data";
        return Math.round(value).toLocaleString();
    };

    // Debug: Log when we have actual data
    if (spatialResult) {
        console.log('📊 SummaryStatistics has data:', {
            sitesSelected,
            pedWeekdayAADT,
            pedWeekendAADT,
            bikeWeekdayAADT,
            bikeWeekendAADT
        });
    }

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
              <StatsRow 
                idPrefix="sites-selected" 
                label="Sites Selected" 
                value={isLoading ? "Loading..." : (sitesSelected || "Click a region")} 
              />

              <div id="weekday-section" className="space-y-2">
                <p id="weekday-label" className="font-medium text-gray-600">Weekday</p>
                <div id="weekday-stats" className="pl-4 space-y-2">
                    <StatsRow 
                      idPrefix="weekday-ped-aadt" 
                      label="Median Pedestrian AADT" 
                      value={spatialResult ? formatValue(pedWeekdayAADT) : "Select area"} 
                      tooltip 
                    />
                    <StatsRow 
                      idPrefix="weekday-bike-aadt" 
                      label="Median Bike AADT" 
                      value={spatialResult ? formatValue(bikeWeekdayAADT) : "Select area"} 
                      tooltip 
                    />
                </div>
              </div>

              <div id="weekend-section" className="space-y-2">
                <p id="weekend-label" className="font-medium text-gray-600">Weekend</p>
                <div id="weekend-stats" className="pl-4 space-y-2">
                    <StatsRow 
                      idPrefix="weekend-ped-aadt" 
                      label="Median Pedestrian AADT" 
                      value={spatialResult ? formatValue(pedWeekendAADT) : "Select area"} 
                      tooltip 
                    />
                    <StatsRow 
                      idPrefix="weekend-bike-aadt" 
                      label="Median Bike AADT" 
                      value={spatialResult ? formatValue(bikeWeekendAADT) : "Select area"} 
                      tooltip 
                    />
                </div>
              </div>
          </div>
      </div>
    </div>
  );
} 