'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  AADTHistogramDataService, 
  AADTHistogramResult, 
  HistogramBinData,
  SiteAADTData 
} from '../../../../lib/data-services/AADTHistogramDataService';
import Tooltip from '../../../components/Tooltip';
import CollapseExpandIcon from './CollapseExpandIcon';
import SelectRegionPlaceholder from '../../../components/SelectRegionPlaceholder';

interface HoveredBarData {
  binLabel: string;
  count: number;
  binIndex: number;
}

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface AADTHistogramProps {
  selectedGeometry?: Polygon | null;
  dateRange: DateRangeValue;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  selectedCountSite?: string | null;
  onCountSiteSelect?: (siteId: string | null) => void;
}

type VisualizationMode = 'histogram' | 'individual-bars' | 'density';

export default function AADTHistogram({
  selectedGeometry = null,
  dateRange,
  showBicyclist = true,
  showPedestrian = true,
  selectedCountSite,
  onCountSiteSelect
}: AADTHistogramProps) {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [histogramData, setHistogramData] = useState<AADTHistogramResult | null>(null);
  const [individualSitesData, setIndividualSitesData] = useState<SiteAADTData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberOfBins, setNumberOfBins] = useState(10);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('individual-bars');

  // Debounce the date range to prevent rapid refetches
  const [debouncedDateRange, setDebouncedDateRange] = useState<DateRangeValue>(dateRange);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateRange(dateRange);
    }, 350);
    return () => clearTimeout(timer);
  }, [dateRange?.startDate?.getTime?.(), dateRange?.endDate?.getTime?.()]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Fetch data when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedGeometry || !debouncedDateRange?.startDate || !debouncedDateRange?.endDate) {
        setHistogramData(null);
        setIndividualSitesData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (visualizationMode === 'individual-bars') {
          const result = await AADTHistogramDataService.queryIndividualSiteAADT(
            selectedGeometry,
            debouncedDateRange,
            showBicyclist,
            showPedestrian
          );
          
          setIndividualSitesData(result.sites);
          setHistogramData(null);
          if (result.error) {
            setError(result.error);
          }
        } else {
          const result = await AADTHistogramDataService.queryAADTHistogram(
            selectedGeometry,
            debouncedDateRange,
            showBicyclist,
            showPedestrian,
            numberOfBins
          );

          setHistogramData(result);
          setIndividualSitesData([]);
          if (result.error) {
            setError(result.error);
          }
        }
      } catch (err) {
        console.error('Error fetching AADT data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setHistogramData(null);
        setIndividualSitesData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedGeometry, debouncedDateRange, showBicyclist, showPedestrian, numberOfBins, visualizationMode]);

  // Handle bar click to highlight sites on map
  const handleBarClick = useCallback((params: any) => {
    if (!onCountSiteSelect) return;

    if (visualizationMode === 'individual-bars') {
      // Individual bars mode - each bar represents one site
      const siteIndex = params.dataIndex;
      if (individualSitesData[siteIndex]) {
        const site = individualSitesData[siteIndex];
        onCountSiteSelect(site.siteName);
      }
    } else {
      // Histogram mode - each bar represents multiple sites
      if (!histogramData) return;
      
      const binIndex = params.dataIndex;
      const sitesInBin = AADTHistogramDataService.getSitesInAADTRange(histogramData, binIndex);
      
      if (sitesInBin.length === 0) return;
      
      if (sitesInBin.length === 1) {
        // Single site - select it directly
        onCountSiteSelect(sitesInBin[0].siteName);
      } else {
        // Multiple sites - cycle through them or select the one with highest AADT
        const currentlySelected = sitesInBin.find(site => site.siteName === selectedCountSite);
        
        if (currentlySelected) {
          // If a site in this bin is already selected, cycle to the next one
          const currentIndex = sitesInBin.indexOf(currentlySelected);
          const nextIndex = (currentIndex + 1) % sitesInBin.length;
          onCountSiteSelect(sitesInBin[nextIndex].siteName);
        } else {
          // No site in this bin is selected, select the one with highest AADT
          const highestAADTSite = sitesInBin.reduce((prev, current) => 
            current.aadt > prev.aadt ? current : prev
          );
          onCountSiteSelect(highestAADTSite.siteName);
        }
      }
    }
  }, [histogramData, individualSitesData, onCountSiteSelect, selectedCountSite, visualizationMode]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        if (visualizationMode === 'individual-bars') {
          const site = individualSitesData[params.dataIndex];
          if (site) {
            setHoveredBar({
              binLabel: site.siteName,
              count: site.aadt,
              binIndex: params.dataIndex
            });
          }
        } else if (histogramData?.bins[params.dataIndex]) {
          const bin = histogramData.bins[params.dataIndex];
          setHoveredBar({
            binLabel: bin.binLabel,
            count: bin.count,
            binIndex: params.dataIndex
          });
        }
      },
      mouseout: () => {
        setHoveredBar(null);
      },
      click: handleBarClick
    }),
    [handleBarClick, histogramData, individualSitesData, visualizationMode],
  );

  // Format numbers for display
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return Math.round(value).toString();
  };

  // Get statistics text for display
  const getStatsText = (): string => {
    if (visualizationMode === 'individual-bars') {
      if (individualSitesData.length === 0) return '';
      
      const aadtValues = individualSitesData.map(site => site.aadt);
      const totalSites = individualSitesData.length;
      const meanAADT = aadtValues.reduce((sum, val) => sum + val, 0) / aadtValues.length;
      const minAADT = Math.min(...aadtValues);
      const maxAADT = Math.max(...aadtValues);
      const sortedAADTs = [...aadtValues].sort((a, b) => a - b);
      const medianAADT = sortedAADTs[Math.floor(sortedAADTs.length / 2)];
      
      return `${totalSites} sites • Mean: ${formatNumber(meanAADT)} • Median: ${formatNumber(medianAADT)} • Range: ${formatNumber(minAADT)}-${formatNumber(maxAADT)}`;
    } else {
      if (!histogramData || histogramData.totalSites === 0) return '';
      
      const { totalSites, meanAADT, medianAADT, minAADT, maxAADT } = histogramData;
      return `${totalSites} sites • Mean: ${formatNumber(meanAADT)} • Median: ${formatNumber(medianAADT)} • Range: ${formatNumber(minAADT)}-${formatNumber(maxAADT)}`;
    }
  };

  // Highlight selected site's bar and yellow highlight for percentile visualization
  const getBarColor = (index: number): string => {
    // Default blue color
    let color = '#3b82f6';
    
    // Red highlight for selected site
    if (selectedCountSite) {
      if (visualizationMode === 'individual-bars') {
        const site = individualSitesData[index];
        if (site?.siteName === selectedCountSite) {
          color = '#ef4444'; // Red for selected site
        }
      } else if (histogramData) {
        const bin = histogramData.bins[index];
        const isSelectedSiteInBin = bin?.sites?.some(site => site.siteName === selectedCountSite);
        if (isSelectedSiteInBin) {
          color = '#ef4444'; // Red for selected site
        }
      }
    }
    
    // Yellow highlight for percentile visualization (bars to the left of hovered bar)
    if (hoveredBar && visualizationMode === 'individual-bars') {
      const hoveredIndex = hoveredBar.binIndex;
      if (index <= hoveredIndex) {
        // Current bar or bars to the left (lower AADT values)
        if (index === hoveredIndex) {
          color = '#f59e0b'; // Amber/orange for the hovered bar itself
        } else {
          color = '#fbbf24'; // Yellow for bars to the left
        }
      }
    }
    
    return color;
  };

  const option = useMemo(() => {
    if (visualizationMode === 'individual-bars') {
      // Individual bars mode - show min, mean, max on x-axis
      const aadtValues = individualSitesData.map(site => site.aadt);
      const minAADT = aadtValues.length > 0 ? Math.min(...aadtValues) : 0;
      const maxAADT = aadtValues.length > 0 ? Math.max(...aadtValues) : 0;
      const meanAADT = aadtValues.length > 0 ? aadtValues.reduce((sum, val) => sum + val, 0) / aadtValues.length : 0;
      
      return {
        grid: {
          left: '60px',
          right: '20px',
          top: '20px',
          bottom: '60px',
          containLabel: false,
        },
        xAxis: {
          type: 'category',
          data: individualSitesData.map((_, index) => ''), // Empty labels for individual bars
          axisLine: {
            show: true,
            lineStyle: {
              color: '#9ca3af',
              width: 1,
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            show: false, // Hide individual site labels
          },
          name: `AADT Distribution (Min: ${formatNumber(minAADT)} • Mean: ${formatNumber(meanAADT)} • Max: ${formatNumber(maxAADT)})`,
          nameLocation: 'middle',
          nameGap: 25,
          nameTextStyle: {
            color: '#6b7280',
            fontSize: 12,
            fontWeight: 500,
          },
        },
        yAxis: {
          type: 'value',
          axisLine: {
            show: true,
            lineStyle: {
              color: '#9ca3af',
              width: 1,
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: '#6b7280',
            fontSize: 12,
            margin: 8,
          },
          name: 'AADT Value',
          nameLocation: 'middle',
          nameGap: 45,
          nameTextStyle: {
            color: '#6b7280',
            fontSize: 12,
            fontWeight: 500,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#e5e7eb',
              width: 1,
              type: [3, 3],
            },
          },
        },
        series: [
          {
            data: individualSitesData.map((site, index) => ({
              value: site.aadt,
              itemStyle: {
                color: getBarColor(index),
                borderRadius: [2, 2, 0, 0],
              },
            })),
            type: 'bar',
            barWidth: individualSitesData.length > 100 ? '95%' : individualSitesData.length > 50 ? '90%' : '80%',
            emphasis: {
              itemStyle: {
                borderColor: '#1f2937',
                borderWidth: 1,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
            },
          },
        ],
        tooltip: {
          show: false,
        },
      };
    } else {
      // Histogram mode
      return {
        grid: {
          left: '60px',
          right: '20px',
          top: '20px',
          bottom: '60px',
          containLabel: false,
        },
        xAxis: {
          type: 'category',
          data: histogramData?.bins.map(bin => bin.binLabel) || [],
          axisLine: {
            show: true,
            lineStyle: {
              color: '#9ca3af',
              width: 1,
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: '#6b7280',
            fontSize: 12,
            rotate: 45,
            margin: 8,
          },
          name: 'AADT (Annual Average Daily Traffic)',
          nameLocation: 'middle',
          nameGap: 45,
          nameTextStyle: {
            color: '#6b7280',
            fontSize: 12,
            fontWeight: 500,
          },
        },
        yAxis: {
          type: 'value',
          axisLine: {
            show: true,
            lineStyle: {
              color: '#9ca3af',
              width: 1,
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: '#6b7280',
            fontSize: 12,
            margin: 8,
          },
          name: 'Number of Sites',
          nameLocation: 'middle',
          nameGap: 45,
          nameTextStyle: {
            color: '#6b7280',
            fontSize: 12,
            fontWeight: 500,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#e5e7eb',
              width: 1,
              type: [3, 3],
            },
          },
        },
        series: [
          {
            data: histogramData?.bins.map((bin, index) => ({
              value: bin.count,
              itemStyle: {
                color: getBarColor(index),
                borderRadius: [4, 4, 0, 0],
              },
            })) || [],
            type: 'bar',
            barWidth: '70%',
            emphasis: {
              itemStyle: {
                borderColor: '#1f2937',
                borderWidth: 2,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
            },
          },
        ],
        tooltip: {
          show: false,
        },
      };
    }
  }, [histogramData, individualSitesData, selectedCountSite, visualizationMode, hoveredBar]);

  // Memoize the chart component
  const chartComponent = useMemo(
    () => (
      <div id="aadt-histogram-chart">
        <ReactECharts
          option={option}
          style={{ height: '300px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onEvents={onEvents}
        />
      </div>
    ),
    [option, onEvents],
  );

  return (
    <div id="aadt-histogram-container" className="rounded-lg border border-gray-200 bg-white p-4">
      <div id="aadt-histogram-header" className="flex justify-between items-center">
        <h3 id="aadt-histogram-title" className="text-lg font-medium text-gray-900">AADT Distribution</h3>
        <CollapseExpandIcon id="aadt-histogram-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="aadt-histogram-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        {!selectedGeometry && (
          <SelectRegionPlaceholder id="aadt-histogram-no-selection" subtext="Use the polygon tool or click on a boundary to see AADT distribution for that area" />
        )}
        {selectedGeometry && (
          <>
            <div id="aadt-histogram-controls" className="flex items-center justify-between mt-2 mb-2">
              <div id="aadt-histogram-mode-control" className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="aadt-histogram-mode-select" className="text-sm text-gray-600">View:</label>
                  <select
                    id="aadt-histogram-mode-select"
                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={visualizationMode}
                    onChange={(e) => setVisualizationMode(e.target.value as VisualizationMode)}
                    disabled={isLoading}
                  >
                    <option value="individual-bars">Individual Sites</option>
                    <option value="histogram">Histogram</option>
                  </select>
                </div>
                {visualizationMode === 'histogram' && (
                  <div className="flex items-center space-x-2">
                    <label htmlFor="aadt-histogram-bins-select" className="text-sm text-gray-600">Bins:</label>
                    <select
                      id="aadt-histogram-bins-select"
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={numberOfBins}
                      onChange={(e) => setNumberOfBins(parseInt(e.target.value))}
                      disabled={isLoading}
                    >
                      <option value={6}>6</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={12}>12</option>
                      <option value={15}>15</option>
                    </select>
                  </div>
                )}
              </div>
              <div id="aadt-histogram-stats" className="text-xs text-gray-500">
                {getStatsText()}
              </div>
            </div>

            {error && (
              <div id="aadt-histogram-error" className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                <div className="text-sm text-red-800">
                  <strong>Data Error:</strong> {error}
                </div>
              </div>
            )}

            <div id="aadt-histogram-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
            <div id="aadt-histogram-description" className="w-full text-sm text-gray-600">
              Distribution of Average Annual Daily Traffic (AADT) across count sites in selected area
              <span id="aadt-histogram-info-icon-container" className="ml-1 inline-flex align-middle">
                <Tooltip 
                  text="AADT is calculated by averaging daily traffic counts over the selected time period and annualizing. Click on bars to highlight sites on the map." 
                  align="right" 
                />
              </span>
            </div>

            <div id="aadt-histogram-chart-container" className="relative mt-1">
              {hoveredBar && !isLoading && (
                <div
                  id="aadt-histogram-tooltip"
                  className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                >
                  {visualizationMode === 'individual-bars' ? (
                    <div>
                      <div>{`${hoveredBar.binLabel}: ${formatNumber(hoveredBar.count)} AADT`}</div>
                      {(() => {
                        const totalSites = individualSitesData.length;
                        const sitesAtOrBelow = hoveredBar.binIndex + 1; // +1 because index is 0-based
                        const percentage = totalSites > 0 ? Math.round((sitesAtOrBelow / totalSites) * 100) : 0;
                        return (
                          <div className="text-yellow-400 mt-1 font-medium">
                            {percentage}% of sites have ≤ {formatNumber(hoveredBar.count)} AADT
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <div>{`${hoveredBar.count} sites with AADT ${hoveredBar.binLabel}`}</div>
                      {histogramData?.bins[hoveredBar.binIndex]?.sites && histogramData.bins[hoveredBar.binIndex].sites.length > 1 && (
                        <div className="text-gray-300 mt-1">Click to cycle through sites</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Loading overlay */}
              {isLoading && (
                <div 
                  id="aadt-histogram-loading-overlay" 
                  className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                >
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-sm text-gray-700 font-medium">Calculating AADT...</span>
                    <span className="text-xs text-gray-500 mt-1">Processing count data for {histogramData?.totalSites || 0} sites</span>
                  </div>
                </div>
              )}

              {((visualizationMode === 'individual-bars' && individualSitesData.length > 0) || 
                (visualizationMode === 'histogram' && histogramData && histogramData.bins.length > 0)) ? (
                <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
                  {chartComponent}
                </div>
              ) : (
                <div 
                  id="aadt-histogram-no-data" 
                  className="flex justify-center items-center"
                  style={{ height: '300px', width: '100%' }}
                >
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">No AADT data available for selected area</div>
                    <div className="text-gray-300 text-xs mt-1">Try selecting a different area or adjusting the date range</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
