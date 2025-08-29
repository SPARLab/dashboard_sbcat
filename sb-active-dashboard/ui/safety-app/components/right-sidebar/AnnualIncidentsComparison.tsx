import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactECharts from 'echarts-for-react';
import { SafetyFilters, AnnualIncidentsComparisonData } from "../../../../lib/safety-app/types";
import { SafetyChartDataService } from "../../../../lib/data-services/SafetyChartDataService";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';

type TimeScale = 'Day' | 'Month' | 'Year';
const timeScales: TimeScale[] = ['Day', 'Month', 'Year'];

interface HoveredPointData {
  value: number;
  name: string;
  seriesName: string;
}

interface AnnualIncidentsComparisonProps {
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
  mapView?: __esri.MapView | null;
}

export default function AnnualIncidentsComparison({ 
  selectedGeometry = null, 
  filters = {},
  mapView = null
}: AnnualIncidentsComparisonProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointData | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('Year');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chartData, setChartData] = useState<AnnualIncidentsComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for preloaded data by time scale
  const [dataCache, setDataCache] = useState<Map<TimeScale, AnnualIncidentsComparisonData>>(new Map());
  const [cacheKey, setCacheKey] = useState<string>('');

  // Create data service instance
  const dataService = useMemo(() => new SafetyChartDataService(), []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Generate cache key based on selection and filters
  const generateCacheKey = (geometry: __esri.Polygon | null, safetyFilters: Partial<SafetyFilters>): string => {
    if (!geometry) return 'default';
    const bounds = geometry.extent;
    if (!bounds) return 'default';
    const filterKey = JSON.stringify(safetyFilters);
    return `${bounds.xmin}_${bounds.ymin}_${bounds.xmax}_${bounds.ymax}_${filterKey}`;
  };

  // Preload specified time scales (exclude current scale)
  const preloadTimeScales = useCallback(async (
    geometry: __esri.Polygon | null,
    safetyFilters: Partial<SafetyFilters>,
    mapViewRef: __esri.MapView | null,
    scalesToPreload: TimeScale[]
  ) => {
    if (!mapViewRef || !geometry || scalesToPreload.length === 0) return;
    try {
      const results = await Promise.all(
        scalesToPreload.map(async (scale) => {
          try {
            const result = await dataService.getAnnualIncidentsComparisonData(mapViewRef, safetyFilters, scale, undefined, geometry);
            return { scale, data: result };
          } catch (err) {
            console.error(`Error preloading ${scale} data:`, err);
            return { scale, data: { categories: [], series: [] } };
          }
        })
      );
      setDataCache(prev => {
        const updated = new Map(prev);
        results.forEach(({ scale, data }) => updated.set(scale, data));
        return updated;
      });
    } catch (err) {
      console.error('Error in preload function:', err);
    }
  }, [dataService]);

  // Fetch data when selection, filters, or time scale change
  useEffect(() => {
    let isCurrent = true;
    const run = async () => {
      const newCacheKey = generateCacheKey(selectedGeometry, filters);

      if (!selectedGeometry || !mapView) {
        if (!isCurrent) return;
        setChartData(null);
        setError(null);
        return;
      }

      // If we have cached data for current scale and same selection, use it
      if (newCacheKey === cacheKey && dataCache.has(timeScale)) {
        if (!isCurrent) return;
        setChartData(dataCache.get(timeScale) || null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch current scale first
        const result = await dataService.getAnnualIncidentsComparisonData(
          mapView,
          filters,
          timeScale,
          undefined,
          selectedGeometry
        );
        if (!isCurrent) return;
        setChartData(result);
        setDataCache(prev => {
          const updated = new Map(prev);
          updated.set(timeScale, result);
          return updated;
        });
        setCacheKey(newCacheKey);

        // Preload the other scales in the background
        const others = timeScales.filter(s => s !== timeScale);
        preloadTimeScales(selectedGeometry, filters, mapView, others);
      } catch (err) {
        if (!isCurrent) return;
        console.error('Error fetching annual incidents data:', err);
        setError('Failed to load annual incidents data');
        setChartData(null);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    run();
    return () => { isCurrent = false; };
  }, [selectedGeometry, mapView, filters, timeScale, cacheKey, dataCache, preloadTimeScales, dataService]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        setHoveredPoint({ 
          value: params.value, 
          name: params.name,
          seriesName: params.seriesName 
        });
      },
      mouseout: () => {
        setHoveredPoint(null);
      },
    }),
    [],
  );

  // Calculate dynamic y-axis range and extract data for chart
  const { categories, chartSeries, yAxisMin, yAxisMax } = useMemo(() => {
    if (!chartData || !chartData.categories || !chartData.series) {
      return { categories: [], chartSeries: [], yAxisMin: 0, yAxisMax: 100 };
    }

    const categories = chartData.categories;
    const chartSeries = chartData.series;
    
    // Calculate dynamic y-axis range
    const allValues = chartSeries.flatMap(series => series.data).filter(v => v !== null && v !== undefined);
    
    // Handle no data case with a reasonable default range
    if (allValues.length === 0) {
      return { categories, chartSeries, yAxisMin: 0, yAxisMax: 10 };
    }
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = Math.max(1, (maxValue - minValue) * 0.1); // 10% padding, minimum 1
    const yAxisMin = Math.max(0, minValue - padding);
    const yAxisMax = maxValue + padding;

    return { categories, chartSeries, yAxisMin, yAxisMax };
  }, [chartData]);

  const option = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      grid: {
        left: '25px',
        right: '0px',
        top: '40px',
        bottom: '0px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
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
          fontSize: 14,
          interval: 'auto',
          rotate: 0
        },
      },
      yAxis: {
        type: 'value',
        min: yAxisMin,
        max: yAxisMax,
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
          fontSize: 14,
          formatter: (value: number) => value.toLocaleString(),
        },
        name: 'Number of Incidents',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 14,
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
      legend: {
        show: chartSeries.length > 0,
        top: 0,
        right: 0,
        textStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        itemWidth: 12,
        itemHeight: 12,
      },
      series: chartSeries.map((series, index) => {
        // Color-blind friendly palette - avoids red-green combinations
        // Uses blue, orange, purple, teal, and brown for better accessibility
        const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#0891b2', '#92400e'];
        const color = colors[index % colors.length];

        if (timeScale === 'Year') {
          // This is a bar chart, so we need to make sure that we're setting the color
          // for each bar individually. We can do this by setting the color in the itemStyle
          // property of the series.
          const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#0891b2', '#92400e'];
          return {
            name: series.name,
            data: series.data,
            type: 'bar',
            stack: 'year',
            itemStyle: {
              color: colors[index % colors.length],
              borderRadius: [4, 4, 0, 0],
            },
            barWidth: '60%',
            emphasis: {
              itemStyle: {
                borderWidth: 2,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
            },
          };
        } else {
          // Line chart for Day/Month views
          return {
            name: series.name,
            data: series.data,
            type: 'line',
            lineStyle: {
              color: color,
              width: 2,
            },
            itemStyle: {
              color: color,
              borderWidth: 2,
            },
            symbol: 'circle',
            symbolSize: 10,
            showSymbol: true,
            showAllSymbol: true,
            emphasis: {
              itemStyle: {
                borderColor: color,
                borderWidth: 3,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
              lineStyle: {
                width: 3,
              },
            },
          };
        }
      }),
      tooltip: {
        show: false,
      },
    }),
    [categories, chartSeries, timeScale, yAxisMin, yAxisMax],
  );

  const getTimeScaleDescription = (scale: TimeScale): string => {
    switch(scale) {
      case 'Day': return 'Total safety incidents by day of week comparison between years';
      case 'Month': return 'Total safety incidents per month comparison between years';
      case 'Year': return 'Total safety incidents per year for selected area';
      default: return 'Total incident trends for selected area';
    }
  };

  return (
    <div id="safety-annual-incidents-comparison" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-annual-incidents-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-annual-incidents-title" className="text-base font-medium text-gray-700">Annual Incidents Comparison</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-annual-incidents-content" className="space-y-2 min-h-[120px]">
          {/* No selection state */}
          {!selectedGeometry && (
            <div id="safety-annual-incidents-no-selection" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
              <div id="safety-annual-incidents-instruction-icon" className="mb-2 text-gray-400">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p id="safety-annual-incidents-instruction-text" className="text-sm text-gray-600 mb-1">
                Select a region on the map
              </p>
              <p id="safety-annual-incidents-instruction-subtext" className="text-xs text-gray-500">
                Use the polygon tool or click on a boundary to see annual incident trends for that area
              </p>
            </div>
          )}

          {/* Data display with loading overlay */}
          {selectedGeometry && (
            <div id="safety-annual-incidents-data-container" className="relative">
              {/* Loading overlay */}
              {isLoading && (
                <div 
                  id="safety-annual-incidents-loading-overlay" 
                  className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                >
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-sm text-gray-700 font-medium">Loading annual trends...</span>
                    <span className="text-xs text-gray-500 mt-1">Querying {selectedGeometry ? 'selected area' : 'default data'}</span>
                  </div>
                </div>
              )}

              {/* Data content */}
              <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
                {chartData && !error && chartData.categories && chartData.categories.length > 0 ? (
            <>
              <div id="safety-annual-incidents-buttons-container" className="flex space-x-1 mt-2">
                {timeScales.map(scale => (
                  <button
                    id={`safety-annual-incidents-button-${scale.toLowerCase()}`}
                    key={scale}
                    onClick={() => setTimeScale(scale)}
                    disabled={isLoading}
                    className={`px-2 py-1 text-[.8rem] font-semibold rounded-md !outline-none !border-none focus:!outline-none focus:!ring-0 focus:!shadow-none hover:!outline-none hover:!border-none active:!outline-none active:!border-none transition-none ${
                      timeScale === scale
                        ? 'bg-blue-500 text-white'
                        : isLoading 
                          ? 'bg-transparent text-gray-400 cursor-not-allowed'
                          : 'bg-transparent text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
              <div id="safety-annual-incidents-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
              <div id="safety-annual-incidents-description" className="w-full text-sm text-gray-600">
                {getTimeScaleDescription(timeScale)}
                <span id="safety-annual-incidents-info-icon-container" className="ml-1 inline-flex align-middle">
                  <MoreInformationIcon 
                    text="Compares safety incident patterns across different time periods. Switch between Day (day of week), Month (monthly patterns), and Year (annual totals) views to identify temporal trends and seasonal variations in incident occurrence."
                    align="right"
                    width="w-80"
                  />
                </span>
              </div>

              <div id="safety-annual-incidents-chart-container" className="relative">
                {hoveredPoint && (
                  <div
                    id="safety-incidents-chart-tooltip"
                    className="absolute top-[1.2rem] left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
                  >
                    {`${hoveredPoint.value.toLocaleString()} incidents in ${hoveredPoint.seriesName} (${hoveredPoint.name})`}
                  </div>
                )}



                <div id="safety-annual-incidents-chart">
                  <ReactECharts
                    option={option}
                    style={{ height: '300px', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    onEvents={onEvents}
                  />
                </div>
              </div>
                  </>
                ) : error ? (
                  <div id="safety-annual-incidents-error" className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[120px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-red-800">
                        <strong>Data Error:</strong> {error}
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Unable to load annual trends data.
                      </div>
                    </div>
                  </div>
                ) : chartData && (!chartData.categories || chartData.categories.length === 0) ? (
                  <div id="safety-annual-incidents-no-data" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
                    <div id="safety-annual-incidents-no-data-icon" className="mb-2 text-gray-400">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p id="safety-annual-incidents-no-data-text" className="text-sm text-gray-600 mb-1">
                      No historical data available
                    </p>
                    <p id="safety-annual-incidents-no-data-subtext" className="text-xs text-gray-500">
                      This area may not have sufficient incident data for year-over-year comparison
                    </p>
                  </div>
                ) : (
                  <div 
                    id="safety-annual-incidents-loading-placeholder" 
                    className="flex justify-center items-center min-h-[120px]"
                  >
                    <div className="text-center">
                      <div className="text-gray-400 text-sm">No data available for selected area</div>
                      <div className="text-gray-300 text-xs mt-1">Try selecting a different area or adjusting filters</div>
                    </div>
                  </div>
                )}


              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 