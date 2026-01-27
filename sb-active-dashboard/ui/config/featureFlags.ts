/**
 * Feature flags for the ACTIVE SB dashboard
 */

export const FEATURE_FLAGS = {
  /**
   * Show header logo selector widget for testing different logo variants
   * Set to true during development/design testing, false for production
   */
  SHOW_LOGO_SELECTOR: true,

  /**
   * Enable volume page (otherwise shows "Coming Soon")
   */
  SHOW_VOLUME_PAGE: false,
} as const;
