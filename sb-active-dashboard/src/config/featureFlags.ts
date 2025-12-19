/**
 * Feature flags configuration.
 * These are controlled via environment variables set in Vercel.
 *
 * Defaults to showing all pages. Set to 'false' to hide.
 *
 * Usage:
 *   - Main branch (public): VITE_SHOW_VOLUME_PAGE=false (hides Volume)
 *   - Full-view branch (internal): No config needed (shows everything)
 */
export const featureFlags = {
  showVolumePage: import.meta.env.VITE_SHOW_VOLUME_PAGE !== 'false',
} as const;
