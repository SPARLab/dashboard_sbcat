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
  private weightsLayer: FeatureLayer;

  constructor() {
    const layers = SafetyIncidentsDataService.initializeLayers();
    this.incidentsLayer = layers.incidentsLayer;
    this.partiesLayer = layers.partiesLayer;
    this.weightsLayer = layers.weightsLayer;
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
    filters?: Partial<SafetyFilters>
  ): Promise<SeverityBreakdownData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters
    );

    const incidents = result.data;
    const categories = ['Fatal', 'Severe Injury', 'Injury', 'Property Damage Only', 'Near Miss'];
    
    const bikeIncidents = incidents.filter(inc => inc.bicyclist_involved === 1);
    const pedIncidents = incidents.filter(inc => inc.pedestrian_involved === 1);

    const countBySeverity = (incidentList: EnrichedSafetyIncident[], severity: string) => {
      if (severity === 'Near Miss') {
        return incidentList.filter(inc => !inc.maxSeverity && inc.data_source === 'BikeMaps').length;
      }
      return incidentList.filter(inc => inc.maxSeverity === severity.toLowerCase().replace(' ', '_')).length;
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
    filters?: Partial<SafetyFilters>
  ): Promise<ConflictTypeBreakdownData> {
    const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
      mapView.extent,
      filters
    );

    const incidents = result.data;
    const conflictTypeCounts = new Map<string, { total: number; bike: number; ped: number }>();

    // Count incidents by conflict type
    incidents.forEach(incident => {
      const conflictType = incident.conflict_type || 'Unknown';
      
      if (!conflictTypeCounts.has(conflictType)) {
        conflictTypeCounts.set(conflictType, { total: 0, bike: 0, ped: 0 });
      }
      
      const counts = conflictTypeCounts.get(conflictType)!;
      counts.total += 1;
      
      if (incident.bicyclist_involved === 1) counts.bike += 1;
      if (incident.pedestrian_involved === 1) counts.ped += 1;
    });

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
    // Get available years from data if not specified
    if (!years) {
      const result = await SafetyIncidentsDataService.getEnrichedSafetyData(mapView.extent, filters, geometry);
      const allYears = result.data.map(inc => new Date(inc.timestamp).getFullYear());
      const uniqueYears = Array.from(new Set(allYears)).sort();
      // Use all available years
      years = uniqueYears;
    }

    if (timeScale === 'Year') {
      // Year histogram showing total incidents per year
      const yearlyData = await Promise.all(
        years.map(async year => {
          const yearFilters = {
            ...filters,
            dateRange: {
              start: new Date(year, 0, 1),
              end: new Date(year, 11, 31)
            }
          };
          
          const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
            mapView.extent,
            yearFilters,
            geometry
          );
          
          return {
            year,
            totalIncidents: result.summary.totalIncidents
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

    // For Day and Month scales, compare patterns between years
    return await this.getTemporalComparisonData(mapView, filters, timeScale, years);
  }

  /**
   * Get temporal comparison data for Day and Month time scales
   */
  private async getTemporalComparisonData(
    mapView: MapView,
    filters: Partial<SafetyFilters> = {},
    timeScale: 'Day' | 'Month',
    years: number[]
  ): Promise<AnnualIncidentsComparisonData> {
    const yearData = await Promise.all(
      years.map(async year => {
        const yearFilters = {
          ...filters,
          dateRange: {
            start: new Date(year, 0, 1),
            end: new Date(year, 11, 31)
          }
        };
        
        const result = await SafetyIncidentsDataService.getEnrichedSafetyData(
          mapView.extent,
          yearFilters
        );
        
        return { year, incidents: result.data };
      })
    );

    if (timeScale === 'Day') {
      // Group by day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayData = years.map(year => {
        const yearIncidents = yearData.find(yd => yd.year === year)?.incidents || [];
        const dayCounts = new Array(7).fill(0);
        
        yearIncidents.forEach(incident => {
          const dayOfWeek = new Date(incident.timestamp).getDay();
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
        const yearIncidents = yearData.find(yd => yd.year === year)?.incidents || [];
        const monthCounts = new Array(12).fill(0);
        
        yearIncidents.forEach(incident => {
          const month = new Date(incident.timestamp).getMonth();
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

    // Filter incidents that have exposure weights
    const weightedIncidents = result.data.filter(inc => inc.hasWeight && inc.weightedExposure);

    if (weightedIncidents.length === 0) {
      return { areas: [] };
    }

    // Group incidents by geographic areas (simplified clustering)
    const areaData = await this.calculateRiskByArea(weightedIncidents);

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
        
        // Calculate severity score (weighted by exposure if available)
        const severityScore = cluster.incidents.reduce((sum, inc) => {
          let weight = 1;
          if (inc.maxSeverity === 'fatal') weight = 10;
          else if (inc.maxSeverity === 'severe_injury') weight = 5;
          else if (inc.maxSeverity === 'injury') weight = 3;
          else if (inc.maxSeverity === 'property_damage_only') weight = 1;
          
          return sum + (weight * (inc.weightedExposure || 1));
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
   * Calculate incident-to-volume risk ratios by geographic area
   */
  private async calculateRiskByArea(
    weightedIncidents: EnrichedSafetyIncident[]
  ): Promise<IncidentsVsTrafficRatiosData['areas']> {
    // Group incidents by approximate location for area analysis
    const areaMap = new Map<string, {
      incidents: number;
      totalExposure: number;
      geometries: __esri.Geometry[];
    }>();

    const areaSize = 1000; // 1km grid
    
    weightedIncidents.forEach(incident => {
      const point = incident.geometry;
      const areaKey = `${Math.floor(point.x / areaSize)}_${Math.floor(point.y / areaSize)}`;
      
      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          incidents: 0,
          totalExposure: 0,
          geometries: []
        });
      }
      
      const area = areaMap.get(areaKey)!;
      area.incidents += 1;
      area.totalExposure += incident.weightedExposure || 0;
      area.geometries.push(incident.geometry);
    });

    // Convert to areas array with risk calculations
    return Array.from(areaMap.entries())
      .map(([key, data]) => {
        const ratio = data.totalExposure > 0 ? (data.incidents / data.totalExposure) * 1000 : 0;
        
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (ratio > 10) riskLevel = 'high';
        else if (ratio > 5) riskLevel = 'medium';

        return {
          name: `Area ${key.replace('_', '-')}`,
          incidents: data.incidents,
          volume: Math.round(data.totalExposure),
          ratio: Math.round(ratio * 100) / 100,
          riskLevel,
          geometry: data.geometries[0] // Representative geometry
        };
      })
      .filter(area => area.incidents >= 3) // Only include areas with meaningful incident counts
      .sort((a, b) => b.ratio - a.ratio) // Sort by risk ratio
      .slice(0, 20); // Limit to top 20 areas
  }
}