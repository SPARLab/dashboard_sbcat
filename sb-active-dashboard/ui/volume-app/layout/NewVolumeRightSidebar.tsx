import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import React, { useCallback, useEffect, useState } from "react";
import { VolumeChartDataService } from "../../../lib/data-services/VolumeChartDataService";
import { useSpatialQuery, useVolumeSpatialQuery } from "../../../lib/hooks/useSpatialQuery";
import AggregatedVolumeBreakdown from "../components/right-sidebar/AggregatedVolumeBreakdown";
import CompletenessMetrics from "../components/right-sidebar/CompletenessMetrics";
import HighestVolume from "../components/right-sidebar/HighestVolume";
import LowDataCoverage from "../components/right-sidebar/LowDataCoverage";
import PercentOfNetworkByVolumeLevelBarChart from "../components/right-sidebar/PercentOfNetworkByVolumeLevelBarChart";
import ModeBreakdown from "../components/right-sidebar/ModeBreakdown";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";
import TimelineSparkline from "../components/right-sidebar/TimelineSparkline";
import TrendsHeader from "../components/right-sidebar/TrendsHeader";
import YearToYearVolumeComparison from "../components/right-sidebar/YearToYearVolumeComparison";

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface ConfidenceData {
  confidence: ConfidenceLevel;
  contributingSites: number;
  totalSites: number;
}

interface NewVolumeRightSidebarProps {
  activeTab: string;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string;
  mapView?: __esri.MapView | null;
  aadtLayer?: FeatureLayer | null;
  selectedGeometry?: Polygon | null;
  selectedAreaName?: string | null;
  dateRange: DateRangeValue;
  selectedCountSite?: string | null;
  onCountSiteSelect?: (siteId: string | null) => void;
  selectedYear: number;
}

