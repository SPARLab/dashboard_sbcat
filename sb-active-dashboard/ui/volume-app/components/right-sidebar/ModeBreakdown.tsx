'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import MoreInformationIcon from './MoreInformationIcon';
import CollapseExpandIcon from './CollapseExpandIcon';

// Sample data for mode breakdown
const modeData = [
  { name: 'Bikes', value: 20, color: '#c1d8ff' },
  { name: 'Pedestrians', value: 35, color: '#c3c3c3' },
  { name: 'E-bikes', value: 30, color: '#0061ff' },
];

interface HoveredBarData {
  value: number;
  name: string;
}

export default function ModeBreakdown() {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
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

  const option = useMemo(
    () => ({
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
        max: 40,
        interval: 10,
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
          data: modeData.map((item, index) => ({
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
    }),
    [],
  );

  return (
    <div id="mode-breakdown-container" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="mode-breakdown-header" className="flex justify-between items-center">
        <h3 id="mode-breakdown-title" className="text-lg font-medium text-gray-700">Mode Breakdown</h3>
        <CollapseExpandIcon id="mode-breakdown-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="mode-breakdown-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[400px]'}`}>
        <div id="mode-breakdown-chart-container" className="relative mt-4">
          {hoveredBar && (
            <div
              id="mode-breakdown-tooltip"
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10 text-gray-900 text-sm font-medium whitespace-nowrap bg-white rounded shadow-md border"
            >
              {`${hoveredBar.value}% ${hoveredBar.name}`}
            </div>
          )}

          {useMemo(
            () => (
              <div id="mode-breakdown-chart" className="bg-white">
                <ReactECharts
                  option={option}
                  style={{ width: '100%' }}
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