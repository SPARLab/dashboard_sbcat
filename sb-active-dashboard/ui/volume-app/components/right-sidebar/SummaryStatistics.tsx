import React, { useState } from "react";
import InfoTooltipIcon from "./MoreInformationIcon";
import CollapseExpandIcon from "./CollapseExpandIcon";
import Polygon from "@arcgis/core/geometry/Polygon";
import SelectRegionPlaceholder from "../../../components/SelectRegionPlaceholder";

interface EnhancedAADVSummaryResult {
  totalCount: number;
  medianPedestrianWeekdayAADV?: number;
  medianPedestrianWeekendAADV?: number;
  medianBikeWeekdayAADV?: number;
  medianBikeWeekendAADV?: number;
}

interface SummaryStatisticsProps {
  spatialResult?: EnhancedAADVSummaryResult | null;
  isLoading?: boolean;
  selectedGeometry?: Polygon | null;
  dateRange: { startDate: Date; endDate: Date };
  showBicyclist?: boolean;
  showPedestrian?: boolean;
}

const StatsRow = ({ label, value, tooltipText, idPrefix }: { label: string, value: string | number, tooltipText?: string, idPrefix: string }) => (
    <div className="grid grid-cols-[1fr,auto] items-center gap-2" id={`${idPrefix}-row`}>
        <div className="flex items-center" id={`${idPrefix}-label-container`}>
            <p className="text-gray-600 whitespace-nowrap mr-0.5" id={`${idPrefix}-label`}>{label}</p>
            {tooltipText && <InfoTooltipIcon text={tooltipText} yOffset="0.3rem" />}
        </div>
        <p className="text-gray-800 font-medium justify-self-end" id={`${idPrefix}-value`}>{value}</p>
    </div>
);

export default function SummaryStatistics({ 
  spatialResult = null, 
  isLoading = false,
  selectedGeometry = null,
  dateRange,
  showBicyclist = true,
  showPedestrian = true,
}: SummaryStatisticsProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Extract values from spatial result with defaults
    const sitesSelected = spatialResult?.totalCount || 0;
    const pedWeekdayAADV = spatialResult?.medianPedestrianWeekdayAADV || 0;
    const pedWeekendAADV = spatialResult?.medianPedestrianWeekendAADV || 0;
    const bikeWeekdayAADV = spatialResult?.medianBikeWeekdayAADV || 0;
    const bikeWeekendAADV = spatialResult?.medianBikeWeekendAADV || 0;

    // Format values for display
    const formatValue = (value: number) => {
        if (isLoading) return "Loading...";
        if (value === 0) return "No data";
        return Math.round(value).toLocaleString();
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
      <div id="summary-statistics-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-y-hidden ${isCollapsed ? 'max-h-0' : 'max-h-100'}`}>
          {!selectedGeometry && (
            <SelectRegionPlaceholder id="summary-statistics-no-selection" subtext="Use the polygon tool or click on a boundary to see statistics for that area" />
          )}
          {selectedGeometry && (
            <>

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
                          idPrefix="weekday-ped-aadv" 
                          label="Median Pedestrian AADV" 
                          value={spatialResult ? formatValue(pedWeekdayAADV) : "Select area"} 
                          tooltipText="Typical number of pedestrians within the selected area per day on a weekday"
                        />
                        <StatsRow 
                          idPrefix="weekday-bike-aadv" 
                          label="Median Bike AADV" 
                          value={spatialResult ? formatValue(bikeWeekdayAADV) : "Select area"} 
                          tooltipText="Typical number of cyclists within the selected area per day on a weekday"
                        />
                    </div>
                  </div>

                  <div id="weekend-section" className="space-y-2">
                    <p id="weekend-label" className="font-medium text-gray-600">Weekend</p>
                    <div id="weekend-stats" className="pl-4 space-y-2">
                        <StatsRow 
                          idPrefix="weekend-ped-aadv" 
                          label="Median Pedestrian AADV" 
                          value={spatialResult ? formatValue(pedWeekendAADV) : "Select area"} 
                          tooltipText="Typical number of pedestrians within the selected area per day on weekends"
                        />
                        <StatsRow 
                          idPrefix="weekend-bike-aadv" 
                          label="Median Bike AADV" 
                          value={spatialResult ? formatValue(bikeWeekendAADV) : "Select area"} 
                          tooltipText="Typical number of cyclists within the selected area per day on weekends"
                        />
                    </div>
                  </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
} 