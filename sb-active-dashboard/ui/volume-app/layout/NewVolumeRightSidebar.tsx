import React, { useState, useEffect } from "react";
import TrendsHeader from "../components/right-sidebar/TrendsHeader";
import MilesOfStreetByTrafficLevelBarChart from "../components/right-sidebar/MilesOfStreetByTrafficLevelBarChart";
import CompletenessMetrics from "../components/right-sidebar/CompletenessMetrics";
import LowDataCoverage from "../components/right-sidebar/LowDataCoverage";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";
import HighestVolume from "../components/right-sidebar/HighestVolume";
import Placeholder from "../components/right-sidebar/Placeholder";
import AggregatedVolumeBreakdown from "../components/right-sidebar/AggregatedVolumeBreakdown";
import YearToYearVolumeComparison from "../components/right-sidebar/YearToYearVolumeComparison";
import TimelineSparkline from "../components/right-sidebar/TimelineSparkline";
import ModeBreakdown from "../components/right-sidebar/ModeBreakdown";
import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useSpatialQuery } from "../../../lib/hooks/useSpatialQuery";

interface NewVolumeRightSidebarProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
  mapView?: __esri.MapView;
  selectedGeometry?: Polygon | null;
}

export default function NewVolumeRightSidebar({ 
  activeTab,
  showBicyclist,
  showPedestrian,
  modelCountsBy,
  mapView,
  selectedGeometry
}: NewVolumeRightSidebarProps) {
  const horizontalMargins = "mx-4";

  // Get AADT layer from map view
  const [aadtLayer, setAadtLayer] = useState<FeatureLayer | null>(null);

  useEffect(() => {
    if (mapView) {
      // Find the AADT layer in the map
      const layer = mapView.map.layers.find(
        (layer) => layer.title === "AADT Count Sites"
      ) as FeatureLayer;
      setAadtLayer(layer || null);
    }
  }, [mapView]);

  // Use spatial query hook
  const { result: spatialResult, isLoading, error, areaDescription } = useSpatialQuery(
    aadtLayer,
    selectedGeometry
  );

  // Sample data for the timeline sparkline - this would come from your data source
  const timelineData = [
    {
      id: "site1",
      name: "Site 1",
      dataPeriods: [
        { start: 0, end: 35 },
        { start: 45, end: 55 },
        { start: 65, end: 85 },
        { start: 90, end: 95 }
      ]
    },
    {
      id: "site2", 
      name: "Site 2",
      dataPeriods: [
        { start: 10, end: 25 },
        { start: 40, end: 50 }
      ]
    },
    {
      id: "site3",
      name: "Site 3", 
      dataPeriods: [
        { start: 0, end: 45 },
        { start: 60, end: 100 }
      ]
    },
    {
      id: "site4",
      name: "Site 4",
      dataPeriods: [
        { start: 5, end: 95 }
      ]
    },
    {
      id: "site5",
      name: "Site 5",
      dataPeriods: [
        { start: 0, end: 15 },
        { start: 25, end: 35 },
        { start: 45, end: 55 },
        { start: 65, end: 75 },
        { start: 85, end: 95 }
      ]
    },
    {
      id: "site6",
      name: "Site 6",
      dataPeriods: []
    },
    {
      id: "site7", 
      name: "Site 7",
      dataPeriods: []
    }
  ];

  return (
    <div id="volume-trends-sidebar" className="w-[412px] bg-white border-l border-gray-200 overflow-y-auto no-scrollbar">
      <div className="py-4">
        <TrendsHeader activeTab={activeTab} horizontalMargins={horizontalMargins} />
        {selectedGeometry && (
          <div id="selection-indicator" className={`${horizontalMargins} mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg`}>
            <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Area</h4>
            {isLoading && (
              <p className="text-xs text-blue-700 mb-1">Loading area data...</p>
            )}
            {error && (
              <p className="text-xs text-red-600 mb-1">Error: {error}</p>
            )}
            {areaDescription && !isLoading && !error && (
              <p className="text-xs text-blue-700 mb-2">{areaDescription}</p>
            )}
            {spatialResult && spatialResult.totalCount > 0 && (
              <div className="text-xs text-blue-700 space-y-1">
                <div className="flex justify-between">
                  <span>Total AADT:</span>
                  <span className="font-medium">{spatialResult.totalAADT.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average AADT:</span>
                  <span className="font-medium">{spatialResult.averageAADT.toLocaleString()}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-blue-600 mt-2 italic">
              Click elsewhere to clear selection.
            </p>
          </div>
        )}
        
        
        <div className="w-full h-[1px] bg-gray-200 my-4"></div>
        {activeTab === 'modeled-data' && (
          <MilesOfStreetByTrafficLevelBarChart 
            dataType={activeTab} 
            horizontalMargins={horizontalMargins}
            mapView={mapView}
            showBicyclist={showBicyclist}
            showPedestrian={showPedestrian}
            modelCountsBy={modelCountsBy}
            year={2023}
            selectedGeometry={selectedGeometry}
          />
        )}
        {activeTab === 'raw-data' && (
          <>
            <div className={`space-y-4 ${horizontalMargins} my-4`}>
              <LowDataCoverage />
              <SummaryStatistics />
              <AggregatedVolumeBreakdown />
              <YearToYearVolumeComparison />
              <TimelineSparkline
                sites={timelineData}
                startYear={2022}
                endYear={2025}
                dateRange="Jan 1, 2022 - Dec 31, 2025"
                confidenceLevel="Medium confidence"
                contributingSites="5 out of 7 selected sites"
              />
              <HighestVolume />
              <ModeBreakdown />
            </div>
          </>
        )}
        {activeTab === 'data-completeness' && (
          <>
            <CompletenessMetrics horizontalMargins={horizontalMargins} />
          </>
        )}
      </div>
    </div>
  );
} 