import React, { useState, useCallback, useMemo } from "react";
import TimelineSparklineHeader from "./TimelineSparklineHeader";
import TimelineSparklineChart from "./TimelineSparklineChart";
import { type SiteData } from "./SharedTimelineChart";
import Polygon from "@arcgis/core/geometry/Polygon";
import SelectRegionPlaceholder from "../../../components/SelectRegionPlaceholder";

interface TimelineSparklineProps {
  sites: SiteData[];
  startDate: Date;
  endDate: Date;
  dateRange: string;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
  onConfidenceUpdate?: (data: ConfidenceData) => void;
  selectedGeometry?: Polygon | null;
  isLoading?: boolean;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  modelCountsBy?: string;
}

interface ConfidenceData {
  confidence: {
    level: 'high' | 'medium' | 'low';
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
  };
  contributingSites: number;
  totalSites: number;
}

export default function TimelineSparkline({
  sites,
  startDate,
  endDate,
  dateRange,
  selectedSiteId,
  onSiteSelect,
  onConfidenceUpdate,
  selectedGeometry = null,
  isLoading = false,
  showBicyclist = true,
  showPedestrian = true,
  modelCountsBy = 'cost-benefit'
}: TimelineSparklineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleConfidenceUpdate = useCallback((data: ConfidenceData) => {
    setConfidenceData(data);
    onConfidenceUpdate?.(data);
  }, [onConfidenceUpdate]);

  // Create header data based on state - simplified confidence logic
  const getHeaderProps = () => {
    if (!selectedGeometry) {
      return {
        confidence: {
          level: 'high' as const,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: (
            <svg viewBox="0 0 24 24" className="w-full h-full text-gray-500" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          )
        },
        contributingSites: 0,
        totalSites: 0,
        customMessage: 'Please select a region on the map'
      };
    }
    
    if (isLoading) {
      return {
        confidence: {
          level: 'high' as const,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: (
            <div className="animate-spin rounded-full w-full h-full border-b-2 border-blue-500"></div>
          )
        },
        contributingSites: 0,
        totalSites: 0,
        customMessage: 'Loading count sites...'
      };
    }
    
    // Calculate confidence based on site contribution (simplified logic)
    const totalSites = sites.length;
    const activeSites = sites.filter(site => site.dataPeriods && site.dataPeriods.length > 0).length;
    const contributionRatio = totalSites > 0 ? activeSites / totalSites : 0;
    const showLowConfidenceWarning = contributionRatio < 0.5 && totalSites > 0;
    
    if (showLowConfidenceWarning) {
      return {
        confidence: {
          level: 'low' as const,
          color: 'text-red-800',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: (
            <svg 
              viewBox="0 0 16 16" 
              className="w-full h-full text-red-600"
            >
              <path
                fill="currentColor"
                d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
              />
            </svg>
          )
        },
        contributingSites: activeSites,
        totalSites: totalSites,
        customMessage: `Low confidence - ${activeSites} out of ${totalSites} sites contributing data for given timeframe`
      };
    }
    
    // No confidence warning - just show count
    return {
      confidence: {
        level: 'high' as const,
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: null
      },
      contributingSites: activeSites,
      totalSites: totalSites,
      customMessage: `${totalSites} count sites within selected region`
    };
  };

  const headerProps = getHeaderProps();

  // Sort sites by coverage (sum of data period widths) descending
  const sortedSites = useMemo(() => {
    const calculateCoverage = (site: SiteData) =>
      site.dataPeriods.reduce((sum, period) => sum + (period.end - period.start), 0);

    return [...sites].sort((a, b) => {
      const coverageDiff = calculateCoverage(b) - calculateCoverage(a);
      if (coverageDiff !== 0) return coverageDiff;
      return a.label.localeCompare(b.label);
    });
  }, [sites]);

  return (
    <div id="timeline-sparkline-container" className="border border-gray-200 rounded-lg overflow-hidden overflow-x-hidden">
      {headerProps && (
        <TimelineSparklineHeader
          confidence={headerProps.confidence}
          contributingSites={headerProps.contributingSites}
          totalSites={headerProps.totalSites}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          customMessage={headerProps.customMessage}
        />
      )}
      {!selectedGeometry ? (
        <div
          id="timeline-sparkline-no-selection-grid"
          className={`grid bg-white rounded-b-lg transition-[grid-template-rows] ease-in-out duration-500 ${
            isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div id="timeline-sparkline-no-selection-overflow" className="overflow-hidden">
            <div id="timeline-sparkline-no-selection-padding" className="px-4 pb-4">
              <SelectRegionPlaceholder id="timeline-sparkline-no-selection" subtext="Use the polygon tool or click on a boundary to see the timeline for that area" />
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div
          id="timeline-sparkline-loading-grid"
          className={`grid bg-white rounded-b-lg transition-[grid-template-rows] ease-in-out duration-500 ${
            isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div id="timeline-sparkline-loading-overflow" className="overflow-hidden">
            <div id="timeline-sparkline-loading-padding" className="px-4 pb-4">
              <div 
                id="timeline-sparkline-loading-container"
                className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center mt-2 min-h-[120px]"
              >
                <div id="timeline-sparkline-loading-spinner" className="mb-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
                <p id="timeline-sparkline-loading-primary-text" className="text-sm text-gray-700 font-medium mb-1">
                  Loading timeline data...
                </p>
                <p id="timeline-sparkline-loading-secondary-text" className="text-xs text-gray-500">
                  Analyzing {showBicyclist && showPedestrian ? 'bicycle and pedestrian' : showBicyclist ? 'bicycle' : 'pedestrian'} volume data for selected area
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <TimelineSparklineChart
          sites={sortedSites}
          startDate={startDate}
          endDate={endDate}
          dateRange={dateRange}
          isCollapsed={isCollapsed}
          selectedSiteId={selectedSiteId}
          onConfidenceUpdate={handleConfidenceUpdate}
          onSiteSelect={onSiteSelect}
        />
      )}
    </div>
  );
} 