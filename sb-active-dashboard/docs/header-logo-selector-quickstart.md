# Header Logo Selector - Quick Start Guide

## Showing/Hiding the Logo Selector

The logo selector visibility is controlled by a feature flag in the code.

### Feature Flag Location
`ui/config/featureFlags.ts`

```typescript
export const FEATURE_FLAGS = {
  SHOW_LOGO_SELECTOR: true,  // Change this value
  // ...
} as const;
```

### To Show Logo Selector (Current State)
Set `SHOW_LOGO_SELECTOR: true` in `featureFlags.ts`

The logo selector will appear in the header navigation area, next to the theme color selector.

### To Hide Logo Selector (For Production)
Set `SHOW_LOGO_SELECTOR: false` in `featureFlags.ts`

The logo selector will be completely hidden from the UI.

## Available Logo Options

The logo selector provides three @Spatial UCSB logo variants:

1. **Light Blue** (default) - Lighter blue version within UCSB approved color scheme
2. **Light Gray Blue** - Muted gray-blue variant
3. **Navy** - All navy version
4. **Standard** - Original darker blue logo

## Using the Logo Selector

1. **Ensure flag is enabled**: Check that `SHOW_LOGO_SELECTOR: true` in `featureFlags.ts`
2. **Locate the selector**: Look in the header navigation area, next to the theme color selector
3. **Click the dropdown**: Shows "Logo" with a preview thumbnail and dropdown arrow
4. **Select a logo**: Click on any logo option to apply it
5. **Automatic save**: Your selection is saved and will persist across page refreshes

## Technical Details

### Persistence
- Selected logo is stored in `localStorage` under key `activesb-header-logo`
- Setting persists across browser sessions and page refreshes

### Default State
- Default logo: **Light Blue**
- Default feature flag: **Enabled** (`true`)

## Use Cases

This feature is designed for:
- **Design testing**: Compare logo variants against different header themes
- **Client feedback**: Show stakeholders different logo options
- **Development**: Quick logo changes without modifying image files
- **Production control**: Easy toggle to hide selector for production deployment

## Notes

- The logo selector matches the styling of the theme selector (frosted glass aesthetic)
- Logo changes are instant - no page refresh required
- The About page logo is separate and not affected by the header logo selector
- When feature flag is disabled, the currently selected logo remains active
