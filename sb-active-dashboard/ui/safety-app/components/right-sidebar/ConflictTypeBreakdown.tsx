'use client';
import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SafetyFilters, ConflictTypeBreakdownData } from "../../../../lib/safety-app/types";
import { SafetyChartDataService } from "../../../../lib/data-services/SafetyChartDataService";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';

interface HoveredBarData {
  value: number;
  name: string;
}

interface ConflictTypeBreakdownProps {
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
  mapView?: __esri.MapView | null;
}

// Function to convert full conflict type names to abbreviated labels
const getAbbreviatedLabel = (fullName: string): string => {
  const abbreviations: { [key: string]: string } = {
    'Bike vs car': 'Bike vs\ncar',
    'Bike vs vehicle': 'Bike vs\nveh',
    'Bike vs bike': 'Bike vs\nbike',
    'Bike vs bicyclist': 'Bike vs\nbike',
    'Bike vs pedestrian': 'Bike vs\nped',
    'Bike vs infrastructure': 'Bike vs\ninfra',
    'Bike vs other': 'Bike vs\nother',
    'Pedestrian vs car': 'Ped vs\ncar',
    'Pedestrian vs vehicle': 'Ped vs\nveh',
    'Pedestrian vs pedestrian': 'Ped vs\nped',
    'Pedestrian vs bicyclist': 'Ped vs\nbike',
    'Pedestrian vs other': 'Ped vs\nother',
    'Vehicle vs bike': 'Veh vs\nbike',
    'Vehicle vs pedestrian': 'Veh vs\nped',
    'Vehicle vs vehicle': 'Veh vs\nveh',
    'Unknown': 'Unknown'
  };
  
  return abbreviations[fullName] || fullName;
};

// Function to get the full name for legend display
const getFullName = (fullName: string): string => {
  const fullNames: { [key: string]: string } = {
    'Bike vs car': 'Bike vs car',
    'Bike vs vehicle': 'Bike vs vehicle',
    'Bike vs bike': 'Bike vs bike',
    'Bike vs bicyclist': 'Bike vs bicyclist',
    'Bike vs pedestrian': 'Bike vs pedestrian',
    'Bike vs infrastructure': 'Bike vs infrastructure',
    'Bike vs other': 'Bike vs other',
    'Pedestrian vs car': 'Pedestrian vs car',
    'Pedestrian vs vehicle': 'Pedestrian vs vehicle',
    'Pedestrian vs pedestrian': 'Pedestrian vs pedestrians',
    'Pedestrian vs bicyclist': 'Pedestrian vs bicyclist',
    'Pedestrian vs other': 'Pedestrian vs other',
    'Vehicle vs bike': 'Vehicle vs bike',
    'Vehicle vs pedestrian': 'Vehicle vs pedestrian',
    'Vehicle vs vehicle': 'Vehicle vs vehicle',
    'Unknown': 'Unknown'
  };
  
  return fullNames[fullName] || fullName;
};

