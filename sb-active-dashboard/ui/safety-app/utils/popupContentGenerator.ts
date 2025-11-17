import { hasEbikeParty } from "../../../lib/safety-app/utils/ebikeDetection";

// Global cache for parties data to avoid repeated API calls
let partiesCache: Map<number, any[]> | null = null;
let partiesCachePromise: Promise<void> | null = null;

/**
 * Formats a timestamp that is already in PDT
 * Assumes input timestamp is already in Pacific Daylight Time
 */
function formatTimestampPDT(timestamp: Date | number): string {
  const date = new Date(timestamp);
  
  // Format as "MMM D, YYYY, h:mm a PDT" - no timezone conversion needed
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  return date.toLocaleDateString('en-US', options) + ' PDT';
}

/**
 * Initialize the parties cache by fetching all parties data once
 */
async function initializePartiesCache(): Promise<void> {
  if (partiesCache) {
    return; // Already initialized
  }

  if (partiesCachePromise) {
    return partiesCachePromise; // Already initializing
  }

  partiesCachePromise = (async () => {
    try {
      // Import FeatureLayer dynamically
      const { default: FeatureLayer } = await import('@arcgis/core/layers/FeatureLayer');
      
      // Create parties layer
      const partiesLayer = new FeatureLayer({
        url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer/1",
        outFields: ["*"]
      });

      // Query all parties data with pagination to handle MaxRecordCount limits
      const allParties: any[] = [];
      let hasMore = true;
      let offsetId = 0;
      const pageSize = 2000; // Match typical ArcGIS limit
      
      while (hasMore) {
        const query = partiesLayer.createQuery();
        query.where = offsetId > 0 ? `objectid > ${offsetId}` : "1=1";
        query.outFields = ["*"];
        query.returnGeometry = false;
        query.orderByFields = ["objectid"];
        query.num = pageSize;
        
        const pageResult = await partiesLayer.queryFeatures(query);
        const pageFeatures = pageResult.features;
        
        if (pageFeatures.length === 0) {
          hasMore = false;
        } else {
          allParties.push(...pageFeatures);
          
          // Update offset for next page
          if (pageFeatures.length === pageSize) {
            offsetId = pageFeatures[pageFeatures.length - 1].attributes.objectid;
          } else {
            hasMore = false;
          }
        }
      }
      
      // Group parties by incident_id
      partiesCache = new Map();
      allParties.forEach(feature => {
        const party = feature.attributes;
        const incidentId = party.incident_id;
        
        if (!partiesCache!.has(incidentId)) {
          partiesCache!.set(incidentId, []);
        }
        partiesCache!.get(incidentId)!.push(party);
      });
      
    } catch (error) {
      console.error('Error initializing parties cache:', error);
      partiesCache = new Map(); // Initialize empty cache to avoid repeated failures
    }
  })();

  return partiesCachePromise;
}

/**
 * Public function to pre-initialize the parties cache
 * Call this when the safety app loads to avoid delays on first popup
 */
export async function preloadPartiesCache(): Promise<void> {
  return initializePartiesCache();
}

export interface IncidentPopupData {
  id?: string | number;
  source_id?: string;
  data_source?: string;
  timestamp?: Date | number;
  conflict_type?: string;
  severity?: string;
  maxSeverity?: string;
  pedestrian_involved?: boolean | number;
  bicyclist_involved?: boolean | number;
  vehicle_involved?: boolean | number;
  weightedExposure?: number;
  loc_desc?: string;
  parties?: Array<{
    party_number?: number;
    party_type?: string;
    injury_severity?: string;
    age?: number | string;
    bicycle_type?: string;
  }>;
}

