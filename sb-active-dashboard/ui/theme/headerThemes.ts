/**
 * Header theme definitions for gradient backgrounds
 * Each theme provides a top-to-bottom gradient (dark → lighter)
 */

export interface HeaderTheme {
  id: string;
  name: string;
  gradientTop: string;    // Darker color at top
  gradientBottom: string; // Lighter color at bottom
}

export const HEADER_THEMES: HeaderTheme[] = [
  {
    id: 'dodger-blue',
    name: 'Dodger Blue',
    gradientTop: '#0a5a9e',    // Darker dodger blue
    gradientBottom: '#1E90FF', // Dodger Blue (#1E90FF)
  },
  {
    id: 'navy-classic',
    name: 'Navy Classic',
    gradientTop: '#001a33',    // Deep navy
    gradientBottom: '#003660', // Standard navy
  },
  {
    id: 'ocean-depth',
    name: 'Ocean Depth',
    gradientTop: '#0a1628',    // Near-black blue
    gradientBottom: '#1e3a5f', // Ocean blue
  },
  {
    id: 'slate-steel',
    name: 'Slate Steel',
    gradientTop: '#1e293b',    // Slate 800
    gradientBottom: '#334155', // Slate 700
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    gradientTop: '#0f172a',    // Slate 900
    gradientBottom: '#1e3a8a', // Blue 800
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    gradientTop: '#1e3a8a',    // Blue 800
    gradientBottom: '#2563eb', // Blue 600
  },
  {
    id: 'pacific',
    name: 'Pacific',
    gradientTop: '#0c4a6e',    // Sky 900
    gradientBottom: '#0369a1', // Sky 700
  },
];

export const DEFAULT_THEME_ID = 'ocean-depth';

export const HEADER_THEME_STORAGE_KEY = 'activesb-header-theme';

/**
 * Get theme by ID, falling back to default if not found
 */
export function getThemeById(id: string): HeaderTheme {
  return HEADER_THEMES.find(t => t.id === id) ?? HEADER_THEMES[0];
}

/**
 * Generate CSS gradient string for a theme
 */
export function getGradientStyle(theme: HeaderTheme): string {
  return `linear-gradient(to bottom, ${theme.gradientTop}, ${theme.gradientBottom})`;
}

