'use client';
import ReactECharts from 'echarts-for-react';
import React, { useState, useMemo } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';

// Sample data for traffic volume vs incident ratios
// Each point represents [traffic_volume, incident_ratio, location_name]
const scatterData: [number, number, string][] = [
  [1200, 0.15, 'State Street & Carrillo'],
  [2500, 0.32, 'State Street & Canon Perdido'],
  [1800, 0.22, 'State Street & Cota'],
  [3200, 0.45, 'State Street & Haley'],
  [950, 0.08, 'Chapala Street & Montecito'],
  [2100, 0.28, 'Milpas Street & Canon Perdido'],
  [1650, 0.18, 'Garden Street & Cota'],
  [2800, 0.38, 'Garden Street & Haley'],
  [1400, 0.12, 'Santa Barbara Street & Canon Perdido'],
  [3500, 0.52, 'Hollister Avenue & Fairview'],
  [2200, 0.25, 'Hollister Avenue & Patterson'],
  [1750, 0.19, 'De La Vina Street & Canon Perdido'],
  [2900, 0.41, 'Castillo Street & Haley'],
  [1100, 0.09, 'Anacapa Street & Canon Perdido'],
  [2600, 0.35, 'Bath Street & Cota'],
  [1900, 0.23, 'Victoria Street & Canon Perdido'],
  [3100, 0.47, 'Milpas Street & Haley'],
  [1350, 0.14, 'Chapala Street & Canon Perdido'],
  [2400, 0.29, 'Garden Street & Canon Perdido'],
  [2050, 0.26, 'Santa Barbara Street & Cota']
];

interface HoveredPointData {
  value: [number, number, string];
  dataIndex: number;
}

export default function IncidentsVsTrafficRatios() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointData | null>(null);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        setHoveredPoint({ 
          value: params.value, 
          dataIndex: params.dataIndex
        });
      },
      mouseout: () => {
        setHoveredPoint(null);
      },
    }),
    [],
  );

  // Calculate dynamic axis ranges
  const trafficValues = scatterData.map(point => point[0]);
  const incidentValues = scatterData.map(point => point[1]);
  
  const minTraffic = Math.min(...trafficValues);
  const maxTraffic = Math.max(...trafficValues);
  const minIncident = Math.min(...incidentValues);
  const maxIncident = Math.max(...incidentValues);
  
  const trafficPadding = (maxTraffic - minTraffic) * 0.1;
  const incidentPadding = (maxIncident - minIncident) * 0.1;

  const option = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      grid: {
        left: '60px',
        right: '20px',
        top: '40px',
        bottom: '60px',
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        name: 'Average Daily Traffic Volume',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
        },
        min: Math.max(0, minTraffic - trafficPadding),
        max: maxTraffic + trafficPadding,
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
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}k`;
            }
            return value.toString();
          },
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
      yAxis: {
        type: 'value',
        name: 'Incident Rate\n(per 1000 vehicles)',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 16,
        },
        min: Math.max(0, minIncident - incidentPadding),
        max: maxIncident + incidentPadding,
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
          fontSize: 11,
          formatter: (value: number) => value.toFixed(2),
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
          name: 'Intersections',
          data: scatterData,
          type: 'scatter',
          symbolSize: 8,
          itemStyle: {
            color: '#3b82f6',
            borderColor: '#1d4ed8',
            borderWidth: 1,
            opacity: 0.8,
          },
          emphasis: {
            itemStyle: {
              color: '#2563eb',
              borderColor: '#1e40af',
              borderWidth: 2,
              shadowBlur: 8,
              shadowColor: 'rgba(59, 130, 246, 0.3)',
              opacity: 1,
            },
            scale: 1.2,
          },
        },
      ],
      tooltip: {
        show: false,
      },
    }),
    [minTraffic, maxTraffic, minIncident, maxIncident, trafficPadding, incidentPadding],
  );

  return (
    <div id="safety-incidents-vs-traffic-ratios" className="bg-white border border-gray-200 rounded p-4">
      <div id="safety-incidents-vs-traffic-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-incidents-vs-traffic-title" className="text-base font-medium text-gray-700">Incidents vs. Traffic Ratios</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          <hr className="border-gray-200 mb-2" />
          <p id="safety-incidents-vs-traffic-description" className="w-full text-sm text-gray-600 mb-1">
            Relationship between traffic volume and incident rates at major intersections
            <span id="safety-incidents-vs-traffic-info-icon-container" className="ml-1 inline-flex align-middle">
              <MoreInformationIcon />
            </span>
          </p>

          <div id="safety-incidents-vs-traffic-chart-container" className="relative">
            {hoveredPoint ? (
              <div
                id="safety-incidents-vs-traffic-tooltip"
                className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap text-center"
                style={{ color: '#3b82f6' }}
              >
                <div>{hoveredPoint.value[2]}</div>
                <div>{hoveredPoint.value[1].toFixed(2)} incidents/1000</div>
              </div>
            ) : (
              <div
                id="safety-incidents-vs-traffic-hover-hint"
                className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 text-sm italic text-gray-400 whitespace-nowrap"
              >
                Hover over point to see details
              </div>
            )}

            {useMemo(
              () => (
                <div id="safety-incidents-vs-traffic-chart">
                  <ReactECharts
                    option={option}
                    style={{ height: '320px', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    onEvents={onEvents}
                  />
                </div>
              ),
              [option, onEvents],
            )}
          </div>
        </>
      )}
    </div>
  );
} 