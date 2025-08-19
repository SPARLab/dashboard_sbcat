/**
 * Modeled Volume Data Service
 * Handles Dillon's Cost Benefit Tool data using a two-layer approach:
 * 1. A geometry layer for the street network (`StravaNetwork`)
 * 2. A data table for AADT values (`CostBenefitAADTs`)
 */

import Geometry from "@arcgis/core/geometry/Geometry";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import Polyline from "@arcgis/core/geometry/Polyline";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";

interface ModeledDataConfig {
  dataSource: 'dillon' | 'lily';
  countTypes: ('bike' | 'ped')[];
  dateRange: { start: Date; end: Date };
  year: number;
  modelCountsBy?: 'cost-benefit' | 'strava-bias';
}

interface TrafficLevelData {
  categories: string[];
  totalMiles: number[];
  details: {
    low: { miles: number; segments: number };
    medium: { miles: number; segments: number };
    high: { miles: number; segments: number };
  };
}

interface TrafficDataAttributes {
  network_id: string;
  aadt: number;
  aadt_bin?: string; // For Strava Bias Corrected model
  count_type: string;
}

const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";

export class ModeledVolumeDataService {
  private lineSegmentLayer: FeatureLayer | null = null;
  private costBenefitBikesTable: FeatureLayer | null = null;
  private costBenefitPedsTable: FeatureLayer | null = null;
  private stravaBiasBikesTable: FeatureLayer | null = null;
  private stravaBiasPedsTable: FeatureLayer | null = null;
  
  constructor() {
    this.initializeLayers();
  }

  private initializeLayers() {
    // Note: Hexagon visualization layer is handled separately by volumeLayers.ts
    // This service focuses on data layers for spatial querying only

    // Layer 0: StravaNetwork (for geometry) - now enriched with volume level attributes
    this.lineSegmentLayer = new FeatureLayer({
      url: `${BASE_URL}/0`,
      title: "Strava Network (Geometry)",
      visible: false,
      outFields: [
        "id", "street", "SHAPE__Length",
        // Cost Benefit Tool attributes
        "cos_2019_bike", "cos_2019_ped", "cos_2020_bike", "cos_2020_ped",
        "cos_2021_bike", "cos_2021_ped", "cos_2022_bike", "cos_2022_ped", 
        "cos_2023_bike", "cos_2023_ped",
        // Strava Bias Corrected attributes  
        "str_2023_bike", "str_2023_ped"
      ]
    });

    // For now, use the existing working table configuration for cost-benefit
    // We'll need to determine the correct table numbers for the separate tables
    this.costBenefitBikesTable = new FeatureLayer({
      url: `${BASE_URL}/4`,
      title: "Cost Benefit AADTs (Data)",
      visible: false,
      outFields: ["strava_id", "aadt", "year", "count_type", "network_id"]
    });

    this.costBenefitPedsTable = new FeatureLayer({
      url: `${BASE_URL}/4`,
      title: "Cost Benefit AADTs (Data)",
      visible: false,
      outFields: ["strava_id", "aadt", "year", "count_type", "network_id"]
    });

    // TODO: Update these URLs once we know the correct table numbers for Strava bias corrected data
    this.stravaBiasBikesTable = new FeatureLayer({
      url: `${BASE_URL}/4`,
      title: "Strava Bias Corrected AADTs (Data)",
      visible: false,
      outFields: ["strava_id", "aadt", "year", "count_type", "network_id"]
    });

    this.stravaBiasPedsTable = new FeatureLayer({
      url: `${BASE_URL}/4`,
      title: "Strava Bias Corrected AADTs (Data)",
      visible: false,
      outFields: ["strava_id", "aadt", "year", "count_type", "network_id"]
    });
  }

  getLayers(): FeatureLayer[] {
    const layers: FeatureLayer[] = [];
    if (this.lineSegmentLayer) layers.push(this.lineSegmentLayer);
    return layers;
  }

  /**
   * Get the appropriate data tables based on model type and count types
   */
  private getDataTablesForConfig(config: ModeledDataConfig): FeatureLayer[] {
    const tables: FeatureLayer[] = [];
    const modelType = config.modelCountsBy || 'cost-benefit';
    
    if (config.countTypes.includes('bike')) {
      if (modelType === 'cost-benefit' && this.costBenefitBikesTable) {
        tables.push(this.costBenefitBikesTable);
      } else if (modelType === 'strava-bias' && this.stravaBiasBikesTable) {
        tables.push(this.stravaBiasBikesTable);
      }
    }
    
    if (config.countTypes.includes('ped')) {
      if (modelType === 'cost-benefit' && this.costBenefitPedsTable) {
        tables.push(this.costBenefitPedsTable);
      } else if (modelType === 'strava-bias' && this.stravaBiasPedsTable) {
        tables.push(this.stravaBiasPedsTable);
      }
    }
    
    return tables;
  }

  setVisibility(visible: boolean) {
    if (this.lineSegmentLayer) this.lineSegmentLayer.visible = visible;
  }

