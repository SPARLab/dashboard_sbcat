'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimeScale, VolumeBreakdownData, VolumeBreakdownDataService } from '../../../../lib/data-services/VolumeBreakdownDataService';
import Tooltip from '../../../components/Tooltip';
import CollapseExpandIcon from './CollapseExpandIcon';
import SelectRegionPlaceholder from '../../../components/SelectRegionPlaceholder';
const timeScales: TimeScale[] = ['Hour', 'Day', 'Weekday vs Weekend', 'Month', 'Year'];

interface HoveredBarData {
  value: number;
  name: string;
}

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface AggregatedVolumeBreakdownProps {
  selectedGeometry?: Polygon | null;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  dateRange?: DateRangeValue;
}

export default function AggregatedVolumeBreakdown({ 
  selectedGeometry = null, 
  showBicyclist = true, 
  showPedestrian = true,
  dateRange,
}: AggregatedVolumeBreakdownProps) {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('Month');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentData, setCurrentData] = useState<VolumeBreakdownData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for preloaded data by time scale
  const [dataCache, setDataCache] = useState<Map<TimeScale, VolumeBreakdownData[]>>(new Map());
  const [cacheKey, setCacheKey] = useState<string>('');
  const [isPreloading, setIsPreloading] = useState(false);
  const requestIdRef = useRef(0);
  const preloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the date range to prevent rapid refetches while sliding
  const [debouncedDateRange, setDebouncedDateRange] = useState<DateRangeValue | undefined>(dateRange);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (dateRange) {
      console.debug('[AggregatedVolumeBreakdown] Debounce schedule for dateRange', {
        start: dateRange.startDate?.toISOString(),
        end: dateRange.endDate?.toISOString(),
      });
      timer = setTimeout(() => {
        setDebouncedDateRange(dateRange);
        console.debug('[AggregatedVolumeBreakdown] Debounce commit for dateRange', {
          start: dateRange.startDate?.toISOString(),
          end: dateRange.endDate?.toISOString(),
        });
      }, 350);
    } else {
      setDebouncedDateRange(undefined);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
        console.debug('[AggregatedVolumeBreakdown] Debounce cancelled for dateRange');
      }
    };
  }, [dateRange?.startDate?.getTime?.(), dateRange?.endDate?.getTime?.()]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Generate cache key based on selection and filters
  const generateCacheKey = (
    geometry: Polygon | null,
    bike: boolean,
    ped: boolean,
    range?: DateRangeValue
  ): string => {
    if (!geometry) return 'default';
    const bounds = geometry.extent;
    if (!bounds) return 'default';
    const rangeKey = range?.startDate && range?.endDate
      ? `${range.startDate.getTime()}_${range.endDate.getTime()}`
      : 'no-range';
    return `${bounds.xmin}_${bounds.ymin}_${bounds.xmax}_${bounds.ymax}_${bike}_${ped}_${rangeKey}`;
  };

  // Preload all time scales for current selection
  const preloadAllTimeScales = useCallback(async (geometry: Polygon | null, bike: boolean, ped: boolean, range?: DateRangeValue) => {
    const newCacheKey = generateCacheKey(geometry, bike, ped, range);
    const newCache = new Map<TimeScale, VolumeBreakdownData[]>();

    setIsPreloading(true);
    
    try {
      // Ensure date range is honored for all preload requests
      VolumeBreakdownDataService.setDateRange(range);
      // Load all time scales in parallel
      const loadPromises = timeScales.map(async (scale) => {
        try {
          if (geometry) {
            const preId = ++requestIdRef.current;
            console.debug('[AggregatedVolumeBreakdown] Preload query id', preId, 'for scale', scale, {
              bike,
              ped,
              start: range?.startDate?.toISOString(),
              end: range?.endDate?.toISOString(),
            });
            const result = await VolumeBreakdownDataService.queryVolumeBreakdown(
              geometry, scale, bike, ped
            );
            return { scale, data: result.error ? VolumeBreakdownDataService.getDefaultData(scale) : result.data };
          } else {
            return { scale, data: VolumeBreakdownDataService.getDefaultData(scale) };
          }
        } catch (err) {
          console.error(`Error preloading ${scale} data:`, err);
          return { scale, data: VolumeBreakdownDataService.getDefaultData(scale) };
        }
      });

      const results = await Promise.all(loadPromises);
      results.forEach(({ scale, data }) => {
        newCache.set(scale, data);
      });

      setDataCache(newCache);
      setCacheKey(newCacheKey);
      return newCache;
    } finally {
      setIsPreloading(false);
    }
  }, []);

  // Preload all time scales EXCEPT the active one, after a short idle period
  const schedulePreloadOtherScales = useCallback((geometry: Polygon, bike: boolean, ped: boolean, range: DateRangeValue | undefined, active: TimeScale) => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
      console.debug('[AggregatedVolumeBreakdown] Cancelled pending background preload');
    }
    preloadTimerRef.current = setTimeout(async () => {
      try {
        setIsPreloading(true);
        VolumeBreakdownDataService.setDateRange(range);
        const otherScales = timeScales.filter(s => s !== active);
        console.debug('[AggregatedVolumeBreakdown] Background preloading other scales:', otherScales);
        const loadPromises = otherScales.map(async (scale) => {
          try {
            const res = await VolumeBreakdownDataService.queryVolumeBreakdown(geometry, scale, bike, ped);
            return { scale, data: res.error ? VolumeBreakdownDataService.getDefaultData(scale) : res.data };
          } catch (e) {
            console.error('Preload error for scale', scale, e);
            return { scale, data: VolumeBreakdownDataService.getDefaultData(scale) };
          }
        });
        const results = await Promise.all(loadPromises);
        setDataCache(prev => {
          const updated = new Map(prev);
          results.forEach(({ scale, data }) => updated.set(scale, data));
          return updated;
        });
      } finally {
        setIsPreloading(false);
      }
    }, 600);
  }, [timeScales]);

  // Fetch data when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      // If no geometry, clear data and skip any fetching
      if (!selectedGeometry) {
        setCurrentData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const newCacheKey = generateCacheKey(selectedGeometry, showBicyclist, showPedestrian, debouncedDateRange);
      
      // Check if we have cached data for this selection
      if (newCacheKey === cacheKey && dataCache.has(timeScale)) {
        // Use cached data immediately
        setCurrentData(dataCache.get(timeScale) || []);
        setError(null);
        return;
      }

      // Show loading and fetch new data
      setIsLoading(true);
      setError(null);

      try {
        if (newCacheKey !== cacheKey) {
          // Selection or filters changed - fetch only the active time scale first
          VolumeBreakdownDataService.setDateRange(debouncedDateRange);
          const myRequestId = ++requestIdRef.current;
          console.debug('[AggregatedVolumeBreakdown] Executing fetch id', myRequestId, 'for scale', timeScale, {
            bike: showBicyclist,
            ped: showPedestrian,
            start: debouncedDateRange?.startDate?.toISOString(),
            end: debouncedDateRange?.endDate?.toISOString(),
          });
          const result = await VolumeBreakdownDataService.queryVolumeBreakdown(
            selectedGeometry,
            timeScale,
            showBicyclist,
            showPedestrian
          );
          const data = result.error ? VolumeBreakdownDataService.getDefaultData(timeScale) : result.data;
          setCurrentData(data);
          setDataCache(prev => {
            const updated = new Map(prev);
            updated.set(timeScale, data);
            return updated;
          });
          setCacheKey(newCacheKey);
          console.debug('[AggregatedVolumeBreakdown] Fetch id', myRequestId, 'data committed. Points:', data.length);
          // Schedule background preload of other time scales
          schedulePreloadOtherScales(selectedGeometry, showBicyclist, showPedestrian, debouncedDateRange, timeScale);
        } else {
          // Just time scale changed - load single scale
          // Update global date range on the service so queries are filtered
          VolumeBreakdownDataService.setDateRange(debouncedDateRange);
          const myRequestId = ++requestIdRef.current;
          console.debug('[AggregatedVolumeBreakdown] Executing fetch id', myRequestId, 'for scale', timeScale, {
            bike: showBicyclist,
            ped: showPedestrian,
            start: debouncedDateRange?.startDate?.toISOString(),
            end: debouncedDateRange?.endDate?.toISOString(),
          });
          const result = await VolumeBreakdownDataService.queryVolumeBreakdown(
            selectedGeometry,
            timeScale,
            showBicyclist,
            showPedestrian
          );
          const data = result.error ? VolumeBreakdownDataService.getDefaultData(timeScale) : result.data;
          setCurrentData(data);
          console.debug('[AggregatedVolumeBreakdown] Fetch id', myRequestId, 'data committed. Points:', data.length);
          
          // Update cache
          const updatedCache = new Map(dataCache);
          updatedCache.set(timeScale, data);
          setDataCache(updatedCache);
          
          if (result.error) setError(result.error);
        }
      } catch (err) {
        console.error('Error fetching volume breakdown data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setCurrentData(VolumeBreakdownDataService.getDefaultData(timeScale));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedGeometry, timeScale, showBicyclist, showPedestrian, cacheKey, dataCache, preloadAllTimeScales, debouncedDateRange?.startDate?.getTime?.(), debouncedDateRange?.endDate?.getTime?.(), schedulePreloadOtherScales]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: { value: number; name: string }) => {
        setHoveredBar({ value: params.value, name: params.name });
      },
      mouseout: () => {
        setHoveredBar(null);
      },
    }),
    [],
  );

  // Format large numbers for y-axis (e.g., 60000 → 60K)
  const formatYAxisNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Get dynamic y-axis label based on time scale
  const getYAxisLabel = (scale: TimeScale): string => {
    switch (scale) {
      case 'Hour':
        return 'Avg Hourly Traffic';
      default:
        return 'Avg Daily Traffic';
    }
  };

  // Format hour names for display (e.g., "5" -> "5 a.m.")
  const formatHourName = (hourName: string): string => {
    const hour = parseInt(hourName);
    if (isNaN(hour)) return hourName;
    
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Get detailed calculation explanation for tooltips
  const getCalculationExplanation = (scale: TimeScale): string => {
    switch (scale) {
      case 'Hour':
        return 'Averages hourly counts across all sites. Shows typical traffic by hour.';
      
      case 'Day':
        return 'Sums hourly counts to daily totals, then averages by day of week.';
      
      case 'Weekday vs Weekend':
        return 'Daily totals averaged by Weekday (Mon-Fri) vs Weekend (Sat-Sun).';
      
      case 'Month':
        return 'Sums hourly counts to daily totals, then averages by month.';
      
      case 'Year':
        return 'Sums hourly counts to daily totals, then averages by year.';
      
      default:
        return 'Calculation varies by time scale.';
    }
  };

  const option = useMemo(
    () => ({
      grid: {
        left: '60px',
        right: '20px',
        top: '20px',
        bottom: '40px',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: currentData.map(item => timeScale === 'Hour' ? formatHourName(item.name) : item.name),
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
          interval: timeScale === 'Hour' ? 3 : 'auto',
          rotate: 0
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
          formatter: formatYAxisNumber,
          margin: 8,
        },
        name: getYAxisLabel(timeScale),
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
          data: currentData.map((item) => ({
            value: item.value,
            itemStyle: {
              color: '#3b82f6',
              borderRadius: [4, 4, 0, 0], 
            },
          })),
          type: 'bar',
          barWidth: '60%',
          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6',
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
    }),
    [currentData, timeScale],
  );

  // Memoize the chart component - always call hooks at the top level
  const chartComponent = useMemo(
    () => (
      <div id="aggregated-volume-breakdown-chart">
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
    <div id="aggregated-volume-breakdown-container" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="aggregated-volume-breakdown-header" className="flex justify-between items-center">
        <h3 id="aggregated-volume-breakdown-title" className="text-lg font-medium text-gray-900">Aggregated Volume Breakdowns</h3>
        <CollapseExpandIcon id="aggregated-volume-breakdown-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="aggregated-volume-breakdown-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        {!selectedGeometry && (
          <SelectRegionPlaceholder id="aggregated-volume-breakdown-no-selection" subtext="Use the polygon tool or click on a boundary to see volume breakdowns for that area" />
        )}
        {selectedGeometry && (
        <>
        <div id="aggregated-volume-breakdown-buttons-container" className="flex space-x-1 mt-2">
          {timeScales.map(scale => (
            <button
              id={`aggregated-volume-breakdown-button-${scale.toLowerCase().replace(/\s/g, '-')}`}
              key={scale}
              onClick={() => setTimeScale(scale)}
              disabled={isLoading}
              // We have to use !outline-none !border-none because Google Chrome does not respect the outline-none class on a hover or click
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

        
        {error && (
          <div id="aggregated-volume-breakdown-error" className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
            <div className="text-sm text-red-800">
              <strong>Data Error:</strong> {error}
            </div>
            <div className="text-xs text-red-600 mt-1">
              Showing default data instead.
            </div>
          </div>
        )}
        <div id="aggregated-volume-breakdown-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
        <div id="aggregated-volume-breakdown-description" className="w-full text-sm text-gray-600">
          {timeScale === 'Hour' 
            ? `Average hourly traffic patterns across selected sites` 
            : `Average daily traffic aggregated by ${timeScale.toLowerCase()} across selected sites`}
          <span id="aggregated-volume-breakdown-info-icon-container" className="ml-1 inline-flex align-middle">
            <Tooltip text={getCalculationExplanation(timeScale)} align="right" />
          </span>
        </div>

        <div id="aggregated-volume-breakdown-chart-container" className="relative mt-1">
          {hoveredBar && !isLoading && (
            <div
              id="volume-chart-tooltip"
              className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
            >
              {`${hoveredBar.value.toLocaleString()} Pedestrians & Bicyclists (${timeScale === 'Hour' ? formatHourName(hoveredBar.name) : hoveredBar.name})`}
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div 
              id="aggregated-volume-breakdown-loading-overlay" 
              className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
            >
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                <span className="text-sm text-gray-700 font-medium">Loading {timeScale.toLowerCase()} data...</span>
                <span className="text-xs text-gray-500 mt-1">Querying {selectedGeometry ? 'selected area' : 'default data'}</span>
              </div>
            </div>
          )}

          {/* Background preloading indicator */}
          {isPreloading && !isLoading && (
            <div 
              id="aggregated-volume-breakdown-preload-indicator" 
              className="absolute top-2 right-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full flex items-center z-10"
            >
              <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-1"></div>
              Loading...
            </div>
          )}

          {currentData.length > 0 ? (
            <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
              {chartComponent}
            </div>
          ) : (
            <div 
              id="aggregated-volume-breakdown-no-data" 
              className="flex justify-center items-center"
              style={{ height: '300px', width: '100%' }}
            >
              <div className="text-center">
                <div className="text-gray-400 text-sm">No data available for selected area</div>
                <div className="text-gray-300 text-xs mt-1">Try selecting a different area or time scale</div>
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