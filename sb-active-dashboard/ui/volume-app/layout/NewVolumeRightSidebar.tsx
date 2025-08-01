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
import { useSpatialQuery, useVolumeSpatialQuery } from "../../../lib/hooks/useSpatialQuery";
import { VolumeChartDataService } from "../../../lib/data-services/VolumeChartDataService";

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface NewVolumeRightSidebarProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
  mapView?: __esri.MapView | null;
  selectedGeometry?: Polygon | null;
  dateRange: DateRangeValue;
  selectedCountSite?: string | null;
  onCountSiteSelect?: (siteId: string | null) => void;
}

export default function NewVolumeRightSidebar({ 
  activeTab,
  showBicyclist,
  showPedestrian,
  modelCountsBy,
  mapView,
  selectedGeometry,
  dateRange,
  selectedCountSite,
  onCountSiteSelect
}: NewVolumeRightSidebarProps) {
  const horizontalMargins = "mx-4";

  // Initialize layers
  const [sitesLayer] = useState(() => new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0",
    title: "Count Sites"
  }));
  const [countsLayer] = useState(() => new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1",
    title: "Counts"
  }));
  const [aadtTable] = useState(() => new FeatureLayer({
    url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/2",
    title: "AADT Table"
  }));
  const [aadtLayer, setAadtLayer] = useState<FeatureLayer | null>(null);

  // Find the AADT layer from the map once the map is loaded
  useEffect(() => {
    if (!mapView) return;

    // Check if layer is already there
    const existingLayer = mapView.map.allLayers.find(l => l.title === "AADT Count Sites") as FeatureLayer;
    if (existingLayer) {
      console.log('✅ AADT layer found immediately');
      setAadtLayer(existingLayer);
      return;
    }

    // If not, listen for layer changes
    console.log('... AADT layer not found, listening for changes...');
    const handle = mapView.map.allLayers.on("change", (event) => {
        const addedLayer = event.added.find((l: any) => l.title === "AADT Count Sites");
        if (addedLayer) {
            console.log('✅ AADT layer found after change event');
            setAadtLayer(addedLayer as FeatureLayer);
            handle.remove();
        }
    });

    return () => handle.remove();

  }, [mapView]);

  // Use spatial query hooks
  const { result: spatialResult, isLoading, error, areaDescription } = useSpatialQuery(
    aadtLayer,
    selectedGeometry || null
  );

  // Use volume-specific spatial query for summary statistics
  const { result: volumeResult, isLoading: volumeLoading, error: volumeError } = useVolumeSpatialQuery(
    sitesLayer,
    aadtTable,
    selectedGeometry || null
  );

  // State for timeline data
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Fetch timeline data when selectedGeometry, dateRange, or filters change
  useEffect(() => {
    console.log('🔄 Timeline useEffect triggered:', {
      hasMapView: !!mapView,
      hasSelectedGeometry: !!selectedGeometry,
      hasSitesLayer: !!sitesLayer,
      hasAadtTable: !!aadtTable,
      hasAadtLayer: !!aadtLayer,
      dateRange,
      showBicyclist,
      showPedestrian
    });

    if (!mapView || !selectedGeometry || !sitesLayer || !aadtTable || !aadtLayer) {
      console.log('❌ Missing required dependencies, clearing timeline data');
      setTimelineData([]);
      return;
    }

    const fetchTimelineData = async () => {
      console.log('📡 Fetching timeline data for selected geometry...');
      setTimelineLoading(true);
      try {
        const volumeService = new VolumeChartDataService(sitesLayer, countsLayer, aadtLayer!);
        const filters = {
          showBicyclist,
          showPedestrian,
        };
        const timeSpan = {
          start: dateRange.startDate,
          end: dateRange.endDate
        };
        
        const result = await volumeService.getTimelineSparklineData(
          mapView,
          filters,
          timeSpan,
          selectedGeometry
        );
        
        console.log('✅ Timeline data received:', result);
        setTimelineData(result.sites || []);
      } catch (error) {
        console.error('❌ Error fetching timeline data:', error);
        setTimelineData([]);
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchTimelineData();
  }, [mapView, selectedGeometry, sitesLayer, aadtTable, aadtLayer, dateRange, showBicyclist, showPedestrian]);



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
            mapView={mapView || undefined}
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
              <SummaryStatistics 
                spatialResult={volumeResult || null} 
                isLoading={volumeLoading} 
              />
              <AggregatedVolumeBreakdown 
                selectedGeometry={selectedGeometry}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
              />
              <YearToYearVolumeComparison 
                selectedGeometry={selectedGeometry}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
              />
              <TimelineSparkline
                sites={timelineData}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                dateRange={`${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`}
                selectedSiteId={selectedCountSite}
                onSiteSelect={onCountSiteSelect}
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