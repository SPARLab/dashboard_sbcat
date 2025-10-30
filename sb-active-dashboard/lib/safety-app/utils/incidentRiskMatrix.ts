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
 * Configuration for volume-based weight adjustments
 * Users can customize these to explore different risk perspectives
 */
export interface VolumeWeightConfig {
  low: number;    // Weight for low-volume areas (default 3.0)
  medium: number; // Weight for medium-volume areas (default 1.0)
  high: number;   // Weight for high-volume areas (default 0.5)
}

/**
 * Default weights represent a hypothesis that incidents in low-volume areas
 * are more concerning than in high-volume areas (6x difference: 3.0 vs 0.5)
 */
export const DEFAULT_VOLUME_WEIGHTS: VolumeWeightConfig = {
  low: 3.0,    // 3x baseline - incidents in quieter areas are more notable
  medium: 1.0, // Baseline reference
  high: 0.5    // 0.5x baseline - incidents in busy areas are expected
};

/**
 * Get the normalization weight for a point based on its volume level
 * 
 * Higher weights = more visual prominence (darker heatmap contribution)
 * Lower weights = less visual prominence (lighter heatmap contribution)
 * Zero weight = effectively filters out that category
 * 
 * In the heatmap visualization:
 * - Each incident creates a "fuzzy circle"
 * - Overlapping circles intensify the color
 * - The weight determines how much each incident contributes to the intensity
 * 
 * @param volumeLevel - The traffic volume level ('Low', 'Medium', or 'High')
 * @param customWeights - Optional custom weight configuration
 * @returns The normalization weight for heatmap rendering
 */
export function getNormalizationWeight(
  volumeLevel: 'Low' | 'Medium' | 'High',
  customWeights?: VolumeWeightConfig
): number {
  const weights = customWeights || DEFAULT_VOLUME_WEIGHTS;
  
  const weightMap = {
    'Low': weights.low,
    'Medium': weights.medium,
    'High': weights.high
  };
  
  return weightMap[volumeLevel];
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

