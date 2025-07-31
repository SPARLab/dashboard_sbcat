'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState, useEffect } from 'react';
import { ModeledVolumeChartDataService } from '../../../../lib/data-services/ModeledVolumeChartDataService';
import Polygon from "@arcgis/core/geometry/Polygon";

// Static fallback data for when real data isn't available
const fallbackChartData = [
  {
    name: 'Low',
    value: 115,
  },
  {
    name: 'Medium',
    value: 127,
  },
  {
    name: 'High',
    value: 122,
  },
];

interface MilesOfStreetByTrafficLevelBarChartProps {
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

export default function MilesOfStreetByTrafficLevelBarChart({ 
  dataType, 
  horizontalMargins, 
  mapView,
  showBicyclist = true,
  showPedestrian = true,
  modelCountsBy = 'cost-benefit',
  year = 2023,
  selectedGeometry
}: MilesOfStreetByTrafficLevelBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [chartData, setChartData] = useState(fallbackChartData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real data for modeled data type
  useEffect(() => {

    if (dataType === 'modeled-data' && mapView && modelCountsBy === 'cost-benefit' && (showBicyclist || showPedestrian)) {
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
            detailLevel: 'overview' // Start with fast overview mode
          });

          // Transform the data for the chart
          const newChartData = trafficData.categories.map((category, index) => ({
            name: category,
            value: Math.round(trafficData.totalMiles[index])
          }));

          setChartData(newChartData);
        } catch (err) {
          console.error('❌ Error fetching traffic level data:', err);
          setError('Failed to load traffic data');
          setChartData(fallbackChartData); // Fall back to static data
        } finally {
          setIsLoading(false);
        }
      };

      fetchTrafficLevelData();
    } else {
      // Use fallback data for raw data or when no map view
      setChartData([]);
    }
  }, [dataType, mapView, showBicyclist, showPedestrian, modelCountsBy, year, selectedGeometry]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        setHoveredBar({ value: params.value });
      },
      mouseout: () => {
        setHoveredBar(null);
      },
    }),
    [],
  );

  const option = useMemo(() => {
    const baseOption = {
      grid: {
        left: '17px',
        right: '0px',
        top: '20px',
        bottom: '0px',
        containLabel: true,
      },
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
        axisLine: { show: true, lineStyle: { color: '#9ca3af', width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 14, formatter: (value: number) => value.toString() },
        name: 'Network Miles',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: '#6b7280', fontSize: 14, fontWeight: 500 },
        splitLine: { show: true, lineStyle: { color: '#e5e7eb', width: 1, type: [3, 3] } },
      },
      tooltip: { show: false },
    };

    if (chartData.length === 0) {
      return {
        ...baseOption,
        graphic: {
          elements: [
            {
              type: 'text',
              left: 'center',
              top: 'center',
              style: {
                text: 'No data available for selected filters',
                fill: '#6b7280',
                font: '14px Inter, sans-serif',
              },
            },
          ],
        },
        series: [{ type: 'bar', data: [] }],
      };
    }

    return {
      ...baseOption,
      graphic: undefined, // Explicitly remove the 'no data' message
      xAxis: {
        ...baseOption.xAxis,
        data: chartData.map(item => item.name),
      },
      series: [
        {
          data: chartData.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: ['#ef4444', '#f97316', '#22c55e'][index],
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
    };
  }, [chartData]);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white py-4 px-4 ${horizontalMargins}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Miles of Street by Traffic Level</h3>
        {isLoading && (
          <div className="flex items-center text-sm text-blue-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            Loading...
          </div>
        )}
        {dataType === 'modeled-data' && !isLoading && (
          <span className="text-xs text-gray-500">Real-time data</span>
        )}
      </div>
      <div className="w-full h-[1px] bg-gray-200"></div>
      <p className="w-full mt-1 text-sm text-gray-600">
        Miles within network assigned to each category{selectedGeometry ? ', filtered by selected area' : ', based on current map view'}
        {dataType === 'raw-data' && <span className="text-gray-500"> (Estimated from count sites)</span>}
      </p>
      
      {/* Show data source indicator */}
      <div className="w-full mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          <span className="text-xs font-medium text-amber-800">Simulated Data</span>
        </div>
        <p className="text-xs text-amber-700 mt-1">
          Real traffic data integration is pending. Values shown are for demonstration purposes.
        </p>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">⚠️ {error}</p>
          <p className="text-xs text-yellow-600 mt-1">Showing fallback data</p>
        </div>
      )}

      <div className="relative mt-1">
        {hoveredBar && (
          <div
            id="volume-chart-tooltip"
            className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
          >
            {`${hoveredBar.value.toLocaleString()} Network Miles`}
          </div>
        )}

        {useMemo(
          () => (
            <ReactECharts
              option={option}
              style={{ height: '300px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              onEvents={onEvents}
            />
          ),
          [option, onEvents],
        )}
      </div>
    </div>
  );
} 