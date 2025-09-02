'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { 
  AADVHistogramDataService, 
  AADVHistogramResult, 
  HistogramBinData,
  SiteAADVData 
} from '../../../../lib/data-services/AADVHistogramDataService';
import CollapseExpandIcon from './CollapseExpandIcon';
import SelectRegionPlaceholder from '../../../components/SelectRegionPlaceholder';
import { useVolumeAppStore } from '../../../../lib/stores/volume-app-state';
import InfoTooltipIcon from './MoreInformationIcon';

  // Expose debugging functionality to global scope for development
  if (typeof window !== 'undefined') {
    (window as any).debugAADVHistogram = {
      debugMissingCountSites: AADVHistogramDataService.debugMissingCountSites,
      compareWithHighestVolume: AADVHistogramDataService.compareWithHighestVolumeComponent,
      compareWithSparkline: AADVHistogramDataService.compareWithSparklineTimeline,
      compareWithSparklineApproach: AADVHistogramDataService.compareWithSparklineApproach,
      investigateNBPDFactors: AADVHistogramDataService.investigateNBPDFactorCoverage,
      quickTest: AADVHistogramDataService.quickTestWithoutEnhancedCalculation,
      service: AADVHistogramDataService
    };
  }

interface HoveredBarData {
  binLabel: string;
  count: number;
  binIndex: number;
}

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface AADVHistogramProps {
  selectedGeometry?: Polygon | null;
  dateRange: DateRangeValue;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
}

type VisualizationMode = 'histogram' | 'individual-bars' | 'density';