export default function ConflictTypeBreakdown({ 
  selectedGeometry = null, 
  filters = {},
  mapView = null
}: ConflictTypeBreakdownProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [chartData, setChartData] = useState<ConflictTypeBreakdownData | null>(null);
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
        const result = await dataService.getConflictTypeBreakdownData(mapView, filters, selectedGeometry);
        setChartData(result);
      } catch (err) {
        console.error('Error fetching conflict type breakdown data:', err);
        setError('Failed to load conflict type breakdown data');
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
        // Use the full name for the tooltip
        const fullName = chartData?.data.find(item => getAbbreviatedLabel(item.name) === params.name)?.name || params.name;
        setHoveredBar({ value: params.value, name: fullName });
      },
      mouseout: () => {
        setHoveredBar(null);
      },
    }),
    [chartData]
  );

  // Transform data for chart display
  const { chartData: transformedData, colors } = useMemo(() => {
    if (!chartData || !chartData.data) {
      return { chartData: [], colors: [] };
    }

    // Define colors for different conflict types
    const conflictColors = [
      '#dc2626', // Red - Bike vs car
      '#ea580c', // Orange-red - Bike vs bike
      '#f59e0b', // Orange - Bike vs ped
      '#eab308', // Yellow - Bike vs infra
      '#84cc16', // Light green - Bike vs other
      '#22c55e', // Green - Ped vs car
      '#14b8a6', // Teal - Ped vs ped
      '#06b6d4', // Cyan - Ped vs other
      '#3b82f6', // Blue - Other types
      '#8b5cf6'  // Purple - Unknown
    ];

    const transformedData = chartData.data.map((item, index) => ({
      name: getAbbreviatedLabel(item.name), // Use abbreviated label for display
      value: item.value,
      itemStyle: {
        color: conflictColors[index % conflictColors.length],
        borderRadius: [3, 3, 0, 0],
      },
    }));

    return { chartData: transformedData, colors: conflictColors };
  }, [chartData]);

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
            color: '#374151',
            fontSize: 9.5,
            interval: 0,
            rotate: 0,
            lineHeight: 10,
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
    <div id="safety-conflict-type-breakdown" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-conflict-type-header" className="flex items-center justify-between">
        <h3 id="safety-conflict-type-title" className="text-base font-medium text-gray-700">Conflict Type Breakdown</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-conflict-type-content" className="space-y-2 min-h-[120px]">
          {/* No selection state */}
          {!selectedGeometry && (
            <div id="safety-conflict-type-no-selection" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
              <div id="safety-conflict-type-instruction-icon" className="mb-2 text-gray-400">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p id="safety-conflict-type-instruction-text" className="text-sm text-gray-600 mb-1">
                Select a region on the map
              </p>
              <p id="safety-conflict-type-instruction-subtext" className="text-xs text-gray-500">
                Use the polygon tool or click on a boundary to see conflict type breakdown for that area
              </p>
            </div>
          )}

          {/* Data display with loading overlay */}
          {selectedGeometry && (
            <div id="safety-conflict-type-data-container" className="relative">
              {/* Loading overlay */}
              {isLoading && (
                <div 
                  id="safety-conflict-type-loading-overlay" 
                  className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                >
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-sm text-gray-700 font-medium">Loading conflict breakdown...</span>
                    <span className="text-xs text-gray-500 mt-1">Analyzing incident types</span>
                  </div>
                </div>
              )}

              {/* Data content */}
              <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
                {chartData && !error ? (
                <>
                  <div id="safety-conflict-type-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
                  <p id="safety-conflict-type-description" className="w-full text-sm text-gray-600">
                    Distribution of incident types by conflict category for the selected area
                    <span id="safety-conflict-type-info-icon-container" className="ml-1 inline-flex align-middle">
                      <MoreInformationIcon />
                    </span>
                  </p>

                  {/* Bar Chart */}
                  <div id="safety-conflict-type-chart-container" className="relative mb-4">
                    {hoveredBar && (
                      <div
                        id="safety-conflict-type-tooltip"
                        className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium whitespace-nowrap text-center"
                        style={{ color: '#3b82f6' }}
                      >
                        {`${hoveredBar.value.toLocaleString()} ${hoveredBar.name}`}
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
                    {chartData.data.map((conflict, index) => (
                      <div 
                        key={index} 
                        id={`safety-conflict-type-legend-item-${index}`}
                        className="flex items-center gap-1.5"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="text-xs text-gray-900">{getFullName(conflict.name)}</span>
                      </div>
                    ))}
                  </div>
                  </>
                ) : error ? (
                  <div id="safety-conflict-type-error" className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[120px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-red-800">
                        <strong>Data Error:</strong> {error}
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Unable to load conflict breakdown data.
                      </div>
                    </div>
                  </div>
                ) : chartData && chartData.data.every(item => item.value === 0) ? (
                  <div id="safety-conflict-type-no-data" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
                    <div id="safety-conflict-type-no-data-icon" className="mb-2 text-gray-400">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p id="safety-conflict-type-no-data-text" className="text-sm text-gray-600 mb-1">
                      No conflict type data available
                    </p>
                    <p id="safety-conflict-type-no-data-subtext" className="text-xs text-gray-500">
                      This area may not have sufficient incident data for conflict type analysis
                    </p>
                  </div>
                ) : (
                  <div 
                    id="safety-conflict-type-loading-placeholder" 
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