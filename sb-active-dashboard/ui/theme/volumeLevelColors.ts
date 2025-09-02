/**
 * Shared color constants for volume levels across the application
 * Ensures consistency between map styling, charts, and legends
 */

export const VOLUME_LEVEL_COLORS = {
  low: {
    hex: '#3182bd',       // Colorblind-safe blue - Cool/Safe (low volume)
    hexLight: '#6baed6',  // Lighter blue for map fills
    rgb: 'rgb(49, 130, 189)',
    rgba: (opacity: number) => `rgba(49, 130, 189, ${opacity})`
  },
  medium: {
    hex: '#fd8d3c',       // Colorblind-safe orange - Caution (medium volume)  
    hexLight: '#fdae61',  // Lighter orange for map fills
    rgb: 'rgb(253, 141, 60)',
    rgba: (opacity: number) => `rgba(253, 141, 60, ${opacity})`
  },
  high: {
    hex: '#d94701',       // Colorblind-safe dark orange - Alert/Danger (high volume)
    hexLight: '#f16913',  // Lighter dark orange for map fills
    rgb: 'rgb(217, 71, 1)',
    rgba: (opacity: number) => `rgba(217, 71, 1, ${opacity})`
  }
} as const;

/**
 * Get color array for chart libraries (ECharts, etc.)
 * @param useLight - Whether to use lighter variants for maps
 * @returns Array of colors [low, medium, high]
 */
export function getVolumeLevelColorArray(useLight: boolean = false): string[] {
  return [
    useLight ? VOLUME_LEVEL_COLORS.low.hexLight : VOLUME_LEVEL_COLORS.low.hex,
    useLight ? VOLUME_LEVEL_COLORS.medium.hexLight : VOLUME_LEVEL_COLORS.medium.hex,  
    useLight ? VOLUME_LEVEL_COLORS.high.hexLight : VOLUME_LEVEL_COLORS.high.hex
  ];
}

/**
 * Get color by volume level name
 * @param level - The volume level
 * @param useLight - Whether to use lighter variant
 * @returns Hex color string
 */
export function getVolumeLevelColor(level: 'low' | 'medium' | 'high', useLight: boolean = false): string {
  return useLight ? VOLUME_LEVEL_COLORS[level].hexLight : VOLUME_LEVEL_COLORS[level].hex;
}

/**
 * Volume level configuration for legends and UI components
 * Updated for colorblind-safe blue-orange palette
 */
export const VOLUME_LEVEL_CONFIG = {
  low: {
    label: 'Low Volume',
    description: 'AADT < 50',
    color: VOLUME_LEVEL_COLORS.low.hex,
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  medium: {
    label: 'Medium Volume', 
    description: '50 ≤ AADT < 200',
    color: VOLUME_LEVEL_COLORS.medium.hex,
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200'
  },
  high: {
    label: 'High Volume',
    description: 'AADT ≥ 200', 
    color: VOLUME_LEVEL_COLORS.high.hex,
    textColor: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300'
  }
} as const;