export default function AADVHistogram({
  selectedGeometry = null,
  dateRange,
  showBicyclist = true,
  showPedestrian = true,
}: AADVHistogramProps) {
  const { 
    setSelectedCountSite, 
    setHighlightedBinSites,
    selectedCountSite, // Renamed from the prop to avoid conflict
  } = useVolumeAppStore();
  
  const isSelectionFromSelf = useRef(false);
  const componentRef = useRef<HTMLDivElement>(null);

  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const chartRef = useRef<ReactECharts>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [histogramData, setHistogramData] = useState<AADVHistogramResult | null>(null);
  const [individualSitesData, setIndividualSitesData] = useState<SiteAADVData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberOfBins, setNumberOfBins] = useState(30);
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
          const result = await AADVHistogramDataService.queryIndividualSiteAADV(
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
          const result = await AADVHistogramDataService.queryAADVHistogram(
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
        console.error('Error fetching AADV data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setHistogramData(null);
        setIndividualSitesData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedGeometry, debouncedDateRange, showBicyclist, showPedestrian, numberOfBins, visualizationMode]);

  // Effect to clear selection when data changes
  useEffect(() => {
    setSelectedBarIndex(null);
  }, [histogramData, individualSitesData, visualizationMode]);

  // Click outside handler to clear selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        // Clear the selected bar index
        setSelectedBarIndex(null);
        
        // Clear highlighted sites on the map
        setHighlightedBinSites([]);
        
        // Clear selected count site if it was selected from this component
        if (selectedBarIndex !== null) {
          setSelectedCountSite(null);
        }
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedBarIndex, setHighlightedBinSites, setSelectedCountSite]);

  // Click handler: sets flag, updates store, and manages visual selection
  const handleBarClick = useCallback((params: any) => {
    // Set the selected bar index for visual feedback
    setSelectedBarIndex(params.dataIndex);
    
    // Set flag to prevent self-update loop
    isSelectionFromSelf.current = true;
    
    // Update global state for other components (like the map)
    if (visualizationMode === 'individual-bars') {
      const site = individualSitesData[params.dataIndex];
      if (site) setSelectedCountSite(site.siteId.toString());
    } else {
      if (!histogramData) return;
      const sitesInBin = AADVHistogramDataService.getSitesInAADVRange(histogramData, params.dataIndex);
      if (sitesInBin.length > 0) {
        setHighlightedBinSites(sitesInBin.map(site => site.siteName));
      }
    }
  }, [histogramData, individualSitesData, visualizationMode, setSelectedCountSite, setHighlightedBinSites]);

  // Sync effect: listens for EXTERNAL changes from the store
  useEffect(() => {
    // If the selection came from this component, ignore the update and reset the flag.
    if (isSelectionFromSelf.current) {
      isSelectionFromSelf.current = false;
      return;
    }

    // Clear selected bar index when external changes happen
    setSelectedBarIndex(null);
    
    // Logic to find the correct bar and dispatch 'select' or 'unselect'
    // This runs ONLY when the map (or another component) changes the state.
    // ...
  }, [selectedCountSite, histogramData, individualSitesData, visualizationMode]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        if (visualizationMode === 'individual-bars') {
          const site = individualSitesData[params.dataIndex];
          if (site) {
            setHoveredBar({
              binLabel: site.siteName,
              count: site.aadv,
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
      const formatted = (value / 1000000);
      return formatted % 1 === 0 ? `${formatted}M` : `${Math.round(formatted)}M`;
    } else if (value >= 1000) {
      const formatted = (value / 1000);
      return formatted % 1 === 0 ? `${formatted}K` : `${Math.round(formatted)}K`;
    }
    return Math.round(value).toString();
  };

  // Get statistics text for display
  const getStatsText = (): string => {
    if (visualizationMode === 'individual-bars') {
      if (individualSitesData.length === 0) return '';
      
      const aadvValues = individualSitesData.map(site => site.aadv);
      const totalSites = individualSitesData.length;
      const meanAADV = aadvValues.reduce((sum, val) => sum + val, 0) / aadvValues.length;
      const minAADV = Math.min(...aadvValues);
      const maxAADV = Math.max(...aadvValues);
      const sortedAADVs = [...aadvValues].sort((a, b) => a - b);
      const medianAADV = sortedAADVs[Math.floor(sortedAADVs.length / 2)];
      
      return `${totalSites} sites  • Mean: ${formatNumber(meanAADV)}  • Median: ${formatNumber(medianAADV)}  • Range: ${formatNumber(minAADV)}-${formatNumber(maxAADV)}`;
    } else {
      if (!histogramData || histogramData.totalSites === 0) return '';
      
      const { totalSites, meanAADV, medianAADV, minAADV, maxAADV } = histogramData;
      return `${totalSites} sites  • Mean: ${formatNumber(meanAADV)}  • Median: ${formatNumber(medianAADV)}  • Range: ${formatNumber(minAADV)}-${formatNumber(maxAADV)}`;
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
    
    // Yellow highlight for selected bar (clicked bar) - HIGHEST PRIORITY
    if (selectedBarIndex === index) {
      color = '#eab308'; // Yellow for selected bar - overrides all other colors
    }
    
    return color;
  };

  const option = useMemo(() => {
    if (visualizationMode === 'individual-bars') {
      // Individual bars mode - show min, mean, max on x-axis
      const aadvValues = individualSitesData.map(site => site.aadv);
      const minAADV = aadvValues.length > 0 ? Math.min(...aadvValues) : 0;
      const maxAADV = aadvValues.length > 0 ? Math.max(...aadvValues) : 0;
      const meanAADV = aadvValues.length > 0 ? aadvValues.reduce((sum, val) => sum + val, 0) / aadvValues.length : 0;
      
      return {
        grid: {
          left: '60px',
          right: '20px',
          top: '20px',
          bottom: '75px',
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
          name: `AADV Distribution (Min: ${formatNumber(minAADV)}  • Mean: ${formatNumber(meanAADV)}  • Max: ${formatNumber(maxAADV)})`,
          nameLocation: 'middle',
          nameGap: 40,
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
          name: 'AADV Value',
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
        barCategoryGap: 0, // No gap between categories to ensure alignment
        series: [
          // Invisible full-height bars for better hover/click targeting
          {
            data: individualSitesData.map(() => ({
              value: Math.max(...individualSitesData.map(s => s.aadv)), // Use max height
              itemStyle: {
                color: 'transparent', // Invisible
                borderColor: 'transparent',
              },
            })),
            type: 'bar',
            barWidth: '98%', // Wide hover target
            barGap: '-100%', // Overlap completely with visible bars
            z: 10, // Above visible bars for click handling
            emphasis: {
              itemStyle: {
                color: 'transparent',
                borderColor: 'transparent',
              },
            },
            silent: false, // Enable interactions
          },
          // Visible bars
          {
            data: individualSitesData.map((site, index) => {
              const isHovered = hoveredBar?.binIndex === index;
              const isSelected = selectedBarIndex === index;
              return {
                value: site.aadv,
                itemStyle: {
                  color: isSelected ? '#eab308' : (isHovered ? '#1e40af' : getBarColor(index)),
                  borderRadius: [2, 2, 0, 0],
                },
              };
            }),
            type: 'bar',
            barWidth: individualSitesData.length > 100 ? '95%' : individualSitesData.length > 50 ? '90%' : '80%',
            z: 5,
            select: {
              itemStyle: {
                color: '#eab308'
              }
            },
            emphasis: {
              itemStyle: {
                borderColor: '#1f2d37',
                borderWidth: 1,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
            },
            silent: false, // Enable selection on visible bars
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
          bottom: '75px',
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
          name: 'AADV (Average Annual Daily Volume)',
          nameLocation: 'middle',
          nameGap: 60,
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
            formatter: (value: number) => `${value}%`,
          },
          name: 'Percentage of Sites',
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
        barCategoryGap: 0, // No gap between categories to ensure alignment
        series: [
          // Invisible full-height bars for better hover/click targeting
          {
            data: histogramData?.bins.map(() => {
              const totalSites = histogramData?.totalSites || 1;
              const maxPercentage = Math.max(...(histogramData?.bins.map(b => (b.count / totalSites) * 100) || [0]));
              return {
                value: maxPercentage, // Use max percentage height
                itemStyle: {
                  color: 'transparent', // Invisible
                  borderColor: 'transparent',
                },
              };
            }) || [],
            type: 'bar',
            barWidth: '95%', // Wide hover target
            barGap: '-100%', // Overlap completely with visible bars
            z: 10, // Above visible bars for click handling
            emphasis: {
              itemStyle: {
                color: 'transparent',
                borderColor: 'transparent',
              },
            },
            silent: false, // Enable interactions
          },
          // Visible bars
          {
            data: histogramData?.bins.map((bin, index) => {
              const isHovered = hoveredBar?.binIndex === index;
              const isSelected = selectedBarIndex === index;
              const totalSites = histogramData?.totalSites || 1;
              const percentage = (bin.count / totalSites) * 100;
              return {
                value: percentage,
                itemStyle: {
                  color: isSelected ? '#eab308' : (isHovered ? '#1e40af' : getBarColor(index)),
                  borderRadius: [4, 4, 0, 0],
                },
              };
            }) || [],
            type: 'bar',
            barWidth: '70%',
            z: 5,
            select: {
              itemStyle: {
                color: '#eab308'
              }
            },
            emphasis: {
              itemStyle: {
                borderColor: '#1f2937',
                borderWidth: 2,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
            },
            silent: false, // Enable selection on visible bars
          },
        ],
        tooltip: {
          show: false,
        },
      };
    }
  }, [histogramData, individualSitesData, selectedCountSite, visualizationMode, hoveredBar, selectedBarIndex]);

  // Memoize the chart component
  const chartComponent = useMemo(
    () => (
      <div id="aadt-histogram-chart">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '300px', width: '100%' }}
          opts={{
            renderer: 'canvas'
          }}
          notMerge={false} 
          lazyUpdate={true} 
          onEvents={onEvents}
        />
      </div>
    ),
    [option, onEvents],
  );

  return (
    <div ref={componentRef} id="aadt-histogram-container" className="rounded-lg border border-gray-200 bg-white p-4">
      <div id="aadt-histogram-header" className="flex justify-between items-center">
        <h3 id="aadv-histogram-title" className="text-lg font-medium text-gray-900">AADV Distribution</h3>
        <CollapseExpandIcon id="aadt-histogram-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="aadt-histogram-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[650px]'}`}>
        {!selectedGeometry && (
          <SelectRegionPlaceholder id="aadv-histogram-no-selection" subtext="Use the polygon tool or click on a boundary to see AADV distribution for that area" />
        )}
        {selectedGeometry && (
          <>

            <div id="aadt-histogram-controls" className="mt-2 mb-2">
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
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                      <option value={6}>6</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={12}>12</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={25}>25</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                )}
              </div>
              <div id="aadt-histogram-stats" className="text-xs text-gray-500 mt-2 whitespace-pre">
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

            <div id="aadv-histogram-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
            <div id="aadv-histogram-description" className="w-full text-sm text-gray-600">
              Distribution of Average Annual Daily Volume (AADV) across count sites in selected area. 
              <InfoTooltipIcon 
                text="AADV is calculated using enhanced normalization with NBPD hourly factors, Santa Cruz daily factors, and Santa Cruz monthly factors for the most accurate annual volume estimates. Click on bars to highlight sites on the map." 
                align="center" 
                yOffset="0"
                width="w-72"
              />
            </div>

            <div id="aadt-histogram-chart-container" className="relative mt-1">
              {hoveredBar && !isLoading && (
                <div
                  id="aadt-histogram-tooltip"
                  className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                >
                  {visualizationMode === 'individual-bars' ? (
                    <div>
                      <div>{`${hoveredBar.binLabel}: ${formatNumber(hoveredBar.count)} AADV`}</div>
                      {(() => {
                        const totalSites = individualSitesData.length;
                        const sitesAtOrBelow = hoveredBar.binIndex + 1; // +1 because index is 0-based
                        const percentage = totalSites > 0 ? Math.round((sitesAtOrBelow / totalSites) * 100) : 0;
                        return (
                          <div className="text-yellow-400 mt-1 font-medium">
                            {percentage}% of sites have ≤ {formatNumber(hoveredBar.count)} AADV
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <div>{`${hoveredBar.count} sites with AADV ${hoveredBar.binLabel}`}</div>
                      {histogramData?.bins[hoveredBar.binIndex]?.sites && histogramData.bins[hoveredBar.binIndex].sites.length > 1 && (
                        <div className="text-yellow-400 mt-1">Click to highlight all sites on map</div>
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
                    <span className="text-sm text-gray-700 font-medium">Calculating AADV...</span>
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
                  {!isLoading && (
                    <div className="text-center">
                      <div className="text-gray-400 text-sm">No AADV data available for selected area</div>
                      <div className="text-gray-300 text-xs mt-1">Try selecting a different area or adjusting the date range</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}