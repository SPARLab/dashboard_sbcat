/**
 * Safety App Type Definitions
 * Defines interfaces for the new ArcGIS Safety Incidents data structure
 */

export interface SafetyIncident {
  OBJECTID: number;
  id: number;
  source_id: string;
  timestamp: Date;
  conflict_type: string;
  severity: string;
  pedestrian_involved: number; // 0 or 1
  bicyclist_involved: number; // 0 or 1  
  vehicle_involved: number; // 0 or 1
  loc_desc: string;
  data_source: string; // 'SWITRS' | 'BikeMaps.org'
  strava_id?: number;
  bike_traffic?: string; // 'low' | 'medium' | 'high'
  ped_traffic?: string; // 'low' | 'medium' | 'high'
  geometry: __esri.Point;
}

export interface IncidentParty {
  OBJECTID: number;
  incident_id: number;
  party_number: number;
  victim_number: number;
  party_type: string;
  injury_severity: string; // 'fatal' | 'severe_injury' | 'injury' | 'property_damage_only'
  bicycle_type?: string;
  age?: string;
  gender?: string;
}

export interface IncidentHeatmapWeight {
  OBJECTID: number;
  model: string;
  road_user: string; // 'pedestrian' | 'bicyclist'
  exposure: number; // Weight for incident-to-volume ratio calculation
  year: number;
  incident_id: number;
}

// Joined data structure for analysis
export interface EnrichedSafetyIncident extends SafetyIncident {
  parties: IncidentParty[];
  
  // Computed fields
  maxSeverity: string; // Most severe injury from all parties or from incident severity
  totalParties: number;
  hasTrafficData: boolean;
  bikeTrafficLevel?: string; // 'low' | 'medium' | 'high'
  pedTrafficLevel?: string; // 'low' | 'medium' | 'high'
}

// Filter interfaces
export interface SafetyFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  dataSource: ('SWITRS' | 'BikeMaps.org')[];
  conflictType: string[];
  severityTypes: ('Fatality' | 'Severe Injury' | 'Injury' | 'No Injury' | 'Unknown')[];
  roadUser: ('pedestrian' | 'bicyclist')[];
  showPedestrian: boolean;
  showBicyclist: boolean;
  ebikeMode?: boolean; // When true, filters for e-bike specific incidents
  timeOfDay?: {
    enabled: boolean;
    periods: ('morning' | 'afternoon' | 'evening')[];
  };
  weekdayFilter?: {
    enabled: boolean;
    type: 'weekdays' | 'weekends';
  };
  excludeHighwayIncidents?: boolean; // When true, filters out incidents on Caltrans highways
}

// Chart data interfaces
export interface SafetySummaryData {
  totalIncidents: number;
  bikeIncidents: number;
  pedIncidents: number;
  fatalIncidents: number;
  severeInjuryIncidents: number; // Separate field for Severe Injury
  injuryIncidents: number; // Now only regular Injury (not including Severe Injury)
  nearMissIncidents: number;
  unknownIncidents: number;
  avgSeverityScore: number;
  incidentsPerDay: number;
  dataSourceBreakdown: {
    switrs: number;
    bikemaps: number;
  };
}

export interface MostDangerousAreasData {
  areas: Array<{
    location: string;
    incidentCount: number;
    bikeIncidents: number;
    pedIncidents: number;
    severityScore: number;
    fatalityCount: number;
    geometry: __esri.Geometry;
    conflictTypes: string[];
  }>;
}

export interface SeverityBreakdownData {
  categories: string[];
  bikeData: number[];
  pedData: number[];
  totalByCategory: number[];
  percentages: {
    bike: number[];
    ped: number[];
  };
}

export interface ConflictTypeBreakdownData {
  categories: string[];
  data: Array<{
    name: string;
    value: number;
    percentage: number;
    bikeCount: number;
    pedCount: number;
  }>;
}

export interface AnnualIncidentsComparisonData {
  categories: string[]; // Years
  series: Array<{
    name: string; // 'Bicycle Incidents' | 'Pedestrian Incidents'
    data: (number | null)[]; // Allow null for months/periods that shouldn't be displayed
  }>;
}

export interface IncidentsVsTrafficRatiosData {
  areas: Array<{
    name: string;
    incidents: number;
    volume: number;
    ratio: number; // incidents per 1000 volume units
    riskLevel: 'low' | 'medium' | 'high';
    geometry: __esri.Geometry;
  }>;
}

// Map visualization types
export type SafetyVisualizationType = 'raw-incidents' | 'incident-heatmap' | 'incident-to-volume-ratio';

export interface SafetyMapState {
  activeVisualization: SafetyVisualizationType;
  selectedGeometry: __esri.Polygon | null;
  currentExtent: __esri.Extent | null;
  filters: SafetyFilters;
}

// API response types
export interface SafetyDataQueryResult {
  incidents: SafetyIncident[];
  parties: IncidentParty[];
  isLoading: boolean;
  error: string | null;
}

export interface SafetyAnalysisResult {
  data: EnrichedSafetyIncident[];
  summary: SafetySummaryData;
  isLoading: boolean;
  error: string | null;
}