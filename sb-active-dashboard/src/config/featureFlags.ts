/**
 * Feature flags configuration.
 * These are controlled via environment variables set in Vercel.
 *
 * Usage:
 *   - Main branch (public): VITE_SHOW_VOLUME_PAGE=false
 *   - Full-view branch (internal): VITE_SHOW_VOLUME_PAGE=true
 */
export const featureFlags = {
  showVolumePage: import.meta.env.VITE_SHOW_VOLUME_PAGE === 'true',
} as const;
