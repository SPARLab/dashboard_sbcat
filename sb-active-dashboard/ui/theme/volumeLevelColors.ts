/**
 * Shared color constants for volume levels across the application
 * Ensures consistency between map styling, charts, and legends
 */

export const VOLUME_LEVEL_COLORS = {
  low: {
    hex: '#22c55e',       // Tailwind green-500 - Good/Safe (low volume)
    hexLight: '#a6d96a',  // Lighter green for map fills
    rgb: 'rgb(34, 197, 94)',
    rgba: (opacity: number) => `rgba(34, 197, 94, ${opacity})`
  },
  medium: {
    hex: '#f59e0b',       // Tailwind amber-500 - Caution (medium volume)  
    hexLight: '#fdae61',  // Lighter orange for map fills
    rgb: 'rgb(245, 158, 11)',
    rgba: (opacity: number) => `rgba(245, 158, 11, ${opacity})`
  },
  high: {
    hex: '#ef4444',       // Tailwind red-500 - Alert/Danger (high volume)
    hexLight: '#d7191c',  // Darker red for map fills
    rgb: 'rgb(239, 68, 68)',
    rgba: (opacity: number) => `rgba(239, 68, 68, ${opacity})`
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
 */
export const VOLUME_LEVEL_CONFIG = {
  low: {
    label: 'Low Volume',
    description: 'AADT < 50',
    color: VOLUME_LEVEL_COLORS.low.hex,
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  medium: {
    label: 'Medium Volume', 
    description: '50 ≤ AADT < 200',
    color: VOLUME_LEVEL_COLORS.medium.hex,
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50', 
    borderColor: 'border-amber-200'
  },
  high: {
    label: 'High Volume',
    description: 'AADT ≥ 200', 
    color: VOLUME_LEVEL_COLORS.high.hex,
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
} as const;