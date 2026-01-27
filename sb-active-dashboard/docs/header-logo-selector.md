# Header Logo Selector

## Overview

The Header Logo Selector provides a UI widget to switch between different @Spatial UCSB logo variants in the dashboard header. This feature is designed for testing and design refinement purposes.

## Features

- **Multiple Logo Options**: Currently supports four logo variants:
  - Light Blue (default)
  - Light Gray Blue
  - Navy
  - Standard

- **Feature Flag Control**: Logo selector visibility controlled by `SHOW_LOGO_SELECTOR` flag
  - Located in `ui/config/featureFlags.ts`
  - Set to `true` to show selector for design testing
  - Set to `false` to hide for production
  - Currently set to `true` for active development

- **Persistent Selection**: Selected logo is saved to localStorage and persists across page refreshes

## Usage

### Showing/Hiding the Logo Selector

Edit `ui/config/featureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  SHOW_LOGO_SELECTOR: true,  // Set to false to hide selector
  // ...
} as const;
```

### Using the Logo Selector

1. Ensure `SHOW_LOGO_SELECTOR` is set to `true` in feature flags
2. The logo selector will appear next to the theme selector in the header
3. Click the dropdown to view and select different logo options
4. Your selection will be saved automatically

### Adding New Logo Variants

To add a new logo variant:

1. Add the logo image file to `/public/icons/`
2. Update `/ui/theme/headerLogos.ts`:
   ```typescript
   export const HEADER_LOGOS: HeaderLogo[] = [
     // ... existing logos
     {
       id: "new-variant",
       name: "New Variant Name",
       path: "/icons/spatial-logo-new-variant.png",
     },
   ];
   ```

### Changing the Default Logo

Edit `DEFAULT_LOGO_ID` in `/ui/theme/headerLogos.ts`:

```typescript
export const DEFAULT_LOGO_ID = "light-blue"; // Change to desired logo ID
```

## Files

- `/ui/config/featureFlags.ts` - Feature flags configuration
- `/ui/theme/headerLogos.ts` - Logo configuration and constants
- `/ui/dashboard/HeaderLogoSelector.tsx` - Logo selector component
- `/ui/dashboard/Header.tsx` - Main header component with logo integration
- `/public/icons/spatial-logo-*.png` - Logo image files

## Technical Details

### LocalStorage Keys

- `activesb-header-logo`: Stores selected logo ID

### Component Props

**HeaderLogoSelector**
- `selectedLogoId: string` - Currently selected logo ID
- `onLogoChange: (logoId: string) => void` - Callback when logo selection changes

## Design Notes

This feature was implemented to address Lizzy's feedback requesting different logo color variants for the header. The feature flag approach allows the selector to be easily toggled on/off for design testing versus production deployment.