  /**
   * Check if data is available for the given year and data source
   */
  isDataAvailable(year: number, dataSource: 'dillon' | 'lily'): boolean {
    // Dillon's data (both cost-benefit and strava-bias) available for 2019-2023
    if (dataSource === 'dillon') {
      return year >= 2019 && year <= 2023;
    }
    
    // Lily's data only available for 2023
    if (dataSource === 'lily') {
      return year === 2023;
    }
    
    return false;
  }

  async getTrafficLevelData(mapView: MapView, config: ModeledDataConfig): Promise<TrafficLevelData> {
    return this.getTrafficLevelDataWithGeometry(mapView, config, mapView.extent);
  }

  async getTrafficLevelDataWithGeometry(mapView: MapView, config: ModeledDataConfig, geometry: Geometry): Promise<TrafficLevelData> {
    if (!this.lineSegmentLayer) {
      console.warn('⚠️ Line segment layer not available - using simulation data');
      return this.generateSimulatedTrafficLevelData(mapView, config);
    }

    try {
      // Query the enriched geometry layer directly
      const networkQuery = this.lineSegmentLayer.createQuery();
      networkQuery.geometry = geometry;
      networkQuery.spatialRelationship = "intersects";
      networkQuery.returnGeometry = true;
      networkQuery.outFields = [
        "id", "SHAPE__Length",
        // Cost Benefit Tool attributes
        "cos_2019_bike", "cos_2019_ped", "cos_2020_bike", "cos_2020_ped",
        "cos_2021_bike", "cos_2021_ped", "cos_2022_bike", "cos_2022_ped", 
        "cos_2023_bike", "cos_2023_ped",
        // Strava Bias Corrected attributes  
        "str_2023_bike", "str_2023_ped"
      ];

      const networkResult = await this.lineSegmentLayer.queryFeatures(networkQuery as __esri.QueryProperties);

      if (networkResult.features.length === 0) {
        return this.generateSimulatedTrafficLevelData(mapView, config, true);
      }

      // Process the enriched geometry data directly (no joins needed)
      return this.processEnrichedGeometryData(networkResult.features, config);

    } catch (error) {
      console.error("ModeledVolumeDataService: Error processing enriched geometry data.", error);
      return this.generateSimulatedTrafficLevelData(mapView, config, true);
    }
  }

  private buildTrafficDataWhereClause(edgeuids: number[], config: ModeledDataConfig): string {
    const clauses: string[] = [];
    
    // Create a series of OR statements for the network_id. This is necessary because the ID is a string.
    const networkIdClauses = edgeuids.map(id => `network_id = 'edge_${id}'`);
    if (networkIdClauses.length > 0) {
        clauses.push(`(${networkIdClauses.join(' OR ')})`);
    } else {
        // If there are no IDs, return a query that finds nothing.
        return "1=0";
    }

    // Add year filter
    clauses.push(`year = ${config.year}`);

    // Add count_type filter since we're using the same table for all data for now
    if (config.countTypes.length > 0) {
      const typeClause = config.countTypes.map(type => `'${type}'`).join(', ');
      clauses.push(`count_type IN (${typeClause})`);
    }

    clauses.push("aadt IS NOT NULL AND aadt > 0");
    return clauses.join(" AND ");
  }
  
  /**
   * Process enriched geometry data directly from the line layer attributes
   * Uses the cos_ and str_ attributes that contain "Low", "Medium", "High" values
   */
  private processEnrichedGeometryData(
    networkFeatures: __esri.Graphic[], 
    config: ModeledDataConfig
  ): TrafficLevelData {
    let lowMiles = 0, mediumMiles = 0, highMiles = 0;
    let lowSegments = 0, mediumSegments = 0, highSegments = 0;

    networkFeatures.forEach(networkFeature => {
      const attributes = networkFeature.attributes;
      const segmentLength = attributes.SHAPE__Length ? 
        attributes.SHAPE__Length * 0.000621371 : // Convert meters to miles
        1; // Fallback to 1 mile if length not available

      // Determine the appropriate attribute field based on config
      const modelType = config.modelCountsBy || 'cost-benefit';
      const year = config.year;
      
      let volumeLevels: string[] = [];
      
      // Collect volume levels for all requested count types
      config.countTypes.forEach(countType => {
        let attributeField: string;
        
        if (modelType === 'cost-benefit') {
          attributeField = `cos_${year}_${countType}`;
        } else if (modelType === 'strava-bias') {
          // Strava bias corrected data only available for 2023
          attributeField = `str_2023_${countType}`;
        } else {
          return; // Skip unknown model types
        }
        
        const volumeLevel = attributes[attributeField];
        if (volumeLevel && ['Low', 'Medium', 'High'].includes(volumeLevel)) {
          volumeLevels.push(volumeLevel);
        }
      });

      if (volumeLevels.length === 0) {
        return; // Skip segments with no valid volume data
      }

      // Use the highest volume level when multiple count types are selected
      // This matches the logic used in the original processJoinedTrafficData method
      let segmentVolumeLevel: 'low' | 'medium' | 'high';
      if (volumeLevels.includes('High')) {
        segmentVolumeLevel = 'high';
      } else if (volumeLevels.includes('Medium')) {
        segmentVolumeLevel = 'medium';
      } else {
        segmentVolumeLevel = 'low';
      }

      // Accumulate miles and segments by volume level
      if (segmentVolumeLevel === 'low') {
        lowMiles += segmentLength;
        lowSegments++;
      } else if (segmentVolumeLevel === 'medium') {
        mediumMiles += segmentLength;
        mediumSegments++;
      } else {
        highMiles += segmentLength;
        highSegments++;
      }
    });

    return {
      categories: ['Low', 'Medium', 'High'],
      totalMiles: [lowMiles, mediumMiles, highMiles],
      details: {
        low: { miles: lowMiles, segments: lowSegments },
        medium: { miles: mediumMiles, segments: mediumSegments },
        high: { miles: highMiles, segments: highSegments }
      }
    };
  }

