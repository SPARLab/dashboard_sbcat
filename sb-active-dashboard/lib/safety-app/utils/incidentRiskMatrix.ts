/**
 * Incident Risk Matrix Configuration
 * 
 * Defines thresholds for categorizing incident counts as low/medium/high risk
 * based on the traffic volume level of the area.
 */

export interface RiskThresholds {
  low: { lowIncidents: number; mediumIncidents: number; highIncidents: number };
  medium: { lowIncidents: number; mediumIncidents: number; highIncidents: number };
  high: { lowIncidents: number; mediumIncidents: number; highIncidents: number };
}

/**
 * Thresholds for categorizing incident counts by volume level
 * These thresholds correspond to the risk matrix visualization in the UI
 */
export const INCIDENT_RISK_THRESHOLDS: RiskThresholds = {
  // For low-volume areas - incidents are more concerning here
  low: {
    lowIncidents: 3,      // 1-3 incidents = low risk
    mediumIncidents: 6,   // 4-6 incidents = medium risk
    highIncidents: 10     // 7-10 incidents = high risk, 11+ = very high
  },
  // For medium-volume areas
  medium: {
    lowIncidents: 5,      // 1-5 incidents = low risk
    mediumIncidents: 9,   // 6-9 incidents = medium risk  
    highIncidents: 15     // 10-15 incidents = high risk, 16+ = very high
  },
  // For high-volume areas - takes more incidents to be concerning
  high: {
    lowIncidents: 8,      // 1-8 incidents = low risk
    mediumIncidents: 15,  // 9-15 incidents = medium risk
    highIncidents: 25     // 16-25 incidents = high risk, 26+ = very high
  }
};

/**
 * Configuration for risk category visibility filters
 * Users can toggle which risk categories are visible on the map
 */
export interface RiskCategoryFilters {
  low: boolean;    // Show low-risk incidents (default true)
  medium: boolean; // Show medium-risk incidents (default true)
  high: boolean;   // Show high-risk incidents (default true)
}

/**
 * Default filter state - all categories visible
 */
export const DEFAULT_RISK_FILTERS: RiskCategoryFilters = {
  low: true,
  medium: true,
  high: true
};

/**
 * All incidents use uniform weight for visualization
 * Risk level is communicated through color, not intensity
 */
export const UNIFORM_HEATMAP_WEIGHT = 1.0;

/**
 * Legacy support for volume-based weights (deprecated)
 * @deprecated Use RiskCategoryFilters instead
 */
export interface VolumeWeightConfig {
  low: number;
  medium: number;
  high: number;
}

/**
 * Legacy default weights (deprecated)
 * @deprecated Use DEFAULT_RISK_FILTERS instead
 */
export const DEFAULT_VOLUME_WEIGHTS: VolumeWeightConfig = {
  low: 2.0,
  medium: 1.0,
  high: 0.5
};

/**
 * Legacy weight function (deprecated)
 * Now returns uniform weight for all risk levels
 * @deprecated Risk is now communicated through color, not weight
 */
export function getNormalizationWeight(
  volumeLevel: 'Low' | 'Medium' | 'High',
  customWeights?: VolumeWeightConfig
): number {
  return UNIFORM_HEATMAP_WEIGHT;
}

/**
 * Calculate risk category based on incident count and volume level
 * This is useful for discrete categorization rather than continuous weighting
 * 
 * @param incidentCount - Number of incidents in the area
 * @param volumeLevel - The traffic volume level
 * @returns The risk category ('low', 'medium', or 'high')
 */
export function calculateRiskCategory(
  incidentCount: number, 
  volumeLevel: 'Low' | 'Medium' | 'High'
): 'low' | 'medium' | 'high' {
  const level = volumeLevel.toLowerCase() as 'low' | 'medium' | 'high';
  const thresholds = INCIDENT_RISK_THRESHOLDS[level];
  
  if (incidentCount <= thresholds.lowIncidents) {
    return 'low';
  } else if (incidentCount <= thresholds.mediumIncidents) {
    return 'medium';
  } else {
    return 'high';
  }
}