export async function generateIncidentPopupContent(incidentData: IncidentPopupData): Promise<string> {
  // If no parties data is available, get it from the cache
  let enrichedIncidentData = incidentData;
  if (!incidentData.parties && incidentData.id) {
    try {
      // Initialize cache if needed
      await initializePartiesCache();
      
      // Get parties from cache
      const incidentId = typeof incidentData.id === 'string' ? parseInt(incidentData.id) : incidentData.id;
      const cachedParties = partiesCache?.get(incidentId) || [];
      
      if (cachedParties.length > 0) {
        enrichedIncidentData = { ...incidentData, parties: cachedParties };
      }
    } catch (error) {
      console.error('Error getting parties from cache:', error);
    }
  }
  
  // Check if this is an e-bike incident using the enriched data
  const isEbikeIncident = enrichedIncidentData.parties ? hasEbikeParty(enrichedIncidentData.parties) : false;
  
  let popupContent = `
    <div class="incident-popup" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; color: #333;">
      <style>
        .esri-feature-content .incident-popup p { margin: 0 !important; }
        .incident-popup p { margin: 0 !important; }
        .incident-popup strong { color: #2563eb; }
        .incident-popup .section { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
        .incident-popup .section:last-child { border-bottom: none; margin-bottom: 0; }
        .incident-popup .parties { background: #f8fafc; padding: 8px; border-radius: 4px; margin-top: 8px; }
        .incident-popup .ebike-header { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 8px 12px; margin: -8px -8px 12px -8px; border-radius: 4px 4px 0 0; font-weight: bold; color: #92400e; display: flex; align-items: center; gap: 6px; }
      </style>
  `;
  
  // Add E-bike header if applicable
  if (isEbikeIncident) {
    popupContent += `<div class="ebike-header">⚡ E-bike Incident</div>`;
  }
  
  // Basic incident information section
  popupContent += '<div class="section">';
  if (enrichedIncidentData.id) {
    popupContent += `<p style="margin: 0 !important;"><strong>Incident ID:</strong> ${enrichedIncidentData.id}</p>`;
  }
  
  if (enrichedIncidentData.data_source) {
    popupContent += `<p style="margin: 0 !important;"><strong>Source:</strong> ${enrichedIncidentData.data_source}</p>`;
  }
  
  if (enrichedIncidentData.timestamp) {
    const formattedDateTime = formatTimestampPDT(enrichedIncidentData.timestamp);
    popupContent += `<p style="margin: 0 !important;"><strong>Date & Time:</strong> ${formattedDateTime}</p>`;
  }
  
  if (enrichedIncidentData.loc_desc) {
    popupContent += `<p style="margin: 0 !important;"><strong>Location:</strong> ${enrichedIncidentData.loc_desc}</p>`;
  }
  popupContent += '</div>';

  // Incident details section
  popupContent += '<div class="section">';
  if (enrichedIncidentData.conflict_type) {
    let displayConflictType = enrichedIncidentData.conflict_type;
    
    if (isEbikeIncident && displayConflictType.startsWith('Bike vs')) {
      // Replace "Bike" with "E-bike" in the conflict type for e-bike incidents
      displayConflictType = displayConflictType.replace('Bike vs', 'E-bike vs');
    }
    
    popupContent += `<p style="margin: 0 !important;"><strong>Conflict Type:</strong> ${displayConflictType}</p>`;
  }

  // Severity information
  const severity = enrichedIncidentData.severity || enrichedIncidentData.maxSeverity;
  if (severity) {
    const severityColor = getSeverityColor(severity, enrichedIncidentData.data_source);
    const displayLabel = getSeverityDisplayLabel(severity, enrichedIncidentData.data_source);
    popupContent += `<p style="margin: 0 !important;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${displayLabel}</span></p>`;
  }

  // Involvement flags
  const involvement = getInvolvementText(enrichedIncidentData);
  if (involvement.length > 0) {
    if (isEbikeIncident) {
      // Highlight E-bike incidents with a special style
      popupContent += `<p style="margin: 0 !important;"><strong>Involved:</strong> <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⚡ ${involvement.join(', ')}</span></p>`;
    } else {
      popupContent += `<p style="margin: 0 !important;"><strong>Involved:</strong> ${involvement.join(', ')}</p>`;
    }
  }
  popupContent += '</div>';

  // Risk/weight information for incident-to-volume ratio
  if (enrichedIncidentData.weightedExposure) {
    popupContent += '<div class="section">';
    popupContent += `<p style="margin: 0 !important;"><strong>Risk Weight:</strong> ${enrichedIncidentData.weightedExposure.toFixed(3)}</p>`;
    popupContent += '<p style="margin: 0 !important; font-size: 0.85em; color: #6b7280;">Higher values indicate greater risk relative to selected volumes</p>';
    popupContent += '</div>';
  }

  // E-bike involvement boolean field
  popupContent += '<div class="section">';
  const hasEbike = enrichedIncidentData.parties ? hasEbikeParty(enrichedIncidentData.parties) : false;
  const ebikeStatus = hasEbike ? 'Yes' : 'No';
  const ebikeColor = hasEbike ? '#059669' : '#6b7280';
  popupContent += `<p style="margin: 0 !important;"><strong>E-bike Involved:</strong> <span style="color: ${ebikeColor}; font-weight: bold;">${ebikeStatus}</span></p>`;
  popupContent += '</div>';

  // Parties information if available
  if (enrichedIncidentData.parties && enrichedIncidentData.parties.length > 0) {
    popupContent += '<div class="section">';
    popupContent += `<p style="margin: 0 !important;"><strong>Parties Involved (${enrichedIncidentData.parties.length}):</strong></p>`;
    popupContent += '<div class="parties">';
    
    enrichedIncidentData.parties.forEach((party, index) => {
      popupContent += `<div style="margin-bottom: 6px; padding: 4px; background: white; border-radius: 3px;">`;
      popupContent += `<strong>Party ${index + 1}:</strong> `;
      
      if (party.party_type) {
        popupContent += `${party.party_type}`;
        
        // Add bicycle type information if available
        if (party.bicycle_type) {
          const bikeTypeColor = party.bicycle_type.toLowerCase() === 'ebike' ? '#059669' : '#6b7280';
          popupContent += ` <span style="color: ${bikeTypeColor}; font-weight: bold;">(${party.bicycle_type})</span>`;
        }
      }
      
      if (party.injury_severity) {
        const injuryColor = getSeverityColor(party.injury_severity, enrichedIncidentData.data_source);
        const displayLabel = getSeverityDisplayLabel(party.injury_severity, enrichedIncidentData.data_source);
        popupContent += ` - <span style="color: ${injuryColor};">${displayLabel}</span>`;
      }
      
      if (party.age) {
        popupContent += ` (Age: ${party.age})`;
      }
      
      popupContent += '</div>';
    });
    
    popupContent += '</div></div>';
  }

  popupContent += '</div>';
  return popupContent;
}

