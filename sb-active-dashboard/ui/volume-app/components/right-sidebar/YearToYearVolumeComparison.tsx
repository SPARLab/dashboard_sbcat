'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimeScale, YearToYearComparisonDataService, MultiYearComparisonResult, NormalizationMode } from '../../../../lib/data-services/YearToYearComparisonDataService';
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
  dateRange: { startDate: Date; endDate: Date };
}

export default function YearToYearVolumeComparison({
  selectedGeometry = null,
  showBicyclist = true,
  showPedestrian = true,
  dateRange
}: YearToYearVolumeComparisonProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointData | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('Month');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chartData, setChartData] = useState<MultiYearComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [normalization, setNormalization] = useState<NormalizationMode>('none');
  const [scaleHourlyToDaily, setScaleHourlyToDaily] = useState<boolean>(true);
  
  // Cache for background loaded data by time scale
  const [dataCache, setDataCache] = useState<Map<TimeScale, MultiYearComparisonResult>>(new Map());
  const [cacheKey, setCacheKey] = useState<string>('');
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Derive years from dateRange
  const includedYears = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return [];
    
    const startYear = dateRange.startDate.getFullYear();
    const endYear = dateRange.endDate.getFullYear();
    const allYears = [];
    
    for (let year = startYear; year <= endYear; year++) {
      allYears.push(year);
    }
    
    return allYears;
  }, [dateRange]);

  // Generate cache key based on selection and filters
  const generateCacheKey = (geometry: Polygon | null, bike: boolean, ped: boolean, range: { startDate: Date; endDate: Date }, years: number[], normKey: string): string => {
    if (!geometry) return 'default';
    const bounds = geometry.extent;
    if (!bounds) return 'default';
    return `${bounds.xmin}_${bounds.ymin}_${bounds.xmax}_${bounds.ymax}_${bike}_${ped}_${range.startDate.toISOString()}_${range.endDate.toISOString()}_${years.join(',')}_${normKey}`;
  };

  // Background load all time scales for current selection
  const backgroundLoadAllTimeScales = useCallback(async (geometry: Polygon | null, bike: boolean, ped: boolean, range: { startDate: Date; endDate: Date }, years: number[]) => {
    const scaleFlag = (timeScale !== 'Hour') && scaleHourlyToDaily;
    const newCacheKey = generateCacheKey(geometry, bike, ped, range, years, normalization + '_' + (scaleFlag ? 'daily' : 'hourly'));
    const newCache = new Map<TimeScale, MultiYearComparisonResult>();

    setIsBackgroundLoading(true);
    
    try {
      // Load all time scales in parallel
      const loadPromises = timeScales.map(async (scale) => {
        try {
          if (geometry && years.length > 0) {
            const result = await YearToYearComparisonDataService.queryMultiYearComparison(
              geometry, scale, years, bike, ped, { start: range.startDate, end: range.endDate }, normalization, (scale !== 'Hour') && scaleHourlyToDaily
            );
            return { scale, data: result };
          } else {
            return { scale, data: { categories: [], series: [], totalsByYear: {} } };
          }
        } catch (err) {
          console.error(`Error loading ${scale} data:`, err);
          return { scale, data: { categories: [], series: [], totalsByYear: {} } };
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
      setIsBackgroundLoading(false);
    }
  }, [normalization, scaleHourlyToDaily]);

  // Fetch data when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      // If no geometry, clear and skip fetching
      if (!selectedGeometry || includedYears.length === 0) {
        setChartData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const computedScale = (timeScale !== 'Hour') && scaleHourlyToDaily;
      const newCacheKey = generateCacheKey(selectedGeometry, showBicyclist, showPedestrian, dateRange, includedYears, normalization + '_' + (computedScale ? 'daily' : 'hourly'));
      
      // Check if we have cached data for this selection
      if (newCacheKey === cacheKey && dataCache.has(timeScale)) {
        // Use cached data immediately
        setChartData(dataCache.get(timeScale) || null);
        setError(null);
        return;
      }

      // Show loading and fetch new data
      setIsLoading(true);
      setError(null);

      try {
        if (newCacheKey !== cacheKey) {
          // Selection changed - background load all time scales
          const newCache = await backgroundLoadAllTimeScales(selectedGeometry, showBicyclist, showPedestrian, dateRange, includedYears);
          setChartData(newCache.get(timeScale) || null);
        } else {
          // Just time scale changed - load single scale
          const result = await YearToYearComparisonDataService.queryMultiYearComparison(
            selectedGeometry, timeScale, includedYears, showBicyclist, showPedestrian, { start: dateRange.startDate, end: dateRange.endDate }, normalization, computedScale
          );
          setChartData(result);
          
          // Update cache
          const updatedCache = new Map(dataCache);
          updatedCache.set(timeScale, result);
          setDataCache(updatedCache);
        }
      } catch (err) {
        console.error('Error fetching year-to-year comparison data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedGeometry, timeScale, showBicyclist, showPedestrian, dateRange, includedYears, cacheKey, dataCache, backgroundLoadAllTimeScales, normalization, scaleHourlyToDaily]);

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

  // Convert year to two-digit format
  const formatYearToTwoDigit = (year: string | number): string => {
    const yearStr = year.toString();
    if (/^\d{4}$/.test(yearStr)) {
      return `'${yearStr.slice(2)}`;
    }
    return yearStr;
  };

  // Calculate dynamic y-axis range and prepare chart data
  const { categories, chartSeries, yAxisMin, yAxisMax, isYearView } = useMemo(() => {
    if (!chartData || !chartData.categories || !chartData.series) {
      return { categories: [], chartSeries: [], yAxisMin: 0, yAxisMax: 100, isYearView: false };
    }

    const isYearView = timeScale === 'Year';
    let categories = chartData.categories;
    let chartSeries = chartData.series;

    // For Year view, format categories to two-digit and create single bar series
    if (isYearView) {
      // For Year scale, categories are the years and each series contains data for that year
      // We want one bar per year, so we extract the value for each year from its corresponding series
      const yearColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];
      
      // Build data by taking each series' value for its own year category
      const yearDataNumbers = chartData.series.map((series) => {
        const year = series.name;
        const yearIndex = chartData.categories.indexOf(year);
        const value = yearIndex >= 0 ? series.data[yearIndex] || 0 : 0;
        return value;
      });
      
      categories = chartData.series.map(series => formatYearToTwoDigit(series.name));
      chartSeries = [{
        name: 'Years',
        data: yearDataNumbers,
        type: 'bar'
      } as any];
    } else {
      // Format hour categories for display
      if (timeScale === 'Hour') {
        categories = chartData.categories.map(formatHourName);
      }
      
      // Format series names to two-digit years and assign colors
      const yearColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];
      chartSeries = chartData.series.map((series, index) => ({
        name: formatYearToTwoDigit(series.name),
        data: series.data,
        color: yearColors[index % yearColors.length]
      }));
    }
    
    // Calculate dynamic y-axis range
    const allValues = chartSeries.flatMap(series => {
      const data: any[] = (series as any).data || [];
      return Array.isArray(data) ? data.map((item: any) => typeof item === 'object' ? item.value : item) : [];
    }).filter(value => value !== null && value !== undefined && typeof value === 'number');
    
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const padding = (maxValue - minValue) * 0.1; // 10% padding
    const yAxisMin = Math.max(0, minValue - padding);
    const yAxisMax = maxValue + padding;

    return { categories, chartSeries, yAxisMin, yAxisMax, isYearView };
  }, [chartData, timeScale]);

  const option = useMemo(
    () => {
      return ({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      animationDelay: (timeScale === 'Weekday vs Weekend' || isYearView) ? 0 : (idx: number) => idx * 50,
      grid: {
        left: '15px',
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
          formatter: (value: number) => {
            if (value >= 1000) {
              return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
            }
            return value.toString();
          },
        },
        name: 'Average daily volume per site (approx.)',
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
        show: !isYearView && chartSeries.length > 0,
        top: 0,
        right: 0,
        orient: 'horizontal',
        itemGap: 8,
        textStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        itemWidth: 12,
        itemHeight: 12,
        icon: 'rect',
      },
      series: chartSeries.map((series, index) => {
        if (isYearView) {
          return {
            ...series,
            type: 'bar',
            barWidth: '40%',
            emphasis: {
              itemStyle: {
                borderWidth: 2,
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
            },
          };
        } else if (timeScale === 'Weekday vs Weekend') {
          // Dynamic bar width based on number of years - thinner bars for more years
          const dynamicBarWidth = includedYears.length <= 2 ? '50%' : 
                                  includedYears.length <= 4 ? '30%' : 
                                  includedYears.length <= 6 ? '15%' : '8%';
          return {
            ...series,
            type: 'bar',
            barWidth: dynamicBarWidth,
          } as any;
        } else {
          // Line chart for Hour/Day/Month
          return {
            ...series,
            type: 'line',
            color: (series as any).color || '#3b82f6',
            symbol: 'circle',
            symbolSize: 10,
            showSymbol: true,
            showAllSymbol: true,
            emphasis: {
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
    })},
    [timeScale, isYearView, yAxisMin, yAxisMax, chartSeries, categories],
  );

  // Memoize the chart component
  const chartComponent = useMemo(
    () => (
      <div id="year-to-year-volume-comparison-chart">
        <ReactECharts
          key={`chart-${timeScale}-${includedYears.join('-')}`}
          option={option}
          style={{ height: '300px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onEvents={onEvents}
        />
      </div>
    ),
    [option, onEvents, timeScale, includedYears],
  );

  // Get detailed calculation explanation for tooltips
  const getCalculationExplanation = (scale: TimeScale): string => {
    const yearRange = includedYears.length > 1 ? `${includedYears[0]}-${includedYears[includedYears.length - 1]}` : includedYears[0]?.toString() || '';
    
    switch (scale) {
      case 'Hour':
        return `Compares average hourly traffic patterns across ${yearRange}.`;
      
      case 'Day':
        return `Compares average daily traffic by day of week across ${yearRange}.`;
      
      case 'Weekday vs Weekend':
        return `Compares weekday vs weekend traffic patterns across ${yearRange}.`;
      
      case 'Month':
        return `Compares average monthly traffic patterns across ${yearRange}.`;
      
      case 'Year':
        return `Compares total annual traffic volumes for ${yearRange}.`;
      
      default:
        return `Compares traffic patterns across ${yearRange}.`;
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
            ? `Average hourly volumes comparison across ${includedYears.length > 1 ? `${includedYears[0]}-${includedYears[includedYears.length - 1]}` : includedYears[0] || 'selected years'}` 
            : `Average daily volume (per site, approx. ×24) by ${timeScale.toLowerCase()} across ${includedYears.length > 1 ? `${includedYears[0]}-${includedYears[includedYears.length - 1]}` : includedYears[0] || 'selected years'}`}
          <span id="year-to-year-volume-comparison-info-icon-container" className="ml-1 inline-flex align-middle">
            <Tooltip text={getCalculationExplanation(timeScale)} align="right" />
          </span>
          <div id="year-to-year-volume-comparison-normalization" className="inline-flex items-center ml-2 gap-2">
            <label htmlFor="normalization-select" className="text-xs text-gray-500">Normalization</label>
            <select
              id="normalization-select"
              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={normalization}
              onChange={(e) => setNormalization(e.target.value as NormalizationMode)}
            >
              <option value="none">Raw</option>
              <option value="equal-site">Equal-site weighting</option>
            </select>
            <label htmlFor="scale-hourly-toggle" className="text-xs text-gray-500 ml-2">Scale hourly to daily (×24)</label>
            <input
              id="scale-hourly-toggle"
              type="checkbox"
              className="align-middle"
              checked={scaleHourlyToDaily}
              onChange={(e) => setScaleHourlyToDaily(e.target.checked)}
            />
          </div>
          {process.env.NODE_ENV === 'development' && (
            <button
              id="year-to-year-volume-comparison-debug-export"
              onClick={() => {
                if (selectedGeometry && includedYears.length > 0) {
                  // Import the service dynamically to avoid circular dependencies
                  import('../../../../lib/data-services/YearToYearComparisonDataService').then(({ YearToYearComparisonDataService }) => {
                    YearToYearComparisonDataService.exportRawDataForAnalysis(
                      selectedGeometry,
                      includedYears,
                      showBicyclist,
                      showPedestrian
                    );
                  });
                } else {
                  console.warn('Please select an area and ensure years are included before exporting data');
                }
              }}
              className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              title="Export raw data for analysis (Development only)"
            >
              🔍 Debug Export
            </button>
          )}
          {process.env.NODE_ENV === 'development' && (
            <button
              id="year-to-year-volume-comparison-full-export"
              onClick={() => {
                if (selectedGeometry && includedYears.length > 0) {
                  import('../../../../lib/data-services/YearToYearComparisonDataService').then(({ YearToYearComparisonDataService }) => {
                    YearToYearComparisonDataService.exportFullRawCountsData(
                      selectedGeometry,
                      includedYears,
                      false
                    );
                  });
                }
              }}
              className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title="Export all attributes (Development only)"
            >
              ⬇️ Full Export
            </button>
          )}
        </div>

        <div id="year-to-year-volume-comparison-chart-container" className="relative mt-1">
          {hoveredPoint && !isLoading && (
            <div
              id="year-volume-chart-tooltip"
              className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap"
              style={{ color: hoveredPoint.seriesName === formatYearToTwoDigit('2023') ? '#ef4444' : '#3b82f6' }}
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

          {/* Background loading indicator */}
          {isBackgroundLoading && !isLoading && (
            <div 
              id="year-to-year-volume-comparison-background-load-indicator" 
              className="absolute top-2 right-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full flex items-center z-10"
            >
              <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-1"></div>
              Loading...
            </div>
          )}

          {chartData && chartData.categories.length > 0 ? (
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