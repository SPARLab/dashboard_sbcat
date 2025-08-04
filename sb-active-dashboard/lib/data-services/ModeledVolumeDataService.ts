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
  count_type: string;
}

const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";

export class ModeledVolumeDataService {
  private lineSegmentLayer: FeatureLayer | null = null;
  private trafficDataTable: FeatureLayer | null = null;
  
  constructor() {
    this.initializeLayers();
  }

  private initializeLayers() {
    // Note: Hexagon visualization layer is handled separately by volumeLayers.ts
    // This service focuses on data layers for spatial querying only

    // Layer 0: StravaNetwork (for geometry)
    this.lineSegmentLayer = new FeatureLayer({
      url: `${BASE_URL}/0`,
      title: "Strava Network (Geometry)",
      visible: false,
      outFields: ["edgeuid", "streetName"] // Use lowercase 'edgeuid'
    });

    // Layer 4: CostBenefitAADTs (for data)
    this.trafficDataTable = new FeatureLayer({
      url: `${BASE_URL}/4`,
      title: "Cost Benefit AADTs (Data)",
      visible: false,
      outFields: ["strava_id", "aadt", "year", "count_type", "network_id"]
    });
  }

  getLayers(): FeatureLayer[] {
    const layers: FeatureLayer[] = [];
    if (this.lineSegmentLayer) layers.push(this.lineSegmentLayer);
    return layers;
  }

  setVisibility(visible: boolean) {
    if (this.lineSegmentLayer) this.lineSegmentLayer.visible = visible;
  }

  async getTrafficLevelData(mapView: MapView, config: ModeledDataConfig): Promise<TrafficLevelData> {
    return this.getTrafficLevelDataWithGeometry(mapView, config, mapView.extent);
  }

  async getTrafficLevelDataWithGeometry(mapView: MapView, config: ModeledDataConfig, geometry: Geometry): Promise<TrafficLevelData> {
    if (!this.lineSegmentLayer || !this.trafficDataTable) {
      console.warn('⚠️ Required layers not available - using simulation data');
      return this.generateSimulatedTrafficLevelData(mapView, config);
    }

    try {
      const networkQuery = this.lineSegmentLayer.createQuery();
      networkQuery.geometry = geometry;
      networkQuery.spatialRelationship = "intersects";
      networkQuery.returnGeometry = true;
      networkQuery.outFields = ["edgeuid"];

      const networkResult = await this.lineSegmentLayer.queryFeatures(networkQuery as __esri.QueryProperties);

      if (networkResult.features.length === 0) {
        return this.generateSimulatedTrafficLevelData(mapView, config, true);
      }

      const edgeuids = networkResult.features.map(f => f.attributes.edgeuid).filter(id => id != null);
      
      if (edgeuids.length === 0) {
        return this.generateSimulatedTrafficLevelData(mapView, config, true);
      }

      const dataQuery = this.trafficDataTable.createQuery();
      dataQuery.where = this.buildTrafficDataWhereClause(edgeuids, config);
      dataQuery.outFields = ["network_id", "aadt", "count_type"];

      const dataResult = await this.trafficDataTable.queryFeatures(dataQuery as __esri.QueryProperties);
      
      return this.processJoinedTrafficData(networkResult.features, dataResult.features, config);

    } catch (error) {
      console.error("ModeledVolumeDataService: Error processing traffic data.", error);
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

    if (config.dataSource === 'dillon') {
      clauses.push(`year = ${config.year}`);
    }

    if (config.countTypes.length > 0) {
      const typeClause = config.countTypes.map(type => `'${type}'`).join(', ');
      clauses.push(`count_type IN (${typeClause})`);
    }

    clauses.push("aadt IS NOT NULL AND aadt > 0");
    return clauses.join(" AND ");
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
      
      let segmentAADT = 0;
      if (config.countTypes.length > 1) {
        segmentAADT = trafficRecords.reduce((sum, record) => sum + (record.aadt || 0), 0) / trafficRecords.length;
      } else {
        segmentAADT = trafficRecords.reduce((sum, record) => sum + (record.aadt || 0), 0);
      }

      const segmentLength = geometryEngine.geodesicLength(networkFeature.geometry as Polyline, "miles");

      if (segmentAADT < 50) {
        lowMiles += segmentLength;
        lowSegments++;
      } else if (segmentAADT < 200) {
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