// Legacy function - now just calls the enhanced version
export async function generateRawIncidentPopupContent(
  attributes: any,
  enrichedIncidents?: any[]
): Promise<string> {
  // If we have cached enriched data, use it directly
  if (enrichedIncidents && enrichedIncidents.length > 0) {
    const enrichedData = enrichedIncidents.find(inc => 
      inc.id === attributes.id || inc.id === Number(attributes.id) || String(inc.id) === String(attributes.id)
    );
    
    if (enrichedData) {
      // Use the enriched data directly without fetching again
      return await generateIncidentPopupContent(enrichedData);
    }
  }
  
  // Fall back to the enhanced function which will fetch data if needed
  return await generateIncidentPopupContent(attributes);
}

function getSeverityColor(severity: string, dataSource?: string): string {
  const normalizedSeverity = severity.toLowerCase();
  
  if (normalizedSeverity === 'fatality' || normalizedSeverity === 'fatal') {
    return '#000000'; // Black for fatality
  } else if (normalizedSeverity === 'severe injury' || normalizedSeverity === 'severe_injury') {
    return '#D55E00'; // Vermilion for severe injury
  } else if (normalizedSeverity === 'injury' || normalizedSeverity === 'other visible injury') {
    return '#E69F00'; // Orange for injury
  } else if (normalizedSeverity === 'no injury') {
    // Differentiate between "No Injury" (SWITRS) and "Near Miss" (BikeMaps.org)
    if (dataSource === 'BikeMaps.org') {
      return '#0072B2'; // Blue for near miss (reported close call)
    } else {
      return '#56B4E9'; // Sky Blue for no injury (actual collision)
    }
  } else {
    return '#999999'; // Gray for unknown
  }
}

function getSeverityDisplayLabel(severity: string, dataSource?: string): string {
  const normalizedSeverity = severity.toLowerCase();
  
  if (normalizedSeverity === 'no injury') {
    // Differentiate between "No Injury" (SWITRS) and "Near Miss" (BikeMaps.org)
    if (dataSource === 'BikeMaps.org') {
      return 'Near Miss';
    } else {
      return 'No Injury';
    }
  }
  return severity; // Return original label for all other cases
}


function getInvolvementText(incidentData: IncidentPopupData): string[] {
  const involvement = [];
  if (incidentData.pedestrian_involved) involvement.push('Pedestrian');
  
  if (incidentData.bicyclist_involved) {
    // Check if any party has e-bike bicycle_type using strict detection
    const hasEbike = incidentData.parties ? hasEbikeParty(incidentData.parties) : false;
    
    if (hasEbike) {
      involvement.push('E-bike');
    } else {
      involvement.push('Bicyclist');
    }
  }
  
  if (incidentData.vehicle_involved) involvement.push('Vehicle');
  return involvement;
}