export default function NewVolumeRightSidebar({ 
  activeTab,
  showBicyclist,
  showPedestrian,
  modelCountsBy,
  mapView,
  aadtLayer: aadtLayerProp,
  selectedGeometry,
  selectedAreaName,
  dateRange,
  selectedCountSite,
  onCountSiteSelect,
  selectedYear
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

  // Prefer the passed-in layer; fall back to searching the map
  useEffect(() => {
    if (aadtLayerProp) {
      setAadtLayer(aadtLayerProp);
      return;
    }
    if (!mapView || !mapView.map) return;
    const existingLayer = mapView.map.allLayers.find(l => l.title === "AADT Count Sites") as FeatureLayer;
    if (existingLayer) {
      setAadtLayer(existingLayer);
      return;
    }
    const handle = mapView.map.allLayers.on("change", (event) => {
      const addedLayer = event.added.find((l: __esri.Layer) => l.title === "AADT Count Sites");
      if (addedLayer) {
        setAadtLayer(addedLayer as FeatureLayer);
        handle.remove();
      }
    });
    return () => handle.remove();
  }, [aadtLayerProp, mapView]);

  // Compute contributing site IDs and apply renderer to AADT layer
  useEffect(() => {
    const applyStyling = async () => {
      if (!aadtLayer) return;

      // If no geometry selected, reset to hollow gray
      if (!selectedGeometry) {
        const hollowSymbol = new SimpleMarkerSymbol({
          size: 8,
          color: [0, 0, 0, 0],
          outline: { width: 1.5, color: [128, 128, 128, 1] },
        });
        aadtLayer.renderer = new SimpleRenderer({ symbol: hollowSymbol });
        return;
      }

      // If both toggles off, style all as hollow
      if (!showBicyclist && !showPedestrian) {
        const hollowSymbol = new SimpleMarkerSymbol({
          size: 8,
          color: [0, 0, 0, 0],
          outline: { width: 1.5, color: [128, 128, 128, 1] },
        });
        aadtLayer.renderer = new SimpleRenderer({ symbol: hollowSymbol });
        return;
      }

      try {
        // 1) Query sites intersecting geometry
        const sitesQuery = sitesLayer.createQuery();
        sitesQuery.geometry = selectedGeometry;
        sitesQuery.spatialRelationship = "intersects" as const;
        sitesQuery.returnGeometry = false;
        sitesQuery.outFields = ["id"]; // site id field
        const sitesResult = await sitesLayer.queryFeatures(sitesQuery as __esri.QueryProperties);
        const siteIds: number[] = sitesResult.features.map(f => Number(f.attributes.id)).filter((v) => Number.isFinite(v));

        if (siteIds.length === 0) {
          const hollowSymbol = new SimpleMarkerSymbol({
            size: 8,
            color: [0, 0, 0, 0],
            outline: { width: 1.5, color: [128, 128, 128, 1] },
          });
          aadtLayer.renderer = new SimpleRenderer({ symbol: hollowSymbol });
          return;
        }

        // 2) Query counts for those sites within the date range and count_type filters; group by site_id
        const start = dateRange.startDate.toISOString().split('T')[0];
        const end = dateRange.endDate.toISOString().split('T')[0];
        const typeClauses: string[] = [];
        if (showBicyclist) typeClauses.push("'bike'");
        if (showPedestrian) typeClauses.push("'ped'");
        const countTypeWhere = typeClauses.length ? ` AND count_type IN (${typeClauses.join(',')})` : '';

        const countsQuery = countsLayer.createQuery();
        countsQuery.where = `site_id IN (${siteIds.join(',')}) AND timestamp >= DATE '${start}' AND timestamp <= DATE '${end}'${countTypeWhere}`;
        countsQuery.returnGeometry = false;
        countsQuery.outFields = ["site_id"]; // needed for groupBy
        countsQuery.groupByFieldsForStatistics = ["site_id"];
        countsQuery.outStatistics = [{
          statisticType: "count",
          onStatisticField: "site_id",
          outStatisticFieldName: "site_count",
        } as __esri.StatisticDefinition];

        const countsResult = await countsLayer.queryFeatures(countsQuery as __esri.QueryProperties);
        const contributingIds = countsResult.features.map(f => Number(f.attributes.site_id)).filter(v => Number.isFinite(v));

        // 3) Apply renderer: contributing -> solid blue; others -> hollow gray
        if (contributingIds.length === 0) {
          const hollowSymbol = new SimpleMarkerSymbol({
            size: 8,
            color: [0, 0, 0, 0],
            outline: { width: 1.5, color: [128, 128, 128, 1] },
          });
          aadtLayer.renderer = new SimpleRenderer({ symbol: hollowSymbol });
          return;
        }

        const arrayLiteral = `[${contributingIds.join(',')}]`;
        const valueExpression = `IIF(IndexOf(${arrayLiteral}, Number($feature.id)) > -1, 1, 0)`;
        const filledBlue = new SimpleMarkerSymbol({
          size: 8,
          color: [0, 102, 255, 0.95],
          outline: { width: 1, color: [255, 255, 255, 1] },
        });
        const hollowGray = new SimpleMarkerSymbol({
          size: 8,
          color: [0, 0, 0, 0],
          outline: { width: 1.5, color: [128, 128, 128, 1] },
        });

        const uvRenderer = new UniqueValueRenderer({
          valueExpression,
          uniqueValueInfos: [
            { value: 1, symbol: filledBlue },
          ],
          defaultSymbol: hollowGray,
        });

        aadtLayer.renderer = uvRenderer;
      } catch (err) {
        console.error('[RightSidebar] Failed to compute/apply site highlighting:', err);
      }
    };

    applyStyling();
  }, [aadtLayer, selectedGeometry, dateRange.startDate, dateRange.endDate, showBicyclist, showPedestrian, sitesLayer, countsLayer]);

  // (moved below state declarations)

  // Use spatial query hooks (keeping for future use)
  useSpatialQuery(
    aadtLayer,
    selectedGeometry || null
  );

  // Use volume-specific spatial query for summary statistics
  const { result: volumeResult, isLoading: volumeLoading } = useVolumeSpatialQuery(
    sitesLayer,
    aadtTable,
    selectedGeometry || null
  );

  // State for timeline data
  const [timelineData, setTimelineData] = useState<Array<{
    id: string;
    name: string;
    label: string;
    dataPeriods: Array<{ start: number; end: number }>;
  }>>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // State for confidence data from timeline sparkline
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);

  // Callback to handle confidence updates from timeline sparkline
  const handleConfidenceUpdate = useCallback((data: ConfidenceData) => {
    setConfidenceData(data);
  }, []);

  // Reset confidence data when no geometry is selected
  useEffect(() => {
    if (!selectedGeometry) {
      setConfidenceData(null);
    }
  }, [selectedGeometry]);

  // Create volume chart data service instance
  const [volumeChartDataService, setVolumeChartDataService] = useState<VolumeChartDataService | null>(null);

  // Initialize volume chart data service when layers are ready
  useEffect(() => {
    if (sitesLayer && countsLayer && aadtTable) {
      setVolumeChartDataService(new VolumeChartDataService(sitesLayer, countsLayer, aadtTable));
    }
  }, [sitesLayer, countsLayer, aadtTable]);

  // Fetch timeline data when selectedGeometry, dateRange, or filters change
  useEffect(() => {
    if (!mapView || !selectedGeometry || !sitesLayer || !aadtTable) {
      setTimelineData([]);
      return;
    }

    const fetchTimelineData = async () => {
      setTimelineLoading(true);
      try {
        const volumeService = new VolumeChartDataService(sitesLayer, countsLayer, aadtTable);
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
        
        setTimelineData((result.sites || []).map(site => ({
          ...site,
          label: site.name // Add missing label property
        })));
      } catch (error) {
        console.error('❌ Error fetching timeline data:', error);
        setTimelineData([]);
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchTimelineData();
  }, [mapView, selectedGeometry, sitesLayer, countsLayer, aadtTable, dateRange, showBicyclist, showPedestrian]);



  return (
    <div id="volume-trends-sidebar" className="w-[412px] bg-white border-l border-gray-200 overflow-y-auto no-scrollbar">
      <div className="py-4">
        <TrendsHeader activeTab={activeTab} horizontalMargins={horizontalMargins} />
        {selectedGeometry && (activeTab === 'raw-data' || activeTab === 'modeled-data') && (
          <div id="selection-indicator" className={`${horizontalMargins} mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg`}>
            {selectedAreaName ? (
              <p className="text-sm text-blue-700 font-medium">{selectedAreaName}</p>
            ) : (
              <p className="text-xs text-blue-700">Custom selected area</p>
            )}
            {/* <p className="text-xs text-blue-600 mt-2 italic">
              Click elsewhere to clear selection.
            </p> */}
          </div>
        )}
        
        
        <div className="w-full h-[1px] bg-gray-200 my-4"></div>
        {activeTab === 'modeled-data' && (
                          <PercentOfNetworkByVolumeLevelBarChart 
            dataType={activeTab} 
            horizontalMargins={horizontalMargins}
            mapView={mapView || undefined}
            showBicyclist={showBicyclist}
            showPedestrian={showPedestrian}
            modelCountsBy={modelCountsBy}
            year={selectedYear}
            selectedGeometry={selectedGeometry}
          />
        )}
        {activeTab === 'raw-data' && (
          <>
            <div className={`space-y-4 ${horizontalMargins} my-4`}>
              <LowDataCoverage 
                confidence={confidenceData?.confidence}
                contributingSites={confidenceData?.contributingSites}
                totalSites={confidenceData?.totalSites}
                hasData={timelineData.length > 0}
                isLoading={timelineLoading}
              />
              <SummaryStatistics 
                spatialResult={volumeResult || null} 
                isLoading={volumeLoading}
                selectedGeometry={selectedGeometry}
              />
              <AggregatedVolumeBreakdown 
                selectedGeometry={selectedGeometry}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                dateRange={dateRange}
              />
              <YearToYearVolumeComparison 
                selectedGeometry={selectedGeometry}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                dateRange={dateRange}
              />
              <TimelineSparkline
                sites={timelineData}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                dateRange={`${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`}
                selectedSiteId={selectedCountSite}
                onSiteSelect={onCountSiteSelect}
                onConfidenceUpdate={handleConfidenceUpdate}
                selectedGeometry={selectedGeometry}
                isLoading={timelineLoading}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                modelCountsBy={modelCountsBy}
              />
              <HighestVolume 
                mapView={mapView}
                sitesLayer={sitesLayer}
                countsLayer={countsLayer}
                aadtTable={aadtTable}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                selectedGeometry={selectedGeometry}
                selectedSiteId={selectedCountSite}
                onSiteSelect={onCountSiteSelect}
              />
              <ModeBreakdown 
                selectedGeometry={selectedGeometry}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                volumeChartDataService={volumeChartDataService || undefined}
                mapView={mapView || undefined}
                filters={{
                  showBicyclist,
                  showPedestrian,
                }}
              />
            </div>
          </>
        )}
        {activeTab === 'data-completeness' && (
          <>
            <CompletenessMetrics 
              horizontalMargins={horizontalMargins}
              timelineData={timelineData}
              selectedAreaName={selectedAreaName || null}
              dateRange={dateRange}
              isLoading={timelineLoading}
              selectedSiteId={selectedCountSite}
              onSiteSelect={onCountSiteSelect}
            />
          </>
        )}
      </div>
    </div>
  );
}