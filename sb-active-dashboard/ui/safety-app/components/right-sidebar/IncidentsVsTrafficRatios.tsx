'use client';
import ReactECharts from 'echarts-for-react';
import React, { useState, useMemo, useEffect } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";
import MoreInformationIcon from './MoreInformationIcon';
import { SafetyChartDataService } from "../../../../lib/data-services/SafetyChartDataService";
import { SafetyFilters } from "../../../../lib/safety-app/types";
import { useSafetySpatialQuery } from "../../../../lib/hooks/useSpatialQuery";

interface IncidentsVsTrafficRatiosProps {
  selectedGeometry?: __esri.Polygon | null;
  filters?: Partial<SafetyFilters>;
}

interface ScatterDataPoint {
  location: string;
  incidentCount: number;
  trafficLevel: 'low' | 'medium' | 'high';
  x: number; // 1 for low, 2 for medium, 3 for high
}

export default function IncidentsVsTrafficRatios({ 
  selectedGeometry = null, 
  filters = {} 
}: IncidentsVsTrafficRatiosProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scatterData, setScatterData] = useState<ScatterDataPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ScatterDataPoint | null>(null);

  // Use spatial query to get filtered data
  const { result, isLoading: spatialLoading, error: spatialError } = useSafetySpatialQuery(selectedGeometry, filters);

  // Process data when spatial query result changes
  useEffect(() => {
    const processData = async () => {
      if (!result?.data || result.data.length === 0) {
        setScatterData([]);
        setIsProcessing(false);
        setError(null);
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Group incidents by location
        const locationMap = new Map<string, {
          incidents: number;
          bikeTrafficLevels: string[];
          pedTrafficLevels: string[];
        }>();

        // Process each incident
        result.data.forEach(incident => {
          const locationKey = incident.loc_desc || 'Unknown Location';
          
          if (!locationMap.has(locationKey)) {
            locationMap.set(locationKey, {
              incidents: 0,
              bikeTrafficLevels: [],
              pedTrafficLevels: []
            });
          }
          
          const location = locationMap.get(locationKey)!;
          location.incidents += 1;
          
          // Collect traffic levels for this location
          if (incident.bike_traffic) {
            location.bikeTrafficLevels.push(incident.bike_traffic.toLowerCase());
          }
          if (incident.ped_traffic) {
            location.pedTrafficLevels.push(incident.ped_traffic.toLowerCase());
          }
        });

        // Convert to scatter plot data
        const processedData: ScatterDataPoint[] = Array.from(locationMap.entries())
          .map(([locationName, data]) => {
            // Determine the highest traffic level for this location
            const getHighestTrafficLevel = (levels: string[]): 'low' | 'medium' | 'high' => {
              if (levels.length === 0) return 'low';
              
              const hasHigh = levels.some(level => level === 'high');
              const hasMedium = levels.some(level => level === 'medium');
              
              if (hasHigh) return 'high';
              if (hasMedium) return 'medium';
              return 'low';
            };

            // Get the highest traffic level between bike and pedestrian traffic
            const bikeLevel = getHighestTrafficLevel(data.bikeTrafficLevels);
            const pedLevel = getHighestTrafficLevel(data.pedTrafficLevels);
            
            // Use the highest level between the two
            const trafficLevels = [bikeLevel, pedLevel];
            const highestLevel = trafficLevels.includes('high') ? 'high' : 
                               trafficLevels.includes('medium') ? 'medium' : 'low';

            // Convert traffic level to x-coordinate
            const x = highestLevel === 'low' ? 1 : highestLevel === 'medium' ? 2 : 3;

            return {
              location: locationName,
              incidentCount: data.incidents,
              trafficLevel: highestLevel as 'low' | 'medium' | 'high',
              x: x
            };
          })
          .filter(point => point.incidentCount > 0) // Only include locations with incidents
          .sort((a, b) => b.incidentCount - a.incidentCount); // Sort by incident count

        setScatterData(processedData);
      } catch (err) {
        console.error('Error processing traffic ratios data:', err);
        setError('Failed to process traffic ratios data');
        setScatterData([]);
      } finally {
        setIsProcessing(false);
      }
    };

    processData();
  }, [result]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: any) => {
        const [x, y, location] = params.value;
        const trafficLevel = x === 1 ? 'low' : x === 2 ? 'medium' : 'high';
        setHoveredPoint({
          location,
          incidentCount: y,
          trafficLevel: trafficLevel as 'low' | 'medium' | 'high',
          x
        });
      },
      mouseout: () => {
        setHoveredPoint(null);
      },
    }),
    [],
  );

  const option = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      grid: {
        left: '64px',
        right: '20px',
        top: '40px',
        bottom: '60px',
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        name: 'Traffic Volume Level',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
        },
        min: 0.5,
        max: 3.5,
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
            if (value === 1) return 'Low';
            if (value === 2) return 'Medium';
            if (value === 3) return 'High';
            return '';
          },
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Number of Incidents',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
        },
        min: 0,
        max: (value: any) => {
          const maxIncidents = Math.max(...scatterData.map(point => point.incidentCount));
          return Math.ceil(maxIncidents * 1.2); // Add 20% padding above the highest point
        },
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
          name: 'Locations',
          data: scatterData.map(point => [point.x, point.incidentCount, point.location]),
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
    [scatterData],
  );

  const hasData = scatterData.length > 0;
  const isLoading = spatialLoading || isProcessing;
  const hasError = spatialError || error;

  return (
    <div id="safety-incidents-vs-traffic-ratios" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-incidents-vs-traffic-header" className="flex items-center justify-between mb-2">
        <h3 id="safety-incidents-vs-traffic-title" className="text-base font-medium text-gray-700">Incidents vs. Traffic Ratios</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <>
          {selectedGeometry && (
            <>
              <hr className="border-gray-200 mb-2" />
              <p id="safety-incidents-vs-traffic-description" className="w-full text-sm text-gray-600 mb-6">
                Relationship between traffic volume levels and incident counts by location
                <span id="safety-incidents-vs-traffic-info-icon-container" className="ml-1 inline-flex align-middle">
                  <MoreInformationIcon />
                </span>
              </p>
            </>
          )}

          <div id="safety-incidents-vs-traffic-chart-container" className="relative">
            {hoveredPoint ? (
              <div
                id="safety-incidents-vs-traffic-tooltip"
                className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10 text-sm font-medium text-center"
                style={{ color: '#3b82f6', minWidth: '340px' }}
              >
                <div>{hoveredPoint.location}</div>
                <div>{hoveredPoint.incidentCount} incidents</div>
              </div>
            ) : hasData ? (
              <div
                id="safety-incidents-vs-traffic-hover-hint"
                className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 text-sm italic text-gray-400 whitespace-nowrap"
              >
                Hover over point to see details
              </div>
            ) : null}

            {/* No selection state */}
            {!selectedGeometry && (
              <div id="safety-incidents-vs-traffic-no-selection" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
                <div id="safety-incidents-vs-traffic-instruction-icon" className="mb-2 text-gray-400">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <p id="safety-incidents-vs-traffic-instruction-text" className="text-sm text-gray-600 mb-1">
                  Select a region on the map
                </p>
                <p id="safety-incidents-vs-traffic-instruction-subtext" className="text-xs text-gray-500">
                  Use the polygon tool or click on a boundary to see traffic ratio data for that area
                </p>
              </div>
            )}

            {/* Data display with loading overlay */}
            {selectedGeometry && (
              <div id="safety-incidents-vs-traffic-data-container" className="relative">
                {/* Loading overlay */}
                {isLoading && (
                  <div 
                    id="safety-incidents-vs-traffic-loading-overlay" 
                    className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-20 rounded-md"
                  >
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                      <span className="text-sm text-gray-700 font-medium">Loading traffic ratios...</span>
                      <span className="text-xs text-gray-500 mt-1">Analyzing incident patterns</span>
                    </div>
                  </div>
                )}

                {/* Data content */}
                <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'} min-h-[320px]`}>
                  {hasData && !hasError ? (
                    <div id="safety-incidents-vs-traffic-chart">
                      <ReactECharts
                        option={option}
                        style={{ height: '320px', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                        onEvents={onEvents}
                      />
                    </div>
                  ) : hasError ? (
                    <div id="safety-incidents-vs-traffic-error" className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[320px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm text-red-800">
                          <strong>Data Error:</strong> Unable to load traffic ratio data
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Try selecting a different area or adjusting filters.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div id="safety-incidents-vs-traffic-no-data" className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center min-h-[320px]">
                      <div id="safety-incidents-vs-traffic-no-data-icon" className="mb-2 text-gray-400">
                        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p id="safety-incidents-vs-traffic-no-data-text" className="text-sm text-gray-600">
                        No incident data available
                      </p>
                      <p id="safety-incidents-vs-traffic-no-data-subtext" className="text-xs text-gray-500">
                        Try adjusting your filters or selecting a different area
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 