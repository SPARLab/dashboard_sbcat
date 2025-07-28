'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import MoreInformationIcon from './MoreInformationIcon';
import CollapseExpandIcon from './CollapseExpandIcon';

const chartData = {
  Hour: Array.from({ length: 24 }, (_, i) => ({ name: `${i}`, value: Math.floor(Math.random() * 200) })),
  Day: [
    { name: 'Mon', value: 120 },
    { name: 'Tue', value: 132 },
    { name: 'Wed', value: 101 },
    { name: 'Thu', value: 134 },
    { name: 'Fri', value: 90 },
    { name: 'Sat', value: 230 },
    { name: 'Sun', value: 210 },
  ],
  'Weekday vs Weekend': [
    { name: 'Weekday', value: 677 },
    { name: 'Weekend', value: 440 },
  ],
  Month: [
    { name: 'Jan', value: 115 },
    { name: 'Feb', value: 127 },
    { name: 'Mar', value: 122 },
    { name: 'Apr', value: 130 },
    { name: 'May', value: 110 },
    { name: 'Jun', value: 140 },
    { name: 'Jul', value: 150 },
    { name: 'Aug', value: 145 },
    { name: 'Sep', value: 135 },
    { name: 'Oct', value: 125 },
    { name: 'Nov', value: 118 },
    { name: 'Dec', value: 128 },
  ],
  Year: Array.from({ length: 5 }, (_, i) => ({ name: `${new Date().getFullYear() - i}`, value: Math.floor(Math.random() * 1500) })).reverse(),
};

type TimeScale = 'Hour' | 'Day' | 'Weekday vs Weekend' | 'Month' | 'Year';
const timeScales: TimeScale[] = ['Hour', 'Day', 'Weekday vs Weekend', 'Month', 'Year'];


interface HoveredBarData {
  value: number;
  name: string;
}

export default function AggregatedVolumeBreakdown() {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('Month');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        setHoveredBar({ value: params.value, name: params.name });
      },
      mouseout: () => {
        setHoveredBar(null);
      },
    }),
    [],
  );

  const currentData = chartData[timeScale];

  const option = useMemo(
    () => ({
      grid: {
        left: '20px',
        right: '0px',
        top: '20px',
        bottom: '0px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: currentData.map(item => item.name),
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
          fontSize: 14,
          formatter: (value: number) => value.toLocaleString(),
        },
        name: 'Avg Daily Traffic',
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
      series: [
        {
          data: currentData.map((item) => ({
            value: item.value,
            itemStyle: {
              color: '#757474',
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

  return (
    <div id="aggregated-volume-breakdown-container" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="aggregated-volume-breakdown-header" className="flex justify-between items-center">
        <h3 id="aggregated-volume-breakdown-title" className="text-lg font-medium text-gray-900">Aggregated Volume Breakdowns</h3>
        <CollapseExpandIcon id="aggregated-volume-breakdown-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="aggregated-volume-breakdown-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        <div id="aggregated-volume-breakdown-buttons-container" className="flex space-x-1 mt-2">
          {timeScales.map(scale => (
            <button
              id={`aggregated-volume-breakdown-button-${scale.toLowerCase().replace(/\s/g, '-')}`}
              key={scale}
              onClick={() => setTimeScale(scale)}
              // We have to use !outline-none !border-none because Google Chrome does not respect the outline-none class on a hover or click
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
        <div id="aggregated-volume-breakdown-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
        <p id="aggregated-volume-breakdown-description" className="w-full text-sm text-gray-600">
          Season- and weekday-adjusted average daily traffic per {timeScale.toLowerCase()}, aggregated for all years within selected timeframe
          <span id="aggregated-volume-breakdown-info-icon-container" className="ml-1 inline-flex align-middle">
            <MoreInformationIcon />
          </span>
        </p>

        <div id="aggregated-volume-breakdown-chart-container" className="relative mt-1">
          {hoveredBar && (
            <div
              id="volume-chart-tooltip"
              className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
            >
              {`${hoveredBar.value.toLocaleString()} Pedestrians & Bicyclists`}
            </div>
          )}

          {useMemo(
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
          )}
        </div>
      </div>
    </div>
  );
} 