'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';

const chartdata = [
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

interface VolumeBarChartProps {
  dataType: string;
  horizontalMargins: string;
}

interface HoveredBarData {
  value: number;
}

export default function VolumeBarChart({ dataType, horizontalMargins }: VolumeBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);

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

  const option = useMemo(
    () => ({
      grid: {
        left: '17px',
        right: '0px',
        top: '20px',
        bottom: '0px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: chartdata.map(item => item.name),
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
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 140,
        interval: 35,
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
          formatter: (value: number) => value.toString(),
        },
        name: 'Network Miles',
        nameLocation: 'middle',
        nameGap: 30,
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
            type: [3, 3], // dashed line
          },
        },
      },
      series: [
        {
          data: chartdata.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: ['#ef4444', '#f97316', '#22c55e'][index], // red, orange, green
              borderRadius: [4, 4, 0, 0], // rounded top corners
            },
          })),
          type: 'bar',
          barWidth: '60%',
          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6', // blue border on hover
              borderWidth: 2,
              shadowBlur: 0, // remove shadow
              shadowColor: 'transparent',
            },
          },
        },
      ],
      tooltip: {
        show: false, // disable default tooltip
      },
    }),
    [],
  );

  return (
    <div className={`rounded-lg border border-gray-200 bg-white py-4 px-4 ${horizontalMargins}`}>
      <h3 className="text-lg font-medium text-gray-900">Miles of Street by Traffic Level</h3>
      <div className="w-full h-[1px] bg-gray-200"></div>
      <p className="w-full mt-1 text-sm text-gray-600">
        Miles within network assigned to each category, based on current selection
      </p>

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