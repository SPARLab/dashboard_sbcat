'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimeScale, YearToYearComparisonData, YearToYearComparisonDataService } from '../../../../lib/data-services/YearToYearComparisonDataService';
import Tooltip from '../../../components/Tooltip';
import CollapseExpandIcon from './CollapseExpandIcon';
import SelectRegionPlaceholder from '../../../components/SelectRegionPlaceholder';

const timeScales: TimeScale[] = ['Hour', 'Day', 'Weekday vs Weekend', 'Month', 'Year'];

interface HoveredPointData {
  value: number;
  name: string;
  seriesName: string;
}

interface ChartEventParams {
  value: number;
  name: string;
  seriesName: string;
}

interface YearToYearVolumeComparisonProps {
  selectedGeometry?: Polygon | null;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
}

export default function YearToYearVolumeComparison({
  selectedGeometry = null,
  showBicyclist = true,
  showPedestrian = true
}: YearToYearVolumeComparisonProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointData | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('Month');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentData, setCurrentData] = useState<YearToYearComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for preloaded data by time scale
  const [dataCache, setDataCache] = useState<Map<TimeScale, YearToYearComparisonData[]>>(new Map());
  const [cacheKey, setCacheKey] = useState<string>('');
  const [isPreloading, setIsPreloading] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Generate cache key based on selection and filters
  const generateCacheKey = (geometry: Polygon | null, bike: boolean, ped: boolean): string => {
    if (!geometry) return 'default';
    const bounds = geometry.extent;
    if (!bounds) return 'default';
    return `${bounds.xmin}_${bounds.ymin}_${bounds.xmax}_${bounds.ymax}_${bike}_${ped}`;
  };

  // Preload all time scales for current selection
  const preloadAllTimeScales = useCallback(async (geometry: Polygon | null, bike: boolean, ped: boolean) => {
    const newCacheKey = generateCacheKey(geometry, bike, ped);
    const newCache = new Map<TimeScale, YearToYearComparisonData[]>();

    setIsPreloading(true);
    
    try {
      // Load all time scales in parallel
      const loadPromises = timeScales.map(async (scale) => {
        try {
          if (geometry) {
            const result = await YearToYearComparisonDataService.queryYearToYearComparison(
              geometry, scale, bike, ped
            );
            return { scale, data: result.error ? YearToYearComparisonDataService.getDefaultData(scale) : result.data };
          } else {
            return { scale, data: YearToYearComparisonDataService.getDefaultData(scale) };
          }
        } catch (err) {
          console.error(`Error preloading ${scale} data:`, err);
          return { scale, data: YearToYearComparisonDataService.getDefaultData(scale) };
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

  // Fetch data when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      // If no geometry, clear and skip fetching
      if (!selectedGeometry) {
        setCurrentData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const newCacheKey = generateCacheKey(selectedGeometry, showBicyclist, showPedestrian);
      
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
          // Selection changed - preload all time scales
          const newCache = await preloadAllTimeScales(selectedGeometry, showBicyclist, showPedestrian);
          setCurrentData(newCache.get(timeScale) || []);
        } else {
          // Just time scale changed - load single scale
          const result = await YearToYearComparisonDataService.queryYearToYearComparison(
            selectedGeometry, timeScale, showBicyclist, showPedestrian
          );
          const data = result.error ? YearToYearComparisonDataService.getDefaultData(timeScale) : result.data;
          setCurrentData(data);
          
          // Update cache
          const updatedCache = new Map(dataCache);
          updatedCache.set(timeScale, data);
          setDataCache(updatedCache);
          
          if (result.error) setError(result.error);
        }
      } catch (err) {
        console.error('Error fetching year-to-year comparison data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setCurrentData(YearToYearComparisonDataService.getDefaultData(timeScale));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedGeometry, timeScale, showBicyclist, showPedestrian, cacheKey, dataCache, preloadAllTimeScales]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: ChartEventParams) => {
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

  // Format hour names for display (e.g., "5" -> "5 AM")
  const formatHourName = (hourName: string): string => {
    const hour = parseInt(hourName);
    if (isNaN(hour)) return hourName;
    
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Filter out data points where both years have zero values (missing data)
  const filteredData = currentData.filter(item => item.year2023 > 0 || item.year2024 > 0);
  
  // Determine if we should use bar chart or line chart
  const useBarChart = timeScale === 'Weekday vs Weekend' || timeScale === 'Year';
  const isYearView = timeScale === 'Year';
  
  // Extract data for both years - for line charts, use null for missing data to maintain alignment
  const currentData2023 = useBarChart ? 
    filteredData
      .filter(item => item.year2023 > 0)
      .map(item => ({ name: item.name, value: item.year2023 })) :
    filteredData.map(item => ({ name: item.name, value: item.year2023 > 0 ? item.year2023 : null }));
    
  const currentData2024 = useBarChart ?
    filteredData
      .filter(item => item.year2024 > 0)
      .map(item => ({ name: item.name, value: item.year2024 })) :
    filteredData.map(item => ({ name: item.name, value: item.year2024 > 0 ? item.year2024 : null }));
  
  // Calculate dynamic y-axis range (filter out null values)
  const allValues = [...currentData2023.map(item => item.value), ...currentData2024.map(item => item.value)]
    .filter(value => value !== null && value !== undefined);
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const padding = (maxValue - minValue) * 0.1; // 10% padding
  const yAxisMin = Math.max(0, minValue - padding);
  const yAxisMax = maxValue + padding;

  const option = useMemo(
    () => {
      const categories = isYearView ? ['2023', '2024'] : filteredData.map(item => timeScale === 'Hour' ? formatHourName(item.name) : item.name);
      
      return ({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      animationDelay: useBarChart ? 0 : (idx: number) => idx * 50,
      grid: {
        left: '5px',
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
          interval: timeScale === 'Hour' ? 3 : 'auto',
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
        name: 'Adjusted Average Daily Volume',
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
        show: !isYearView,
        top: 0,
        right: 0,
        textStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        itemWidth: 12,
        itemHeight: 12,
        data: [
          {
            name: '2023',
            itemStyle: { color: '#ef4444' }
          },
          {
            name: '2024', 
            itemStyle: { color: '#3b82f6' }
          }
        ]
      },
      series: useBarChart ? (isYearView ? [
        {
          name: 'Years',
          data: [
            {
              value: currentData2023[0]?.value || 0,
              itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }
            },
            {
              value: currentData2024[0]?.value || 0,
              itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] }
            }
          ],
          type: 'bar',
          barWidth: '40%',
          emphasis: {
            itemStyle: {
              borderWidth: 2,
              shadowBlur: 0,
              shadowColor: 'transparent',
            },
          },
        },
      ] : [
        {
          name: '2023',
          data: currentData2023.map(item => item.value),
          type: 'bar',
          itemStyle: {
            color: '#ef4444',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '30%',
          emphasis: {
            itemStyle: {
              borderColor: '#ef4444',
              borderWidth: 2,
              shadowBlur: 0,
              shadowColor: 'transparent',
            },
          },
        },
        {
          name: '2024',
          data: currentData2024.map(item => item.value),
          type: 'bar',
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '30%',
          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6',
              borderWidth: 2,
              shadowBlur: 0,
              shadowColor: 'transparent',
            },
          },
        },
      ]) : [
        {
          name: '2023',
          data: currentData2023.map(item => item.value),
          type: 'line',
          lineStyle: {
            color: '#ef4444',
            width: 2,
          },
          itemStyle: {
            color: '#ef4444',
            borderWidth: 2,
          },
          symbol: 'circle',
          symbolSize: 10,
          showSymbol: true,
          showAllSymbol: true,
          emphasis: {
            itemStyle: {
              borderColor: '#ef4444',
              borderWidth: 3,
              shadowBlur: 0,
              shadowColor: 'transparent',
            },
            lineStyle: {
              width: 3,
            },
          },
        },
        {
          name: '2024',
          data: currentData2024.map(item => item.value),
          type: 'line',
          lineStyle: {
            color: '#3b82f6',
            width: 2,
          },
          itemStyle: {
            color: '#3b82f6',
            borderWidth: 2,
          },
          symbol: 'circle',
          symbolSize: 10,
          showSymbol: true,
          showAllSymbol: true,
          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6',
              borderWidth: 3,
              shadowBlur: 0,
              shadowColor: 'transparent',
            },
            lineStyle: {
              width: 3,
            },
          },
        },
      ],
      tooltip: {
        show: false,
      },
    })},
    [timeScale, useBarChart, isYearView, yAxisMin, yAxisMax, currentData2023, currentData2024, filteredData],
  );

  // Memoize the chart component - always call hooks at the top level
  const chartComponent = useMemo(
    () => (
      <div id="year-to-year-volume-comparison-chart">
        <ReactECharts
          key={`chart-${timeScale}`} // Force re-initialization when timeScale changes
          option={option}
          style={{ height: '300px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onEvents={onEvents}
        />
      </div>
    ),
    [option, onEvents, timeScale],
  );

  // Get detailed calculation explanation for tooltips
  const getCalculationExplanation = (scale: TimeScale): string => {
    switch (scale) {
      case 'Hour':
        return 'Compares average hourly traffic patterns between 2023 and 2024.';
      
      case 'Day':
        return 'Compares average daily traffic by day of week between 2023 and 2024.';
      
      case 'Weekday vs Weekend':
        return 'Compares weekday vs weekend traffic patterns between 2023 and 2024.';
      
      case 'Month':
        return 'Compares average monthly traffic patterns between 2023 and 2024.';
      
      case 'Year':
        return 'Compares total annual traffic volumes between 2023 and 2024.';
      
      default:
        return 'Compares traffic patterns between 2023 and 2024.';
    }
  };

  return (
    <div id="year-to-year-volume-comparison-container" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="year-to-year-volume-comparison-header" className="flex justify-between items-center">
        <h3 id="year-to-year-volume-comparison-title" className="text-lg font-medium text-gray-900">Year to Year Volume Comparison</h3>
        <CollapseExpandIcon id="year-to-year-volume-comparison-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="year-to-year-volume-comparison-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        {!selectedGeometry && (
          <SelectRegionPlaceholder id="year-to-year-volume-comparison-no-selection" subtext="Use the polygon tool or click on a boundary to see the year-to-year comparison for that area" />
        )}
        {selectedGeometry && (
        <>
        <div id="year-to-year-volume-comparison-buttons-container" className="flex space-x-1 mt-2">
          {timeScales.map(scale => (
            <button
              id={`year-to-year-volume-comparison-button-${scale.toLowerCase().replace(/\s/g, '-')}`}
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

        {error && (
          <div id="year-to-year-volume-comparison-error" className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
            <div className="text-sm text-red-800">
              <strong>Data Error:</strong> {error}
            </div>
            <div className="text-xs text-red-600 mt-1">
              Showing default data instead.
            </div>
          </div>
        )}
        <div id="year-to-year-volume-comparison-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
        <div id="year-to-year-volume-comparison-description" className="w-full text-sm text-gray-600">
          {timeScale === 'Hour' 
            ? `Average hourly traffic comparison between 2023 and 2024` 
            : `Average daily traffic comparison by ${timeScale.toLowerCase()} between 2023 and 2024`}
          <span id="year-to-year-volume-comparison-info-icon-container" className="ml-1 inline-flex align-middle">
            <Tooltip text={getCalculationExplanation(timeScale)} align="right" />
          </span>
        </div>

        <div id="year-to-year-volume-comparison-chart-container" className="relative mt-1">
          {hoveredPoint && !isLoading && (
            <div
              id="year-volume-chart-tooltip"
              className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap"
              style={{ color: hoveredPoint.seriesName === '2023' ? '#ef4444' : '#3b82f6' }}
            >
              {`${hoveredPoint.value.toLocaleString()} Pedestrians & Bicyclists${hoveredPoint.name ? ` (${timeScale === 'Hour' ? formatHourName(hoveredPoint.name) : hoveredPoint.name})` : ''}`}
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div 
              id="year-to-year-volume-comparison-loading-overlay" 
              className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
            >
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                <span className="text-sm text-gray-700 font-medium">Loading {timeScale.toLowerCase()} comparison...</span>
                <span className="text-xs text-gray-500 mt-1">Querying {selectedGeometry ? 'selected area' : 'default data'}</span>
              </div>
            </div>
          )}

          {/* Background preloading indicator */}
          {isPreloading && !isLoading && (
            <div 
              id="year-to-year-volume-comparison-preload-indicator" 
              className="absolute top-2 right-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full flex items-center z-10"
            >
              <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-1"></div>
              Preloading...
            </div>
          )}

          {currentData.length > 0 ? (
            <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
              {chartComponent}
            </div>
          ) : (
            <div 
              id="year-to-year-volume-comparison-no-data" 
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