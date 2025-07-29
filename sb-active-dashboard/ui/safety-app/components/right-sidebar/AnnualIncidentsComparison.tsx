'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import MoreInformationIcon from './MoreInformationIcon';
import CollapseExpandIcon from '../../../components/CollapseExpandIcon';

// Sample data for different time scales comparing two years
const chartData = {
  Day: {
    2023: [
      { name: 'Mon', value: 12 },
      { name: 'Tue', value: 15 },
      { name: 'Wed', value: 18 },
      { name: 'Thu', value: 22 },
      { name: 'Fri', value: 25 },
      { name: 'Sat', value: 28 },
      { name: 'Sun', value: 22 },
    ],
    2024: [
      { name: 'Mon', value: 14 },
      { name: 'Tue', value: 17 },
      { name: 'Wed', value: 16 },
      { name: 'Thu', value: 19 },
      { name: 'Fri', value: 23 },
      { name: 'Sat', value: 26 },
      { name: 'Sun', value: 19 },
    ],
  },
  Month: {
    2023: [
      { name: 'Jan', value: 25 },
      { name: 'Feb', value: 30 },
      { name: 'Mar', value: 28 },
      { name: 'Apr', value: 35 },
      { name: 'May', value: 25 },
      { name: 'Jun', value: 30 },
      { name: 'Jul', value: 32 },
      { name: 'Aug', value: 20 },
      { name: 'Sep', value: 25 },
      { name: 'Oct', value: 35 },
      { name: 'Nov', value: 30 },
      { name: 'Dec', value: 28 },
    ],
    2024: [
      { name: 'Jan', value: 21 },
      { name: 'Feb', value: 25 },
      { name: 'Mar', value: 24 },
      { name: 'Apr', value: 32 },
      { name: 'May', value: 21.5 },
      { name: 'Jun', value: 27 },
      { name: 'Jul', value: 29 },
      { name: 'Aug', value: 18 },
      { name: 'Sep', value: 22 },
      { name: 'Oct', value: 32 },
      { name: 'Nov', value: 27 },
      { name: 'Dec', value: 25 },
    ],
  },
  Year: {
    2023: [{ name: '2023', value: 328 }],
    2024: [{ name: '2024', value: 305 }],
  },
};

type TimeScale = 'Day' | 'Month' | 'Year';
const timeScales: TimeScale[] = ['Day', 'Month', 'Year'];

interface HoveredPointData {
  value: number;
  name: string;
  seriesName: string;
}

export default function AnnualIncidentsComparison() {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointData | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('Month');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

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

  const currentData2023 = chartData[timeScale][2023];
  const currentData2024 = chartData[timeScale][2024];
  
  // Determine if we should use bar chart or line chart
  const useBarChart = timeScale === 'Year';
  const isYearView = timeScale === 'Year';
  const categories = isYearView ? ['2023', '2024'] : currentData2023.map(item => item.name);
  
  // Calculate dynamic y-axis range
  const allValues = [...currentData2023.map(item => item.value), ...currentData2024.map(item => item.value)];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const padding = (maxValue - minValue) * 0.1; // 10% padding
  const yAxisMin = Math.max(0, minValue - padding);
  const yAxisMax = maxValue + padding;

  const option = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      animationDelay: useBarChart ? 0 : (idx: number) => idx * 50,
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
      series: useBarChart ? [
        {
          name: 'Years',
          data: [
            {
              value: currentData2023[0].value,
              itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }
            },
            {
              value: currentData2024[0].value,
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
    }),
    [currentData2023, currentData2024, categories, timeScale, useBarChart, isYearView, yAxisMin, yAxisMax],
  );

  const getTimeScaleUnit = (scale: TimeScale): string => {
    switch(scale) {
      case 'Day': return 'day of week';
      case 'Month': return 'month';
      case 'Year': return 'year';
      default: return 'period';
    }
  };

  return (
    <div id="safety-annual-incidents-comparison" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="safety-annual-incidents-header" className="flex justify-between items-center">
        <h3 id="safety-annual-incidents-title" className="text-lg font-medium text-gray-900">Annual Incidents Comparison</h3>
        <CollapseExpandIcon id="safety-annual-incidents-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="safety-annual-incidents-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        <div id="safety-annual-incidents-buttons-container" className="flex space-x-1 mt-2">
          {timeScales.map(scale => (
            <button
              id={`safety-annual-incidents-button-${scale.toLowerCase().replace(/\s/g, '-')}`}
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={`px-2 py-1 text-[.8rem] font-semibold rounded-md !outline-none !border-none focus:!outline-none focus:!ring-0 focus:!shadow-none hover:!outline-none hover:!border-none active:!outline-none active:!border-none transition-none ${
                timeScale === scale
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-gray-800 hover:bg-gray-200'
              }`}
            >
              {scale}
            </button>
          ))}
        </div>
        <div id="safety-annual-incidents-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
        <p id="safety-annual-incidents-description" className="w-full text-sm text-gray-600">
          Total safety incidents per {getTimeScaleUnit(timeScale)}
          <span id="safety-annual-incidents-info-icon-container" className="ml-1 inline-flex align-middle">
            <MoreInformationIcon />
          </span>
        </p>

        <div id="safety-annual-incidents-chart-container" className="relative">
          {hoveredPoint && (
            <div
              id="safety-incidents-chart-tooltip"
              className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap"
              style={{ color: hoveredPoint.seriesName === '2023' ? '#ef4444' : '#3b82f6' }}
            >
              {`${hoveredPoint.value.toLocaleString()} Incidents`}
            </div>
          )}

          {useMemo(
            () => (
              <div id="safety-annual-incidents-chart">
                <ReactECharts
                  key={`chart-${timeScale}`} // Force re-initialization when timeScale changes
                  option={option}
                  style={{ height: '300px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  onEvents={onEvents}
                />
              </div>
            ),
            [option, onEvents, timeScale], // Add timeScale to dependency array
          )}
        </div>
      </div>
    </div>
  );
} 