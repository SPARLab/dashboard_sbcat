/**
 * Safety Chart Data Service
 * Centralized service for all safety chart data needs
 * Updated to use the new SafetyIncidentsDataService
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import {
    AnnualIncidentsComparisonData,
    ConflictTypeBreakdownData,
    EnrichedSafetyIncident,
    IncidentsVsTrafficRatiosData,
    MostDangerousAreasData,
    SafetyFilters,
    SafetySummaryData,
    SeverityBreakdownData
} from "../safety-app/types";
import { SafetyIncidentsDataService } from "./SafetyIncidentsDataService";

export class SafetyChartDataService {
  private incidentsLayer: FeatureLayer;
  private partiesLayer: FeatureLayer;
  private weightsLayer: FeatureLayer | null;

  constructor() {
    const layers = SafetyIncidentsDataService.initializeLayers();
    this.incidentsLayer = layers.incidentsLayer;
    this.partiesLayer = layers.partiesLayer;
    this.weightsLayer = null; // No longer needed
  }

  /**
   * Get data for Safety SummaryStatistics chart component
   */
  async getSummaryStatistics(
    mapView: MapView,
    filters?: Partial<SafetyFilters>,
    geometry?: __esri.Polygon,
  ): Promise<SafetySummaryData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters,
      geometry
    );
    
    return result.summary;
  }

  /**
   * Get data for MostDangerousAreas chart component
   */
  async getMostDangerousAreasData(
    mapView: MapView,
    filters?: Partial<SafetyFilters>,
    limit: number = 10
  ): Promise<MostDangerousAreasData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters
    );

    // Group incidents by location using spatial clustering
    const areas = await this.performSpatialClustering(result.data, limit);
    
    return { areas };
  }

  /**
   * Get data for SeverityBreakdown chart component
   */
  async getSeverityBreakdownData(
    mapView: MapView,
    filters?: Partial<SafetyFilters>,
    geometry?: __esri.Polygon
  ): Promise<SeverityBreakdownData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters,
      geometry
    );

    const incidents = result.data;
    
    // Updated categories to match UI expectations
    const categories = ['Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown'];
    
    const bikeIncidents = incidents.filter(inc => inc.bicyclist_involved === 1);
    const pedIncidents = incidents.filter(inc => inc.pedestrian_involved === 1);

    const countBySeverity = (incidentList: EnrichedSafetyIncident[], severity: string) => {
      let count = 0;
      
      if (severity === 'Fatality') {
        count = incidentList.filter(inc => inc.maxSeverity === 'Fatality').length;
      } else if (severity === 'Severe Injury') {
        count = incidentList.filter(inc => inc.maxSeverity === 'Severe Injury').length;
      } else if (severity === 'Injury') {
        count = incidentList.filter(inc => inc.maxSeverity === 'Injury').length;
      } else if (severity === 'No Injury') {
        count = incidentList.filter(inc => inc.maxSeverity === 'No Injury').length;
      } else if (severity === 'Unknown') {
        // Count incidents with no severity or from BikeMaps without severity
        count = incidentList.filter(inc => 
          !inc.maxSeverity || 
          inc.maxSeverity === 'Unknown' ||
          (inc.data_source === 'BikeMaps.org' && !inc.maxSeverity)
        ).length;
      }
      
      return count;
    };

    const bikeData = categories.map(cat => countBySeverity(bikeIncidents, cat));
    const pedData = categories.map(cat => countBySeverity(pedIncidents, cat));
    const totalByCategory = categories.map((_, index) => bikeData[index] + pedData[index]);

    return {
      categories,
      bikeData,
      pedData,
      totalByCategory,
      percentages: {
        bike: bikeData.map(count => bikeIncidents.length > 0 ? (count / bikeIncidents.length) * 100 : 0),
        ped: pedData.map(count => pedIncidents.length > 0 ? (count / pedIncidents.length) * 100 : 0)
      }
    };
  }

  /**
   * Get data for ConflictTypeBreakdown chart component
   */
  async getConflictTypeBreakdownData(
    mapView: MapView,
    filters?: Partial<SafetyFilters>,
    geometry?: __esri.Polygon
  ): Promise<ConflictTypeBreakdownData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters,
      geometry
    );

    const incidents = result.data;
    const conflictTypeCounts = new Map<string, { total: number; bike: number; ped: number }>();

    // Count incidents by conflict type
    incidents.forEach(incident => {
      let conflictType = incident.conflict_type || 'Unknown';
      
      // Handle special conflict types - convert empty/null/undefined to 'None'
      if (conflictType === '' || conflictType === null || conflictType === undefined) {
        conflictType = 'None';
      }
      
      if (!conflictTypeCounts.has(conflictType)) {
        conflictTypeCounts.set(conflictType, { total: 0, bike: 0, ped: 0 });
      }
      
      const counts = conflictTypeCounts.get(conflictType)!;
      counts.total += 1;
      
      if (incident.bicyclist_involved === 1) counts.bike += 1;
      if (incident.pedestrian_involved === 1) counts.ped += 1;
    });

    // Filter to only include conflict types that are selected in the filter
    const selectedConflictTypes = filters?.conflictType || [];
    if (selectedConflictTypes.length > 0) {
      // Only keep conflict types that are in the selected list
      const filteredCounts = new Map<string, { total: number; bike: number; ped: number }>();
      selectedConflictTypes.forEach(selectedType => {
        if (conflictTypeCounts.has(selectedType)) {
          filteredCounts.set(selectedType, conflictTypeCounts.get(selectedType)!);
        }
      });
      conflictTypeCounts.clear();
      filteredCounts.forEach((value, key) => {
        conflictTypeCounts.set(key, value);
      });
    }

    const totalIncidents = incidents.length;
    const categories = Array.from(conflictTypeCounts.keys());
    
    const data = categories.map(category => {
      const counts = conflictTypeCounts.get(category)!;
      return {
        name: category,
        value: counts.total,
        percentage: totalIncidents > 0 ? Math.round((counts.total / totalIncidents) * 100) : 0,
        bikeCount: counts.bike,
        pedCount: counts.ped
      };
    });

    // Sort by count descending
    data.sort((a, b) => b.value - a.value);

    return {
      categories: data.map(d => d.name),
      data
    };
  }

  /**
   * Get data for AnnualIncidentsComparison chart component
   */
  async getAnnualIncidentsComparisonData(
    mapView: MapView,
    filters?: Partial<SafetyFilters>,
    timeScale: 'Day' | 'Month' | 'Year' = 'Year',
    years?: number[],
    geometry?: __esri.Polygon,
  ): Promise<AnnualIncidentsComparisonData> {
    // Get available years from data if not specified (lightweight timestamps only)
    if (!years) {
      const timestamps = await SafetyIncidentsDataService.queryIncidentTimestamps(
        geometry || mapView.extent,
        filters
      );
      const allYears = timestamps.map(ts => ts.getFullYear());
      const uniqueYears = Array.from(new Set(allYears)).sort();
      years = uniqueYears;
    }

    if (timeScale === 'Year') {
      // Year histogram showing total incidents per year (lightweight count queries)
      const yearlyData = await Promise.all(
        years.map(async year => {
          const yearFilters = {
            ...filters,
            dateRange: {
              start: new Date(year, 0, 1),
              end: new Date(year, 11, 31)
            }
          };

          const totalForYear = await SafetyIncidentsDataService.queryIncidentCount(
            geometry || mapView.extent,
            yearFilters
          );

          return {
            year,
            totalIncidents: totalForYear
          };
        })
      );

      const categories = years.map(y => y.toString());
      const series = yearlyData.map((d, index) => {
        const data = new Array(categories.length).fill(null);
        data[index] = d.totalIncidents;
        return {
          name: d.year.toString(),
          data: data
        };
      });

      return {
        categories: categories,
        series: series
      };
    }

    // For Day and Month scales, compare patterns between years (respect geometry)
    return await this.getTemporalComparisonData(mapView, filters, timeScale, years, geometry);
  }

  /**
   * Get temporal comparison data for Day and Month time scales
   */
  private async getTemporalComparisonData(
    mapView: MapView,
    filters: Partial<SafetyFilters> = {},
    timeScale: 'Day' | 'Month',
    years: number[],
    geometry?: __esri.Polygon
  ): Promise<AnnualIncidentsComparisonData> {
    // Fetch minimal timestamps per year and aggregate client-side
    const yearData = await Promise.all(
      years.map(async year => {
        const yearFilters = {
          ...filters,
          dateRange: {
            start: new Date(year, 0, 1),
            end: new Date(year, 11, 31)
          }
        };

        const timestamps = await SafetyIncidentsDataService.queryIncidentTimestamps(
          geometry || mapView.extent,
          yearFilters
        );

        return { year, timestamps };
      })
    );

    if (timeScale === 'Day') {
      // Group by day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayData = years.map(year => {
        const yearTimestamps = yearData.find(yd => yd.year === year)?.timestamps || [];
        const dayCounts = new Array(7).fill(0);

        yearTimestamps.forEach(ts => {
          const dayOfWeek = ts.getDay();
          dayCounts[dayOfWeek]++;
        });

        return { year, data: dayCounts };
      });

      const categories = dayNames;
      const seriesData = years.map(year => ({
        name: `${year}`,
        data: dayData.find(d => d.year === year)?.data || new Array(7).fill(0)
      }));

      return {
        categories,
        series: seriesData
      };
    }

    if (timeScale === 'Month') {
      // Group by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthData = years.map(year => {
        const yearTimestamps = yearData.find(yd => yd.year === year)?.timestamps || [];
        const monthCounts = new Array(12).fill(0);

        yearTimestamps.forEach(ts => {
          const month = ts.getMonth();
          monthCounts[month]++;
        });

        return { year, data: monthCounts };
      });

      const categories = monthNames;
      const seriesData = years.map(year => ({
        name: `${year}`,
        data: monthData.find(d => d.year === year)?.data || new Array(12).fill(0)
      }));

      return {
        categories,
        series: seriesData
      };
    }

    // Fallback
    return { categories: [], series: [] };
  }

  /**
   * Get data for IncidentsVsTrafficRatios chart component
   */
  async getIncidentsVsTrafficRatiosData(
    mapView: MapView,
    filters?: Partial<SafetyFilters>
  ): Promise<IncidentsVsTrafficRatiosData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters
    );

    // Filter incidents that have traffic data
    const incidentsWithTrafficData = result.data.filter(inc => inc.hasTrafficData);

    if (incidentsWithTrafficData.length === 0) {
      return { areas: [] };
    }

    // Group incidents by geographic areas (simplified clustering)
    const areaData = await this.calculateRiskByArea(incidentsWithTrafficData);

    return { areas: areaData };
  }

  /**
   * Perform spatial clustering to identify dangerous areas
   */
  private async performSpatialClustering(
    incidents: EnrichedSafetyIncident[],
    limit: number
  ): Promise<MostDangerousAreasData['areas']> {
    // Simplified clustering implementation
    // In a real implementation, you'd use proper spatial clustering algorithms
    
    const clusters = new Map<string, {
      incidents: EnrichedSafetyIncident[];
      center: { x: number; y: number };
    }>();

    const clusterRadius = 500; // 500 meters
    
    incidents.forEach(incident => {
      const point = incident.geometry;
      const clusterKey = `${Math.floor(point.x / clusterRadius)}_${Math.floor(point.y / clusterRadius)}`;
      
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, {
          incidents: [],
          center: { x: point.x, y: point.y }
        });
      }
      
      clusters.get(clusterKey)!.incidents.push(incident);
    });

    // Convert clusters to areas and calculate statistics
    const areas = Array.from(clusters.entries())
      .map(([key, cluster]) => {
        const incidentCount = cluster.incidents.length;
        const bikeIncidents = cluster.incidents.filter(inc => inc.bicyclist_involved === 1).length;
        const pedIncidents = cluster.incidents.filter(inc => inc.pedestrian_involved === 1).length;
        const fatalityCount = cluster.incidents.filter(inc => inc.maxSeverity === 'fatal').length;
        
        // Calculate severity score (using traffic data if available)
        const severityScore = cluster.incidents.reduce((sum, inc) => {
          let weight = 1;
          if (inc.maxSeverity === 'fatal') weight = 10;
          else if (inc.maxSeverity === 'severe_injury') weight = 5;
          else if (inc.maxSeverity === 'injury') weight = 3;
          else if (inc.maxSeverity === 'property_damage_only') weight = 1;
          
          // Use traffic level as a multiplier if available
          const trafficMultiplier = inc.hasTrafficData ? 1.5 : 1;
          return sum + (weight * trafficMultiplier);
        }, 0);

        const conflictTypes = Array.from(new Set(
          cluster.incidents.map(inc => inc.conflict_type).filter(Boolean)
        ));

        return {
          location: `Cluster ${key.replace('_', ', ')}`, // Simplified naming
          incidentCount,
          bikeIncidents,
          pedIncidents,
          severityScore,
          fatalityCount,
          geometry: cluster.incidents[0].geometry, // Use first incident's geometry as representative
          conflictTypes
        };
      })
      .filter(area => area.incidentCount >= 2) // Only include areas with multiple incidents
      .sort((a, b) => b.severityScore - a.severityScore) // Sort by severity score
      .slice(0, limit);

    return areas;
  }

  /**
   * Calculate incident-to-volume risk ratios by location description
   */
  private async calculateRiskByArea(
    weightedIncidents: EnrichedSafetyIncident[]
  ): Promise<IncidentsVsTrafficRatiosData['areas']> {
    // Group incidents by location description
    const locationMap = new Map<string, {
      incidents: number;
      bikeTrafficLevels: string[];
      pedTrafficLevels: string[];
      geometries: __esri.Geometry[];
    }>();
    
    weightedIncidents.forEach(incident => {
      const locationKey = incident.loc_desc || 'Unknown Location';
      
      if (!locationMap.has(locationKey)) {
        locationMap.set(locationKey, {
          incidents: 0,
          bikeTrafficLevels: [],
          pedTrafficLevels: [],
          geometries: []
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
      
      location.geometries.push(incident.geometry);
    });

    // Convert to areas array with traffic level classification
    return Array.from(locationMap.entries())
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

        return {
          name: locationName,
          incidents: data.incidents,
          volume: highestLevel === 'high' ? 3 : highestLevel === 'medium' ? 2 : 1,
          ratio: data.incidents, // Just use incident count as the ratio
          riskLevel: highestLevel as 'low' | 'medium' | 'high',
          geometry: data.geometries[0] // Representative geometry
        };
      })
      .filter(area => area.incidents >= 1) // Include all locations with at least 1 incident
      .sort((a, b) => b.incidents - a.incidents) // Sort by incident count
      .slice(0, 20); // Limit to top 20 areas
  }
}