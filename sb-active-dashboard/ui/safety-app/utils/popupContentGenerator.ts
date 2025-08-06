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
  }>;
}

export function generateIncidentPopupContent(incidentData: IncidentPopupData): string {
  let popupContent = `
    <div class="incident-popup" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; color: #333;">
      <style>
        .esri-feature-content .incident-popup p { margin: 0 !important; }
        .incident-popup p { margin: 0 !important; }
        .incident-popup strong { color: #2563eb; }
        .incident-popup .section { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
        .incident-popup .section:last-child { border-bottom: none; margin-bottom: 0; }
        .incident-popup .parties { background: #f8fafc; padding: 8px; border-radius: 4px; margin-top: 8px; }
      </style>
  `;
  
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
    popupContent += `<p style="margin: 0 !important;"><strong>Conflict Type:</strong> ${incidentData.conflict_type}</p>`;
  }

  // Severity information
  const severity = incidentData.severity || incidentData.maxSeverity;
  if (severity) {
    const severityColor = getSeverityColor(severity);
    popupContent += `<p style="margin: 0 !important;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${severity}</span></p>`;
  }

  // Involvement flags
  const involvement = getInvolvementText(incidentData);
  if (involvement.length > 0) {
    popupContent += `<p style="margin: 0 !important;"><strong>Involved:</strong> ${involvement.join(', ')}</p>`;
  }
  popupContent += '</div>';

  // Risk/weight information for incident-to-volume ratio
  if (incidentData.weightedExposure) {
    popupContent += '<div class="section">';
    popupContent += `<p style="margin: 0 !important;"><strong>Risk Weight:</strong> ${incidentData.weightedExposure.toFixed(3)}</p>`;
    popupContent += '<p style="margin: 0 !important; font-size: 0.85em; color: #6b7280;">Higher values indicate greater risk relative to traffic volume</p>';
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
      }
      
      if (party.injury_severity) {
        const injuryColor = getSeverityColor(party.injury_severity);
        popupContent += ` - <span style="color: ${injuryColor};">${party.injury_severity}</span>`;
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
  // Find enriched data from cache
  const enrichedData = enrichedIncidents?.find(inc => inc.id === attributes.id);
  const incidentData = enrichedData || attributes;
  
  // Build popup content using cached data
  let popupContent = `
    <div class="incident-popup" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4; color: #333;">
      <style>
        .esri-feature-content .incident-popup p { margin: 0 !important; }
        .incident-popup p { margin: 0 !important; }
        .incident-popup strong { color: #2563eb; }
        .incident-popup .parties { background: #f8fafc; padding: 4px 6px; border-radius: 4px; margin-top: 4px; }
      </style>
  `;
  
  if (incidentData.data_source) {
    popupContent += `<p style="margin: 0 !important;"><strong>Source:</strong> ${incidentData.data_source}</p>`;
  }
  if (incidentData.timestamp) {
    const date = new Date(incidentData.timestamp);
    popupContent += `<p style="margin: 0 !important;"><strong>Date:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>`;
  }
  if (incidentData.conflict_type) {
    popupContent += `<p style="margin: 0 !important;"><strong>Conflict Type:</strong> ${incidentData.conflict_type}</p>`;
  }
  
  const severity = incidentData.severity || incidentData.maxSeverity;
  if (severity) {
    const severityColor = getSeverityColor(severity);
    popupContent += `<p style="margin: 0 !important;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${severity}</span></p>`;
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
      }
      if (party.injury_severity) {
        const injuryColor = getSeverityColor(party.injury_severity);
        popupContent += ` - <span style="color: ${injuryColor};">${party.injury_severity}</span>`;
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
    return '#dc2626';
  } else if (normalizedSeverity === 'severe injury' || normalizedSeverity === 'severe_injury') {
    return '#ea580c';
  } else if (normalizedSeverity === 'injury' || normalizedSeverity === 'other visible injury') {
    return '#d97706';
  } else {
    return '#65a30d';
  }
}

function getInvolvementText(incidentData: IncidentPopupData): string[] {
  const involvement = [];
  if (incidentData.pedestrian_involved) involvement.push('Pedestrian');
  if (incidentData.bicyclist_involved) involvement.push('Bicyclist');
  if (incidentData.vehicle_involved) involvement.push('Vehicle');
  return involvement;
}