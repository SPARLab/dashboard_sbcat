'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useState } from 'react';
import { ModeledVolumeChartDataService } from '../../../../lib/data-services/ModeledVolumeChartDataService';
import { getVolumeLevelColorArray } from '../../../theme/volumeLevelColors';

interface ChartEventParams {
  value: number;
  name?: string;
  seriesName?: string;
}

interface PercentOfNetworkByVolumeLevelBarChartProps {
  dataType: string;
  horizontalMargins: string;
  mapView?: __esri.MapView;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  modelCountsBy?: string;
  year?: number;
  selectedGeometry?: Polygon | null;
}

interface HoveredBarData {
  value: number;
}

export default function PercentOfNetworkByVolumeLevelBarChart({ 
  dataType, 
  horizontalMargins, 
  mapView,
  showBicyclist = true,
  showPedestrian = true,
  modelCountsBy = 'cost-benefit',
  year = 2023,
  selectedGeometry
}: PercentOfNetworkByVolumeLevelBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGeometry || dataType !== 'modeled-data' || !mapView || (modelCountsBy !== 'cost-benefit' && modelCountsBy !== 'strava-bias') || (!showBicyclist && !showPedestrian)) {
      setChartData([]);
      setIsLoading(false);
      return;
    }

    const fetchTrafficLevelData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const modeledService = new ModeledVolumeChartDataService();
        const trafficData = await modeledService.getTrafficLevelBreakdownData(mapView, {
          dataSource: 'dillon',
          countTypes: [
            ...(showBicyclist ? ['bike' as const] : []),
            ...(showPedestrian ? ['ped' as const] : [])
          ],
          dateRange: { start: new Date(year, 0, 1), end: new Date(year, 11, 31) },
          year,
          detailLevel: 'overview',
          modelCountsBy: modelCountsBy as 'cost-benefit' | 'strava-bias'
        }, selectedGeometry);
        
        const newChartData = trafficData.categories.map((category, index) => ({
          name: category,
          value: trafficData.percentages[index] || 0
        }));

        setChartData(newChartData);

      } catch (err) {
        console.error('❌ Error fetching traffic level data:', err);
        setError('Failed to load traffic data');
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrafficLevelData();
    
  }, [dataType, mapView, showBicyclist, showPedestrian, modelCountsBy, year, selectedGeometry]);

  const onEvents = useMemo(() => ({
    mouseover: (params: ChartEventParams) => setHoveredBar({ value: params.value }),
    mouseout: () => setHoveredBar(null),
  }), []);

  const totalPercent = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);
  const noDataAvailable = totalPercent === 0 && selectedGeometry !== null;
  const noRegionSelected = selectedGeometry === null;

  const option = useMemo(() => {
    // Get consistent colors for volume levels (Low, Medium, High)
    const volumeColors = getVolumeLevelColorArray();
    
    const baseOption = {
      grid: { left: '12px', right: '0px', top: '20px', bottom: '0px', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Low', 'Medium', 'High'],
        axisLine: { show: true, lineStyle: { color: '#9ca3af', width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 14 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: true, lineStyle: { color: '#9ca3af', width: 1 } },
        axisTick: { show: false },
        axisLabel: { 
          color: '#6b7280', 
          fontSize: 14, 
          formatter: (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%` 
        },
        name: 'Percent of Network',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { color: '#6b7280', fontSize: 14, fontWeight: 500 },
        splitLine: { show: true, lineStyle: { color: '#e5e7eb', width: 1, type: [3, 3] } },
      },
      tooltip: { show: false },
      series: [{
        data: chartData.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: volumeColors[index],
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
      }],
    };

    return baseOption;
  }, [chartData]);
  
  const chartComponent = useMemo(() => (
    <ReactECharts
      option={option}
      style={{ height: '300px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      onEvents={onEvents}
    />
  ), [option, onEvents]);

  return (
    <div id="percent-network-by-traffic-card" className={`rounded-lg border border-gray-200 bg-white py-4 px-4 ${horizontalMargins}`}>
      <div className="flex items-center justify-between">
        <h3 id="percent-network-by-traffic-title" className="text-lg font-medium text-gray-900">Percent of Network by Volume Level</h3>
      </div>
      <div className="w-full h-[1px] bg-gray-200 my-2"></div>
      <p id="percent-network-by-traffic-description" className="w-full mt-1 text-sm text-gray-600">
        Percent of network miles assigned to each category{selectedGeometry ? ', filtered by selected area' : ''}
      </p>

      {error && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">⚠️ {error}</p>
        </div>
      )}

      <div id="percent-network-by-traffic-chart-container" className="relative mt-1" style={{ height: '300px' }}>
        {hoveredBar && !isLoading && (
          <div
            id="percent-network-chart-tooltip"
            className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
          >
            {`${hoveredBar.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}% of Network`}
          </div>
        )}

        {isLoading ? (
            <div 
              id="percent-network-by-traffic-loading"
              className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-20 rounded-md"
            >
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                <span className="text-sm text-gray-700 font-medium">Loading network data...</span>
                <span className="text-xs text-gray-500 mt-1">Querying selected area</span>
              </div>
            </div>
        ) : noRegionSelected ? (
            <div 
              id="percent-network-by-traffic-no-region"
              className="flex justify-center items-center h-full"
            >
              <div className="text-center">
                <div className="text-gray-400 text-sm">Please select an area on the map</div>
                <div className="text-gray-300 text-xs mt-1">Click on a boundary to see results</div>
              </div>
            </div>
        ) : noDataAvailable ? (
            <div 
              id="percent-network-by-traffic-no-data"
              className="flex justify-center items-center h-full"
            >
              <div className="text-center">
                <div className="text-gray-400 text-sm">No data available for selected area</div>
                <div className="text-gray-300 text-xs mt-1">Try selecting a different area</div>
              </div>
            </div>
        ) : (
          <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
            {chartComponent}
          </div>
        )}
      </div>
    </div>
  );
}

