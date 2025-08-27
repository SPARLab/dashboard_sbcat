'use client';
import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SafetyFilters, SeverityBreakdownData } from "../../../../lib/safety-app/types";
import { SafetyChartDataService } from "../../../../lib/data-services/SafetyChartDataService";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';

interface HoveredBarData {
  value: number;
  name: string;
}

interface SeverityBreakdownProps {
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
  mapView?: __esri.MapView | null;
}

export default function SeverityBreakdown({ 
  selectedGeometry = null, 
  filters = {},
  mapView = null
}: SeverityBreakdownProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [chartData, setChartData] = useState<SeverityBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create data service instance
  const dataService = useMemo(() => new SafetyChartDataService(), []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Fetch data when selection or filters change
  useEffect(() => {
    const fetchData = async () => {
      // Don't load data if there's no selection
      if (!selectedGeometry || !mapView) {
        setChartData(null);
        setError(null);
        return;
      }

      // Show loading and fetch new data
      setIsLoading(true);
      setError(null);

      try {
        const result = await dataService.getSeverityBreakdownData(mapView, filters, selectedGeometry);
        setChartData(result);
      } catch (err) {
        console.error('Error fetching severity breakdown data:', err);
        setError('Failed to load severity breakdown data');
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedGeometry, mapView, filters, dataService]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        setHoveredBar({ value: params.value, name: params.name });
      },
      mouseout: () => {
        setHoveredBar(null);
      },
    }),
    []
  );

  // Transform data for chart display
  const { chartData: transformedData, colors } = useMemo(() => {
    if (!chartData || !chartData.categories || !chartData.totalByCategory) {
      return { chartData: [], colors: [] };
    }

    // Define colors from most severe (dark) to least severe (light)
    const severityColors = [
      '#000000', // Black - Fatality
      '#D55E00', // Vermilion - Severe Injury
      '#E69F00', // Orange - Injury
      '#0072B2', // Blue - No Injury
      '#999999'  // Gray - Unknown
    ];

    const transformedData = chartData.categories.map((category, index) => ({
      name: category,
      value: chartData.totalByCategory[index],
      itemStyle: {
        color: severityColors[index % severityColors.length],
        borderRadius: [3, 3, 0, 0],
      },
    }));

    return { chartData: transformedData, colors: severityColors };
  }, [chartData]);

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
          data: transformedData.map(item => item.name),
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
          formatter: (value: number) => value.toLocaleString(),
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
          data: transformedData,
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
    [transformedData],
  );

  return (
    <div id="safety-severity-breakdown" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-severity-breakdown-header" className="flex items-center justify-between">
        <h3 id="safety-severity-breakdown-title" className="text-base font-medium text-gray-700">Severity Breakdown</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-severity-breakdown-content" className="space-y-2 min-h-[120px]">
          {/* No selection state */}
          {!selectedGeometry && (
            <div id="safety-severity-breakdown-no-selection" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
              <div id="safety-severity-breakdown-instruction-icon" className="mb-2 text-gray-400">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p id="safety-severity-breakdown-instruction-text" className="text-sm text-gray-600 mb-1">
                Select a region on the map
              </p>
              <p id="safety-severity-breakdown-instruction-subtext" className="text-xs text-gray-500">
                Use the polygon tool or click on a boundary to see severity breakdown for that area
              </p>
            </div>
          )}

          {/* Data display with loading overlay */}
          {selectedGeometry && (
            <div id="safety-severity-breakdown-data-container" className="relative">
              {/* Loading overlay */}
              {isLoading && (
                <div 
                  id="safety-severity-breakdown-loading-overlay" 
                  className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                >
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-sm text-gray-700 font-medium">Loading severity breakdown...</span>
                    <span className="text-xs text-gray-500 mt-1">Analyzing incident severity</span>
                  </div>
                </div>
              )}

              {/* Data content */}
              <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
                {chartData && !error ? (
            <>
              <div id="safety-severity-breakdown-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
              <p id="safety-severity-breakdown-description" className="w-full text-sm text-gray-600">
                Distribution of incident severity levels for the selected area
                <span id="safety-severity-breakdown-info-icon-container" className="ml-1 inline-flex align-middle">
                  <MoreInformationIcon 
                    text="Bar chart showing the distribution of safety incidents by severity level: Fatality (most severe), Severe Injury, Injury, No Injury, and Unknown. Colors range from black (most severe) to lighter colors (less severe) to help identify the safety profile of the selected area."
                    align="center"
                    width="w-80"
                  />
                </span>
              </p>

              {/* Bar Chart */}
              <div id="safety-severity-breakdown-chart-container" className="relative">
                {hoveredBar && (
                  <div
                    id="safety-severity-breakdown-tooltip"
                    className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
                  >
                    {`${hoveredBar.value.toLocaleString()} ${hoveredBar.name}`}
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
                ) : error ? (
                  <div id="safety-severity-breakdown-error" className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[120px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-red-800">
                        <strong>Data Error:</strong> {error}
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Unable to load severity breakdown data.
                      </div>
                    </div>
                  </div>
                ) : chartData && chartData.totalByCategory.every(count => count === 0) ? (
                  <div id="safety-severity-breakdown-no-data" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
                    <div id="safety-severity-breakdown-no-data-icon" className="mb-2 text-gray-400">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p id="safety-severity-breakdown-no-data-text" className="text-sm text-gray-600 mb-1">
                      No severity data available
                    </p>
                    <p id="safety-severity-breakdown-no-data-subtext" className="text-xs text-gray-500">
                      This area may not have sufficient incident data for severity analysis
                    </p>
                  </div>
                ) : (
                  <div 
                    id="safety-severity-breakdown-loading-placeholder" 
                    className="flex justify-center items-center min-h-[120px]"
                  >
                    <div className="text-center">
                      <div className="text-gray-400 text-sm">No data available for selected area</div>
                      <div className="text-gray-300 text-xs mt-1">Try selecting a different area or adjusting filters</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 