'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

// Sample data for conflict type breakdown with abbreviations for chart labels
const conflictTypeData = [
  { name: 'Bike vs\ncar', fullName: 'Bike vs car', value: 20, color: '#828080' },
  { name: 'Bike vs\nbike', fullName: 'Bike vs bike', value: 36, color: '#c3c3c3' },
  { name: 'Bike vs\nped', fullName: 'Bike vs pedestrian', value: 30, color: '#e9f1ff' },
  { name: 'Bike vs\ninfra', fullName: 'Bike vs infrastructure', value: 30, color: '#c1d8ff' },
  { name: 'Bike vs\nother', fullName: 'Bike vs other', value: 30, color: '#a1c5ff' },
  { name: 'Ped vs\ncar', fullName: 'Pedestrian vs car', value: 30, color: '#72a8ff' },
  { name: 'Ped vs\nped', fullName: 'Pedestrian vs pedestrians', value: 30, color: '#2f7eff' },
  { name: 'Ped vs\nother', fullName: 'Pedestrian vs other', value: 30, color: '#0061ff' },
];

interface HoveredBarData {
  value: number;
  name: string;
}

export default function ConflictTypeBreakdown() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        const fullName = conflictTypeData.find(item => item.name === params.name)?.fullName || params.name;
        setHoveredBar({ value: params.value, name: fullName });
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
        left: '25px',
        right: '15px',
        top: '15px',
        bottom: '40px',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: conflictTypeData.map(item => item.name),
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
          fontSize: 9.5,
          interval: 0,
          rotate: 0,
          lineHeight: 10,
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
          data: conflictTypeData.map((item, index) => ({
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
    <div id="safety-conflict-type-breakdown" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-conflict-type-header" className="flex items-center justify-between mb-4">
        <h3 id="safety-conflict-type-title" className="text-base font-medium text-gray-700">Conflict Type Breakdown</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      
      {!isCollapsed && (
        <>
          {/* Bar Chart */}
          <div id="safety-conflict-type-chart-container" className="relative mb-4">
            {hoveredBar && (
              <div
                id="safety-conflict-type-tooltip"
                className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap text-center"
                style={{ color: '#3b82f6' }}
              >
                {`${hoveredBar.value} ${hoveredBar.name}`}
              </div>
            )}

            <div id="safety-conflict-type-chart" className="bg-white">
              <ReactECharts
                option={option}
                style={{ width: '100%', height: '250px' }}
                opts={{ renderer: 'canvas' }}
                onEvents={onEvents}
              />
            </div>
          </div>

          {/* Legend */}
          <div id="safety-conflict-type-legend" className="grid grid-cols-2 gap-1.5">
            {conflictTypeData.map((conflict, index) => (
              <div 
                key={index} 
                id={`safety-conflict-type-legend-item-${index}`}
                className="flex items-center gap-1.5"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: conflict.color }}
                ></div>
                <span className="text-xs text-gray-900">{conflict.fullName}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 