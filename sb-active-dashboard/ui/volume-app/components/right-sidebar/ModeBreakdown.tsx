'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useState } from 'react';
import { VolumeChartDataService } from '../../../../lib/data-services/VolumeChartDataService';
import CollapseExpandIcon from './CollapseExpandIcon';

interface ModeBreakdownData {
  bicycle: { count: number; percentage: number };
  pedestrian: { count: number; percentage: number };
  ebike?: { count: number; percentage: number };
  total: number;
}

interface HoveredBarData {
  value: number;
  name: string;
}

interface ModeBreakdownProps {
  selectedGeometry?: Polygon | null;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  volumeChartDataService?: VolumeChartDataService;
  mapView?: __esri.MapView;
  filters?: Record<string, unknown>;
}

export default function ModeBreakdown({ 
  selectedGeometry = null,
  showBicyclist = true,
  showPedestrian = true,
  volumeChartDataService,
  mapView,
  filters = {}
}: ModeBreakdownProps) {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentData, setCurrentData] = useState<ModeBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for data
  const [dataCache, setDataCache] = useState<Map<string, ModeBreakdownData>>(new Map());

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

  // Load data when selection or filters change
  useEffect(() => {
    const newCacheKey = generateCacheKey(selectedGeometry, showBicyclist, showPedestrian);

    // Check cache first
    if (dataCache.has(newCacheKey)) {
      setCurrentData(dataCache.get(newCacheKey)!);
      setError(null);
      return;
    }

    // Load new data
    const loadData = async () => {
      if (!volumeChartDataService || !mapView) {
        setError('Required services not available');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await volumeChartDataService.getModeBreakdownData(
          mapView,
          filters,
          selectedGeometry
        );

        setCurrentData(data);
        
        // Cache the result
        setDataCache(prev => new Map(prev).set(newCacheKey, data));
      } catch (err) {
        console.error('Error loading mode breakdown data:', err);
        setError('Failed to load mode breakdown data');
        setCurrentData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedGeometry, showBicyclist, showPedestrian, volumeChartDataService, mapView, filters, dataCache]);

  // Prepare chart data from currentData
  const modeData = useMemo(() => {
    if (!currentData || !selectedGeometry) {
      // Return empty array when no selection is made or data is unavailable
      // This prevents showing dummy data
      return [];
    }

    const chartData = [];
    
    if (showBicyclist) {
      chartData.push({
        name: 'Bikes',
        value: currentData.bicycle.percentage,
        color: '#c1d8ff'
      });
    }
    
    if (showPedestrian) {
      chartData.push({
        name: 'Pedestrians',
        value: currentData.pedestrian.percentage,
        color: '#c3c3c3'
      });
    }

    // Add e-bikes support - check if ebike data exists in currentData
    if (currentData.ebike && currentData.ebike.percentage > 0) {
      chartData.push({
        name: 'E-bikes',
        value: currentData.ebike.percentage,
        color: '#0061ff'
      });
    }

    return chartData;
  }, [currentData, selectedGeometry, showBicyclist, showPedestrian]);

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

  const option = useMemo(
    () => {
      // Handle empty data case
      if (modeData.length === 0) {
        return {
          grid: { left: '3px', right: '0px', top: '10px', bottom: '0px', containLabel: true },
          xAxis: { type: 'category', data: [] },
          yAxis: { type: 'value', min: 0, max: 100 },
          series: [{ data: [], type: 'bar' }]
        };
      }

      const maxValue = Math.max(...modeData.map(item => item.value), 100);
      const yAxisMax = Math.ceil(maxValue / 10) * 10; // Round up to nearest 10

      return {
        grid: {
          left: '3px',
          right: '0px',
          top: '10px',
          bottom: '0px',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: modeData.map(item => item.name),
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
            interval: 0,
            rotate: 0,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: yAxisMax,
          interval: yAxisMax / 4,
          axisLine: {
            show: true,
            lineStyle: {
              color: '#9ca3af',
              width: 1,
            },
          },
          axisTick: {
            show: true,
            length: 6,
            lineStyle: {
              color: '#9ca3af',
              width: 1,
            },
          },
          axisLabel: {
            color: '#6b7280',
            fontSize: 14,
            formatter: (value: number) => `${value}%`,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#e5e7eb',
              width: 1,
              type: 'solid',
            },
          },
        },
        series: [
          {
            data: modeData.map((item) => ({
              value: item.value,
              itemStyle: {
                color: item.color,
                borderRadius: [3, 3, 0, 0],
              },
            })),
            type: 'bar',
            barWidth: 50,
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
      };
    },
    [modeData],
  );

  // Chart component - moved outside conditional to avoid hook violations
  const chartComponent = useMemo(
    () => (
      <div id="mode-breakdown-chart" className="bg-white">
        <ReactECharts
          option={option}
          style={{ width: '100%', height: '200px' }}
          opts={{ renderer: 'canvas' }}
          onEvents={onEvents}
        />
      </div>
    ),
    [option, onEvents],
  );

  return (
    <div id="mode-breakdown-container" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="mode-breakdown-header" className="flex justify-between items-center">
        <h3 id="mode-breakdown-title" className="text-lg font-medium text-gray-700">Mode Breakdown</h3>
        <CollapseExpandIcon id="mode-breakdown-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="mode-breakdown-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[400px]'}`}>
        <div id="mode-breakdown-chart-container" className="relative mt-4">
          {/* Loading State */}
          {isLoading && (
            <div id="mode-breakdown-loading" className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div id="mode-breakdown-error" className="flex flex-col items-center justify-center h-32 text-gray-500">
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1">Please try selecting an area on the map</p>
            </div>
          )}

          {/* No Selection State */}
          {!selectedGeometry && !isLoading && !error && (
            <div id="mode-breakdown-no-selection" className="flex flex-col items-center justify-center h-32 text-gray-500">
              <p className="text-sm">No area selected</p>
              <p className="text-xs mt-1">Select an area on the map to view mode breakdown</p>
            </div>
          )}

          {/* No Data Available State */}
          {selectedGeometry && !isLoading && !error && currentData && (currentData.total === 0 || modeData.length === 0) && (
            <div id="mode-breakdown-no-data" className="flex flex-col items-center justify-center h-32 text-gray-500">
              <p className="text-sm">No data available for current view</p>
              <p className="text-xs mt-1">Try selecting a different area with count sites</p>
            </div>
          )}

          {/* Chart with Data */}
          {!isLoading && !error && currentData && selectedGeometry && modeData.length > 0 && currentData.total > 0 && (
            <>
              {hoveredBar && (
                <div
                  id="mode-breakdown-tooltip"
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap"
                  style={{ color: '#3b82f6' }}
                >
                  {`${hoveredBar.value.toFixed(1)}% ${hoveredBar.name}`}
                </div>
              )}

              {chartComponent}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 