  private processJoinedTrafficData(
    networkFeatures: __esri.Graphic[], 
    dataFeatures: __esri.Graphic[], 
    config: ModeledDataConfig
  ): TrafficLevelData {
    
    const trafficDataMap = new Map<string, TrafficDataAttributes[]>();
    dataFeatures.forEach(feature => {
      const networkId = feature.attributes.network_id;
      if (networkId != null) {
        if (!trafficDataMap.has(networkId)) {
          trafficDataMap.set(networkId, []);
        }
        trafficDataMap.get(networkId)!.push(feature.attributes);
      }
    });

    let lowMiles = 0, mediumMiles = 0, highMiles = 0;
    let lowSegments = 0, mediumSegments = 0, highSegments = 0;

    networkFeatures.forEach(networkFeature => {
      const edgeuid = networkFeature.attributes.edgeuid;
      const networkIdKey = `edge_${edgeuid}`;
      const trafficRecords = trafficDataMap.get(networkIdKey);

      if (!trafficRecords || trafficRecords.length === 0) {
        return; 
      }
      
      // Calculate the maximum AADT value across all records for this segment
      // This implements the requirement to use the maximum volume level when both bike and ped data exist
      const aadtValues = trafficRecords.map(record => record.aadt || 0);
      const maxAADT = Math.max(...aadtValues);
      
      let segmentVolumeLevel: 'low' | 'medium' | 'high';
      if (maxAADT < 50) {
        segmentVolumeLevel = 'low';
      } else if (maxAADT < 200) {
        segmentVolumeLevel = 'medium';
      } else {
        segmentVolumeLevel = 'high';
      }

      const segmentLength = geometryEngine.geodesicLength(networkFeature.geometry as Polyline, "miles");

      if (segmentVolumeLevel === 'low') {
        lowMiles += segmentLength;
        lowSegments++;
      } else if (segmentVolumeLevel === 'medium') {
        mediumMiles += segmentLength;
        mediumSegments++;
      } else {
        highMiles += segmentLength;
        highSegments++;
      }
    });

    return {
      categories: ['Low', 'Medium', 'High'],
      totalMiles: [lowMiles, mediumMiles, highMiles],
      details: {
        low: { miles: lowMiles, segments: lowSegments },
        medium: { miles: mediumMiles, segments: mediumSegments },
        high: { miles: highMiles, segments: highSegments }
      }
    };
  }

  private generateSimulatedTrafficLevelData(
    mapView: MapView, 
    config: ModeledDataConfig,
    isEmpty: boolean = false
  ): TrafficLevelData {
      if(isEmpty) {
          return {
              categories: ['Low', 'Medium', 'High'],
              totalMiles: [0, 0, 0],
              details: { low: { miles: 0, segments: 0 }, medium: { miles: 0, segments: 0 }, high: { miles: 0, segments: 0 } }
          };
      }

    const urbanFactor = Math.abs((mapView.center?.longitude ?? 0) + 119.7) < 0.5 ? 1.5 : 1.0;
    const zoomFactor = Math.max(0.5, Math.min(2.0, mapView.zoom / 10));
    const modeFactor = (config.countTypes.length > 0) ? config.countTypes.length : 1;
    
    const lowMiles = Math.round((95 + Math.random() * 40) * urbanFactor * zoomFactor * modeFactor);
    const mediumMiles = Math.round((110 + Math.random() * 35) * urbanFactor * zoomFactor * modeFactor);
    const highMiles = Math.round((90 + Math.random() * 60) * urbanFactor * zoomFactor * modeFactor);
    
    return {
      categories: ['Low', 'Medium', 'High'],
      totalMiles: [lowMiles, mediumMiles, highMiles],
      details: {
        low: { miles: lowMiles, segments: Math.round(lowMiles * 4) },
        medium: { miles: mediumMiles, segments: Math.round(mediumMiles * 3) },
        high: { miles: highMiles, segments: Math.round(highMiles * 2.5) }
      }
    };
  }
}
