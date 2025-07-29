'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

// Sample data for severity breakdown with colors from most severe (dark) to least severe (light)
const severityData = [
  { name: 'Fatality', value: 3, color: '#dc2626' }, // Dark red
  { name: 'Severe\nInjury', fullName: 'Severe Injury', value: 12, color: '#ea580c' }, // Orange-red
  { name: 'Injury', value: 45, color: '#f59e0b' }, // Orange
  { name: 'Near\nMiss', fullName: 'Near Miss', value: 140, color: '#eab308' }, // Yellow
];

interface HoveredBarData {
  value: number;
  name: string;
}

export default function SeverityBreakdown() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        const fullName = severityData.find(item => item.name === params.name)?.fullName || params.name;
        setHoveredBar({ value: params.value, name: fullName });
      },
      mouseout: () => {
        setHoveredBar(null);
      },
    }),
    []
  );

  const option = useMemo(
    () => ({
      grid: {
        left: '30px',
        right: '15px',
        top: '15px',
        bottom: '40px',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: severityData.map(item => item.name),
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
          interval: 0,
          rotate: 0,
          lineHeight: 12,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 150,
        interval: 30,
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
          data: severityData.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: item.color,
              borderRadius: [3, 3, 0, 0],
            },
          })),
          type: 'bar',
          barWidth: '80%',
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
    <div id="safety-severity-breakdown" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-severity-breakdown-header" className="flex items-center justify-between mb-4">
        <h3 id="safety-severity-breakdown-title" className="text-base font-medium text-gray-700">Severity Breakdown</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      
      {!isCollapsed && (
        <>
          {/* Bar Chart */}
          <div id="safety-severity-breakdown-chart-container" className="relative mb-4">
            {hoveredBar && (
              <div
                id="safety-severity-breakdown-tooltip"
                className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap text-center"
                style={{ color: '#3b82f6' }}
              >
                {`${hoveredBar.value} ${hoveredBar.name}`}
              </div>
            )}

            <div id="safety-severity-breakdown-chart" className="bg-white">
              <ReactECharts
                option={option}
                style={{ width: '100%', height: '250px' }}
                opts={{ renderer: 'canvas' }}
                onEvents={onEvents}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
} 