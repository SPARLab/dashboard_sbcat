import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import React, { useCallback, useEffect, useState } from "react";
import { VolumeChartDataService } from "../../../lib/data-services/VolumeChartDataService";
import { useSpatialQuery, useVolumeSpatialQuery, useEnhancedAADVSummaryQuery } from "../../../lib/hooks/useSpatialQuery";
import { useVolumeAppStore } from "../../../lib/stores/volume-app-state";
import { queryDeduplicator, QueryDeduplicator } from "../../../lib/utilities/shared/QueryDeduplicator";
import { formatSparklineDateRange } from "../utils/sparklineUtils";
import AADVHistogram from "../components/right-sidebar/AADTHistogram";
import AggregatedVolumeBreakdown from "../components/right-sidebar/AggregatedVolumeBreakdown";
import CompletenessMetrics from "../components/right-sidebar/CompletenessMetrics";
import EnhancedDataNormalization from "../components/right-sidebar/EnhancedDataNormalization";
import HighestVolume from "../components/right-sidebar/HighestVolume";
import LowDataCoverage from "../components/right-sidebar/LowDataCoverage";
import PercentOfNetworkByVolumeLevelBarChart from "../components/right-sidebar/PercentOfNetworkByVolumeLevelBarChart";
import ModeBreakdown from "../components/right-sidebar/ModeBreakdown";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";
import TimelineSparkline from "../components/right-sidebar/TimelineSparkline";
import TrendsHeader from "../components/right-sidebar/TrendsHeader";
import YearToYearVolumeComparison from "../components/right-sidebar/YearToYearVolumeComparison";
import LocationIndicator from "../../components/LocationIndicator";

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
  selectedMode: 'bike' | 'ped';
  modelCountsBy: string;
  mapView?: __esri.MapView | null;
  aadtLayer?: FeatureLayer | null;
  selectedGeometry?: Polygon | null;
  selectedAreaName?: string | null;
  dateRange: DateRangeValue;
  selectedCountSite?: string | null;
  onCountSiteSelect?: (siteId: string | null) => void;
  onBinSitesHighlight?: (siteNames: string[]) => void;
  highlightedBinSites?: string[];
  selectedYear: number;
}

