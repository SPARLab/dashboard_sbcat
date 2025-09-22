import { hasEbikeParty } from "../../../lib/safety-app/utils/ebikeDetection";

export interface IncidentPopupData {
  id?: string | number;
  data_source?: string;
  timestamp?: Date | number;
  conflict_type?: string;
  severity?: string;
  maxSeverity?: string;
  pedestrian_involved?: boolean | number;
  bicyclist_involved?: boolean | number;
  vehicle_involved?: boolean | number;
  weightedExposure?: number;
  parties?: Array<{
    party_number?: number;
    party_type?: string;
    injury_severity?: string;
    age?: number;
    bicycle_type?: string;
  }>;
}

export function generateIncidentPopupContent(incidentData: IncidentPopupData): string {
  // Check if this is an e-bike incident
  const isEbikeIncident = incidentData.parties ? hasEbikeParty(incidentData.parties) : false;
  
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
  if (incidentData.id) {
    popupContent += `<p style="margin: 0 !important;"><strong>Incident ID:</strong> ${incidentData.id}</p>`;
  }
  
  if (incidentData.data_source) {
    popupContent += `<p style="margin: 0 !important;"><strong>Source:</strong> ${incidentData.data_source}</p>`;
  }
  
  if (incidentData.timestamp) {
    const date = new Date(incidentData.timestamp);
    popupContent += `<p style="margin: 0 !important;"><strong>Date:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>`;
  }
  popupContent += '</div>';

  // Incident details section
  popupContent += '<div class="section">';
  if (incidentData.conflict_type) {
    // Check if this is an e-bike incident and adjust conflict type display
    const isEbikeIncident = incidentData.parties ? hasEbikeParty(incidentData.parties) : false;
    let displayConflictType = incidentData.conflict_type;
    
    if (isEbikeIncident && displayConflictType.startsWith('Bike vs')) {
      // Replace "Bike" with "E-bike" in the conflict type for e-bike incidents
      displayConflictType = displayConflictType.replace('Bike vs', 'E-bike vs');
    }
    
    popupContent += `<p style="margin: 0 !important;"><strong>Conflict Type:</strong> ${displayConflictType}</p>`;
  }

  // Severity information
  const severity = incidentData.severity || incidentData.maxSeverity;
  if (severity) {
    const severityColor = getSeverityColor(severity);
    const displayLabel = getSeverityDisplayLabel(severity);
    popupContent += `<p style="margin: 0 !important;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${displayLabel}</span></p>`;
  }

  // Involvement flags
  const involvement = getInvolvementText(incidentData);
  if (involvement.length > 0) {
    // Check if this is an e-bike incident
    const isEbikeIncident = incidentData.parties ? hasEbikeParty(incidentData.parties) : false;
    
    if (isEbikeIncident) {
      // Highlight E-bike incidents with a special style
      popupContent += `<p style="margin: 0 !important;"><strong>Involved:</strong> <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⚡ ${involvement.join(', ')}</span></p>`;
    } else {
      popupContent += `<p style="margin: 0 !important;"><strong>Involved:</strong> ${involvement.join(', ')}</p>`;
    }
  }
  popupContent += '</div>';

  // Risk/weight information for incident-to-volume ratio
  if (incidentData.weightedExposure) {
    popupContent += '<div class="section">';
    popupContent += `<p style="margin: 0 !important;"><strong>Risk Weight:</strong> ${incidentData.weightedExposure.toFixed(3)}</p>`;
    popupContent += '<p style="margin: 0 !important; font-size: 0.85em; color: #6b7280;">Higher values indicate greater risk relative to selected volumes</p>';
    popupContent += '</div>';
  }

  // Parties information if available
  if (incidentData.parties && incidentData.parties.length > 0) {
    popupContent += '<div class="section">';
    popupContent += '<p style="margin: 0 !important;"><strong>Parties Involved:</strong></p>';
    popupContent += '<div class="parties">';
    
    incidentData.parties.forEach((party, index) => {
      popupContent += `<div style="margin-bottom: 6px;">`;
      popupContent += `<strong>Party ${party.party_number || index + 1}:</strong> `;
      
      if (party.party_type) {
        popupContent += `${party.party_type}`;
        
        // Add bicycle type information if available
        if (party.bicycle_type) {
          popupContent += ` (${party.bicycle_type})`;
        }
      }
      
      if (party.injury_severity) {
        const injuryColor = getSeverityColor(party.injury_severity);
        const displayLabel = getSeverityDisplayLabel(party.injury_severity);
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

export function generateRawIncidentPopupContent(
  attributes: any,
  enrichedIncidents?: any[]
): string {
  // Special debug for incident 3734
  if (attributes.id === 3734 || attributes.id === '3734') {
    console.log('🎯🔴 INCIDENT 3734 POPUP:', {
      attributesId: attributes.id,
      attributesType: typeof attributes.id,
      enrichedProvided: !!enrichedIncidents,
      enrichedCount: enrichedIncidents?.length || 0
    });
  }

  // Find enriched data from cache - handle both number and string IDs
  const enrichedData = enrichedIncidents?.find(inc => 
    inc.id === attributes.id || inc.id === Number(attributes.id) || String(inc.id) === String(attributes.id)
  );
  const incidentData = enrichedData || attributes;
  
  if (attributes.id === 3734 || attributes.id === '3734') {
    console.log('🎯🔴 INCIDENT 3734 ENRICHED:', {
      found: !!enrichedData,
      enrichedId: enrichedData?.id,
      enrichedIdType: typeof enrichedData?.id,
      hasParties: !!enrichedData?.parties,
      parties: enrichedData?.parties
    });
  }
  
  // Check if this is an e-bike incident
  // First check the hasEbike attribute (from improvedSafetyLayers), then check parties
  let isEbikeIncident = attributes.hasEbike === 1 || attributes.hasEbike === true;
  
  if (!isEbikeIncident && enrichedData?.parties) {
    isEbikeIncident = hasEbikeParty(enrichedData.parties);
  }
  
  // Always log for known e-bike incidents
  if (attributes.id === 3734 || attributes.id === '3734' || attributes.id === 3322 || attributes.id === 3385) {
    console.log('🎯 KNOWN E-BIKE INCIDENT CHECK:', {
      incidentId: attributes.id,
      hasEbikeAttribute: attributes.hasEbike,
      isEbikeIncident,
      bicycleTypes: enrichedData?.parties?.map((p: any) => p.bicycle_type)
    });
  }
  
  // Build popup content using cached data
  let popupContent = `
    <div class="incident-popup" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; color: #333;">
      <style>
        .esri-feature-content .incident-popup p { margin: 0 !important; }
        .incident-popup p { margin: 0 !important; }
        .incident-popup strong { color: #2563eb; }
        .incident-popup .parties { background: #f8fafc; padding: 4px 6px; border-radius: 4px; margin-top: 4px; }
        .incident-popup .ebike-header { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 6px 10px; margin: -6px -6px 8px -6px; border-radius: 4px 4px 0 0; font-weight: bold; color: #92400e; display: flex; align-items: center; gap: 4px; font-size: 14px; }
      </style>
  `;
  
  // Add E-bike header if applicable
  if (isEbikeIncident) {
    popupContent += `<div class="ebike-header">⚡ E-bike Incident</div>`;
  }
  
  if (incidentData.data_source) {
    popupContent += `<p style="margin: 0 !important;"><strong>Source:</strong> ${incidentData.data_source}</p>`;
  }
  if (incidentData.timestamp) {
    const date = new Date(incidentData.timestamp);
    popupContent += `<p style="margin: 0 !important;"><strong>Date:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>`;
  }
  if (incidentData.conflict_type) {
    let displayConflictType = incidentData.conflict_type;
    
    if (isEbikeIncident && displayConflictType.startsWith('Bike vs')) {
      // Replace "Bike" with "E-bike" in the conflict type for e-bike incidents
      displayConflictType = displayConflictType.replace('Bike vs', 'E-bike vs');
    }
    
    popupContent += `<p style="margin: 0 !important;"><strong>Conflict Type:</strong> ${displayConflictType}</p>`;
  }
  
  const severity = incidentData.severity || incidentData.maxSeverity;
  if (severity) {
    const severityColor = getSeverityColor(severity);
    const displayLabel = getSeverityDisplayLabel(severity);
    popupContent += `<p style="margin: 0 !important;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${displayLabel}</span></p>`;
  }
  
  // Involvement
  const involvement = getInvolvementText(incidentData);
  if (involvement.length > 0) {
    popupContent += `<p style="margin: 0 !important;"><strong>Involved:</strong> ${involvement.join(', ')}</p>`;
  }
  
  // Parties if available
  if (enrichedData && enrichedData.parties && enrichedData.parties.length > 0) {
    popupContent += '<p style="margin: 0 !important;"><strong>Parties Involved:</strong></p>';
    popupContent += '<div class="parties">';
    
    enrichedData.parties.forEach((party: any, index: number) => {
      popupContent += `<div style="margin-bottom: 2px;">`;
      popupContent += `<strong>Party ${party.party_number || index + 1}:</strong> `;
      if (party.party_type) {
        popupContent += `${party.party_type}`;
        
        // Add bicycle type information if available
        if (party.bicycle_type) {
          popupContent += ` (${party.bicycle_type})`;
        }
      }
      if (party.injury_severity) {
        const injuryColor = getSeverityColor(party.injury_severity);
        const displayLabel = getSeverityDisplayLabel(party.injury_severity);
        popupContent += ` - <span style="color: ${injuryColor};">${displayLabel}</span>`;
      }
      if (party.age) {
        popupContent += ` (Age: ${party.age})`;
      }
      popupContent += '</div>';
    });
    
    popupContent += '</div>';
  }
  
  popupContent += '</div>';
  return popupContent;
}

function getSeverityColor(severity: string): string {
  const normalizedSeverity = severity.toLowerCase();
  
  if (normalizedSeverity === 'fatality' || normalizedSeverity === 'fatal') {
    return '#000000'; // Black for fatality
  } else if (normalizedSeverity === 'severe injury' || normalizedSeverity === 'severe_injury') {
    return '#D55E00'; // Vermilion for severe injury
  } else if (normalizedSeverity === 'injury' || normalizedSeverity === 'other visible injury') {
    return '#E69F00'; // Orange for injury
  } else if (normalizedSeverity === 'no injury') {
    return '#0072B2'; // Blue for near miss
  } else {
    return '#999999'; // Gray for unknown
  }
}

function getSeverityDisplayLabel(severity: string): string {
  const normalizedSeverity = severity.toLowerCase();
  
  if (normalizedSeverity === 'no injury') {
    return 'Near Miss';
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