'use client';
import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SafetyFilters, ConflictTypeBreakdownData } from "../../../../lib/safety-app/types";
import { SafetyChartDataService } from "../../../../lib/data-services/SafetyChartDataService";
import { useSafetyLayerViewSpatialQuery } from "../../../../lib/hooks/useSpatialQuery";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';

interface HoveredBarData {
  value: number;
  name: string;
}

interface ConflictTypeBreakdownProps {
  mapView: __esri.MapView | null;
  incidentsLayer: __esri.FeatureLayer | null;
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
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
    'None': 'None',
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
    'None': 'None',
    'Unknown': 'Unknown'
  };
  
  return fullNames[fullName] || fullName;
};

export default function ConflictTypeBreakdown({ 
  mapView,
  incidentsLayer,
  selectedGeometry = null, 
  filters = {}
}: ConflictTypeBreakdownProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ConflictTypeBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create data service instance
  const dataService = useMemo(() => new SafetyChartDataService(), []);

  // Use spatial query to get filtered data
  // Note: Filters are already debounced in SafetyApp, so we use a minimal debounce here (50ms)
  const { result: spatialResult, isLoading: spatialLoading, error: spatialError } = useSafetyLayerViewSpatialQuery(
    mapView,
    incidentsLayer,
    selectedGeometry,
    filters,
    50 // Minimal debounce since filters are already debounced upstream
  );

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Process spatial query result to generate chart data
  useEffect(() => {
    const processData = async () => {
      // Don't load data if there's no selection
      if (!selectedGeometry || !spatialResult?.incidents) {
        setChartData(null);
        setError(spatialError);
        return;
      }

      // Show loading and process new data
      setIsLoading(true);
      setError(null);

      try {
        // Process incidents to create conflict type breakdown
        const conflictMap = new Map<string, { total: number, bike: number, ped: number }>();
        
        spatialResult.incidents.forEach(incident => {
          const conflictType = incident.conflict_type || 'Unknown';
          const isBike = incident.parties?.some(p => p.party_type?.toLowerCase().includes('bike')) || false;
          const isPed = incident.parties?.some(p => p.party_type?.toLowerCase().includes('ped')) || false;
          
          if (!conflictMap.has(conflictType)) {
            conflictMap.set(conflictType, { total: 0, bike: 0, ped: 0 });
          }
          
          const data = conflictMap.get(conflictType)!;
          data.total += 1;
          if (isBike) data.bike += 1;
          if (isPed) data.ped += 1;
        });

        // Convert to the expected format
        const totalIncidents = Array.from(conflictMap.values()).reduce((sum, data) => sum + data.total, 0);
        const data = Array.from(conflictMap.entries())
          .map(([name, counts]) => ({
            name,
            value: counts.total,
            percentage: totalIncidents > 0 ? (counts.total / totalIncidents) * 100 : 0,
            bikeCount: counts.bike,
            pedCount: counts.ped
          }))
          .sort((a, b) => b.value - a.value); // Sort by count descending

        const categories = data.map(item => item.name);
        const result: ConflictTypeBreakdownData = { categories, data };
        setChartData(result);
      } catch (err) {
        console.error('Error processing conflict type breakdown data:', err);
        setError('Failed to process conflict type breakdown data');
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    };

    processData();
  }, [spatialResult, spatialError, selectedGeometry, filters, dataService]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        // Use the full name for the tooltip
        const fullName = chartData?.data.find(item => getAbbreviatedLabel(item.name) === params.name)?.name || params.name;
        setHoveredBar({ value: params.value, name: fullName });
        setHoveredIndex(params.dataIndex);
      },
      mouseout: () => {
        setHoveredBar(null);
        setHoveredIndex(null);
      },
    }),
    [chartData]
  );

  // Transform data for chart display
  const { chartData: transformedData, colors } = useMemo(() => {
    if (!chartData || !chartData.data) {
      return { chartData: [], colors: [] };
    }

    // Complete Okabe-Ito colorblind-friendly palette (8 distinct colors)
    const okabeItoColors = [
      '#D55E00', // Vermilion
      '#CC79A7', // Reddish purple  
      '#009E73', // Bluish green
      '#56B4E9', // Sky blue
      '#F0E442', // Yellow
      '#0072B2', // Blue
      '#E69F00', // Orange
      '#000000', // Black
    ];

    // Assign colors systematically to ensure each conflict type gets a unique color
    const conflictColors = chartData.data.map((item, index) => {
      // Use modulo to cycle through colors if we have more than 8 conflict types
      return okabeItoColors[index % okabeItoColors.length];
    });

    const transformedData = chartData.data.map((item, index) => {
      // Determine opacity based on hover state
      const isHovered = hoveredIndex === index;
      const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index;
      const opacity = isOtherHovered ? 0.3 : 1.0;
      
      return {
        name: getAbbreviatedLabel(item.name), // Use abbreviated label for display
        value: item.value,
        itemStyle: {
          color: conflictColors[index],
          borderRadius: [3, 3, 0, 0],
          opacity: opacity,
        },
      };
    });

    return { chartData: transformedData, colors: conflictColors };
  }, [chartData, hoveredIndex]);

  const option = useMemo(
    () => ({
        grid: {
          left: '3px',
          right: '15px',
          top: '15px',
          bottom: '15px',
          containLabel: true,
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
          animation: true,
          animationDuration: 200,
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
              {/* Loading overlay - only show when no data exists yet (initial load) */}
              {(isLoading || spatialLoading) && !chartData && (
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

              {/* Data content - show subtle loading state when refreshing existing data */}
              <div className={`transition-opacity duration-200 ${(isLoading || spatialLoading) && chartData ? 'opacity-60' : 'opacity-100'}`}>
                {chartData && !error ? (
                <>
                  <div id="safety-conflict-type-divider" className="w-full h-[1px] bg-gray-200 my-2"></div>
                  <div id="safety-conflict-type-description" className="w-full text-sm text-gray-600">
                    Distribution of incident types by conflict category for the selected area
                    <span id="safety-conflict-type-info-icon-container" className="ml-1 inline-flex align-middle">
                      <MoreInformationIcon 
                        text="Safety incidents are broken down and color-coded by conflict type. Hover over a bar or legend item to highlight a specific conflict type and view detailed counts."
                        align="center"
                        width="w-80"
                        yOffset="-0.15rem"
                      />
                    </span>
                  </div>

                  {/* Bar Chart */}
                  <div id="safety-conflict-type-chart-container" className="relative">
                    {hoveredBar && (
                      <div
                        id="safety-conflict-type-tooltip"
                        className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-10 text-blue-600 text-sm font-medium whitespace-nowrap"
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
                  <div id="safety-conflict-type-legend" className="ml-4 grid grid-cols-2 gap-1.5">
                    {chartData.data.map((conflict, index) => {
                      const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index;
                      const opacity = isOtherHovered ? 0.3 : 1.0;
                      
                      return (
                        <div 
                          key={index} 
                          id={`safety-conflict-type-legend-item-${index}`}
                          className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-200"
                          style={{ opacity }}
                          onMouseEnter={() => {
                            setHoveredIndex(index);
                            setHoveredBar({ value: conflict.value, name: conflict.name });
                          }}
                          onMouseLeave={() => {
                            setHoveredIndex(null);
                            setHoveredBar(null);
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: colors[index % colors.length] }}
                          ></div>
                          <span className="text-xs text-gray-900">{getFullName(conflict.name)}</span>
                        </div>
                      );
                    })}
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