export default function NewVolumeRightSidebar({ 
  activeTab,
  showBicyclist,
  showPedestrian,
  selectedMode,
  modelCountsBy,
  mapView,
  aadtLayer: aadtLayerProp,
  selectedGeometry,
  selectedAreaName,
  dateRange,
  selectedCountSite: selectedCountSiteProp, // Rename to avoid conflict
  onCountSiteSelect,
  onBinSitesHighlight,
  highlightedBinSites: highlightedBinSitesProp = [], // Rename to avoid conflict
  selectedYear
}: NewVolumeRightSidebarProps) {
  // Use Zustand store for state management
  const { 
    selectedCountSite, 
    highlightedBinSites, 
    setSelectedCountSite 
  } = useVolumeAppStore();
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
        // 1) Query sites intersecting geometry - WITH DEDUPLICATION
        const sitesQueryKey = QueryDeduplicator.generateGeometryKey(
          'sites-intersecting',
          selectedGeometry,
          { outFields: 'id' }
        );
        
        const sitesResult = await queryDeduplicator.deduplicate(sitesQueryKey, async () => {
          const sitesQuery = sitesLayer.createQuery();
          sitesQuery.geometry = selectedGeometry;
          sitesQuery.spatialRelationship = "intersects" as const;
          sitesQuery.returnGeometry = false;
          sitesQuery.outFields = ["id"]; // site id field
          return sitesLayer.queryFeatures(sitesQuery as __esri.QueryProperties);
        });
        
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

        // 2) Query counts for those sites within the date range and count_type filters - WITH DEDUPLICATION
        const start = dateRange.startDate.toISOString().split('T')[0];
        const end = dateRange.endDate.toISOString().split('T')[0];
        const typeClauses: string[] = [];
        if (showBicyclist) typeClauses.push("'bike'");
        if (showPedestrian) typeClauses.push("'ped'");
        const countTypeWhere = typeClauses.length ? ` AND count_type IN (${typeClauses.join(',')})` : '';

        const countsQueryKey = QueryDeduplicator.generateKey('counts-for-sites', {
          siteIds: siteIds.sort().join(','), // Sort for consistent caching
          startDate: start,
          endDate: end,
          showBicyclist,
          showPedestrian,
          operation: 'group-by-site'
        });

        const countsResult = await queryDeduplicator.deduplicate(countsQueryKey, async () => {
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
          return countsLayer.queryFeatures(countsQuery as __esri.QueryProperties);
        });
        
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

        // Query sites to get site names for highlighted bin sites - OPTIMIZED
        let highlightedSiteIds: number[] = [];
        if (highlightedBinSites.length > 0) {
          console.log('🟡 Processing highlighted bin sites:', highlightedBinSites.length, 'sites');
          
          try {
            // OPTIMIZATION: Use single query instead of batches
            // Escape single quotes in site names for SQL
            const escapedNames = highlightedBinSites.map(name => name.replace(/'/g, "''"));
            
            // Split into chunks only if we exceed SQL parameter limits (typically 1000)
            const maxNamesPerQuery = 900; // Conservative limit
            const chunks = [];
            for (let i = 0; i < escapedNames.length; i += maxNamesPerQuery) {
              chunks.push(escapedNames.slice(i, i + maxNamesPerQuery));
            }
            
            console.log('🟡 Processing', chunks.length, 'optimized chunks');
            
            // Execute chunks in parallel for maximum performance
            const chunkPromises = chunks.map(async (chunk) => {
              const sitesQuery = sitesLayer.createQuery();
              sitesQuery.where = `name IN ('${chunk.join("','")}')`;
              sitesQuery.outFields = ["id", "name"];
              sitesQuery.returnGeometry = false;
              
              const sitesResult = await sitesLayer.queryFeatures(sitesQuery);
              return sitesResult.features.map(f => Number(f.attributes.id)).filter(v => Number.isFinite(v));
            });
            
            const chunkResults = await Promise.all(chunkPromises);
            highlightedSiteIds = chunkResults.flat();
            
            console.log('🟡 Total highlighted site IDs:', highlightedSiteIds.length);
          } catch (err) {
            console.error('Error querying highlighted sites:', err);
          }
        }

        // Create value expression for three states:
        // 2 = highlighted bin sites (yellow/orange)
        // 1 = contributing sites (blue) 
        // 0 = non-contributing sites (gray)
        const contributingArray = `[${contributingIds.join(',')}]`;
        const highlightedArray = highlightedSiteIds.length > 0 ? `[${highlightedSiteIds.join(',')}]` : '[]';
        
        const valueExpression = `IIF(IndexOf(${highlightedArray}, Number($feature.id)) > -1, 2, IIF(IndexOf(${contributingArray}, Number($feature.id)) > -1, 1, 0))`;

        const filledBlue = new SimpleMarkerSymbol({
          size: 8,
          color: [0, 102, 255, 0.95],
          outline: { width: 1, color: [255, 255, 255, 1] },
        });
        
        const highlightedYellow = new SimpleMarkerSymbol({
          size: 10,
          color: [255, 193, 7, 0.9], // Bootstrap warning yellow
          outline: { width: 2, color: [255, 255, 255, 1] },
        });
        
        const hollowGray = new SimpleMarkerSymbol({
          size: 8,
          color: [0, 0, 0, 0],
          outline: { width: 1.5, color: [128, 128, 128, 1] },
        });

        const uvRenderer = new UniqueValueRenderer({
          valueExpression,
          uniqueValueInfos: [
            { value: 2, symbol: highlightedYellow }, // Highlighted bin sites
            { value: 1, symbol: filledBlue },        // Contributing sites
          ],
          defaultSymbol: hollowGray, // Non-contributing sites
        });

        aadtLayer.renderer = uvRenderer;
      } catch (err) {
        console.error('[RightSidebar] Failed to compute/apply site highlighting:', err);
      }
    };

    applyStyling();
  }, [aadtLayer, selectedGeometry, dateRange.startDate, dateRange.endDate, showBicyclist, showPedestrian, sitesLayer, countsLayer, highlightedBinSites]);

  // (moved below state declarations)

  // Use spatial query hooks (keeping for future use)
  useSpatialQuery(
    aadtLayer,
    selectedGeometry || null
  );

  // Use enhanced AADV calculation for summary statistics
  const { result: enhancedAADVResult, isLoading: enhancedAADVLoading } = useEnhancedAADVSummaryQuery(
    sitesLayer,
    selectedGeometry || null,
    dateRange,
    { showBicyclist, showPedestrian }
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
        <LocationIndicator 
          selectedAreaName={selectedAreaName}
          horizontalMargins={horizontalMargins}
          id="volume-location-indicator"
        />
        {activeTab === 'modeled-data' && (
          <div className="mt-4">
            <PercentOfNetworkByVolumeLevelBarChart 
              dataType={activeTab} 
              horizontalMargins={horizontalMargins}
              mapView={mapView || undefined}
              showBicyclist={showBicyclist}
              showPedestrian={showPedestrian}
              selectedMode={selectedMode}
              modelCountsBy={modelCountsBy}
              year={selectedYear}
              selectedGeometry={selectedGeometry}
            />
          </div>
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
              <EnhancedDataNormalization />
              <SummaryStatistics 
                spatialResult={enhancedAADVResult || null} 
                isLoading={enhancedAADVLoading}
                selectedGeometry={selectedGeometry}
                dateRange={dateRange}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
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
                dateRange={formatSparklineDateRange(dateRange.startDate, dateRange.endDate)}
                selectedSiteId={selectedCountSite}
                onSiteSelect={setSelectedCountSite}
                onConfidenceUpdate={handleConfidenceUpdate}
                selectedGeometry={selectedGeometry}
                isLoading={timelineLoading}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                modelCountsBy={modelCountsBy}
              />
                            <AADVHistogram 
                selectedGeometry={selectedGeometry}
                dateRange={dateRange}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
              />
              <HighestVolume 
                mapView={mapView}
                sitesLayer={sitesLayer}
                countsLayer={countsLayer}
                aadtTable={aadtTable}
                dateRange={dateRange}
                showBicyclist={showBicyclist}
                showPedestrian={showPedestrian}
                selectedGeometry={selectedGeometry}
                selectedSiteId={selectedCountSite}
                onSiteSelect={setSelectedCountSite}
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
          <div className="mt-4">
            <CompletenessMetrics 
              horizontalMargins={horizontalMargins}
              timelineData={timelineData}
              selectedAreaName={selectedAreaName || null}
              dateRange={dateRange}
              isLoading={timelineLoading}
              selectedSiteId={selectedCountSite}
              onSiteSelect={setSelectedCountSite}
            />
          </div>
        )}
      </div>
    </div>
  );
}