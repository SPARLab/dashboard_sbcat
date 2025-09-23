/**
 * Utility functions for detecting e-bike incidents
 * Centralized logic to ensure consistency across the safety app
 */

/**
 * Determines if a bicycle_type string indicates an e-bike
 * Based on actual data values from the database
 */
export function isEbikeBicycleType(bicycleType: string): boolean {
  if (!bicycleType) {
    console.log('🔌 E-bike Detection: No bicycle_type provided');
    return false;
  }
  
  const bikeType = bicycleType.toLowerCase().trim();
  
  // Match actual database values (case-insensitive)
  // Database uses: 'Ebike', 'Pedal', 'Unknown'
  const isEbike = (
    bikeType === 'ebike' ||           // Matches 'Ebike' from database
    bikeType === 'e-bike' ||          // Alternative format
    bikeType.includes('electric') ||  // Any electric variant
    bikeType === 'e bike'             // Space variant
  );
  
  // Only log e-bike detections, not every check
  if (isEbike) {
  }
  
  return isEbike;
}

/**
 * Checks if an incident has any parties with e-bike bicycle_type
 */
export function hasEbikeParty(parties: Array<{ bicycle_type?: string }>): boolean {
  if (!parties || parties.length === 0) {
    console.log('🔌 hasEbikeParty: No parties provided');
    return false;
  }
  
  const result = parties.some(party => isEbikeBicycleType(party.bicycle_type || ''));
  
  // Only log when e-bike is found
  if (result) {
  }
  
  return result;
}
