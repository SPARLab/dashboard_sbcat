# Volume App Integration Example

This document provides an example of how to integrate the Volume App with geographic boundary selection and custom drawing tools.

## Overview

The Volume App supports two main modes of geographic selection:
1. **Boundary Selection**: Pre-defined geographic boundaries (cities, counties, census tracts)
2. **Custom Drawing**: User-drawn polygons using the ArcGIS SketchViewModel

## Key Features

### Geographic Boundary Selection
- Interactive hover effects (yellow outline)
- Click-to-select functionality (blue outline)
- Automatic area name extraction
- Support for multiple boundary types:
  - Cities & Towns
  - Census Designated Places (Service Areas)
  - Counties
  - Census Tracts

### Custom Drawing Tool
- Polygon drawing with SketchViewModel
- Custom styling (purple fill with outline)
- Automatic geometry extraction on completion

## Technical Implementation

### Layer Management
The app uses a dedicated `GraphicsLayer` called `highlightLayer` for rendering hover and selection effects. This layer is managed by the `GeographicBoundariesService`.

### Rendering Fixes (v2.0)
**Problem**: After using the SketchViewModel, the highlight layer would stop rendering graphics, even though they were being added successfully.

**Solution**: Implemented a layer recreation mechanism:
1. When switching to custom drawing mode, the service marks that layer recreation will be needed
2. When switching back to boundary mode, the highlight layer is completely recreated
3. This ensures the rendering engine gets a fresh layer without any corruption

### Initial Load Race Condition Fix
**Problem**: Hover effects wouldn't work if the user moved their mouse during the initial map animation.

**Solution**: Enhanced initialization with proper state management:
1. Wait for both `mapView.ready` and `mapView.stationary` before setting up interactivity
2. Use `requestAnimationFrame` for smooth ready-state checking
3. Proper completion handling for initial map navigation

## Usage Example

```typescript
import { GeographicBoundariesService } from './lib/data-services/GeographicBoundariesService';

// Initialize the service
const boundaryService = new GeographicBoundariesService();

// Set up selection callback
boundaryService.setSelectionChangeCallback((data) => {
  if (data && typeof data === 'object' && 'geometry' in data) {
    // Handle boundary selection
    console.log('Selected area:', data.areaName);
    console.log('Geometry:', data.geometry);
  } else if (data && typeof data === 'object' && 'rings' in data) {
    // Handle custom polygon
    console.log('Custom polygon:', data);
  }
});

// Switch to boundary mode
await boundaryService.switchGeographicLevel('city', mapView);

// Switch to custom drawing mode
// The service will automatically mark for layer recreation
boundaryService.cleanupInteractivity();
boundaryService.markLayerRecreationNeeded();

// When switching back to boundary mode, layer will be recreated
await boundaryService.switchGeographicLevel('city', mapView);
```

## Debug Information

The service includes comprehensive debug logging to help track layer recreation and initialization:

```javascript
[DEBUG] Marked highlight layer for recreation after SketchViewModel usage
[DEBUG] Recreating highlight layer to fix rendering corruption...
[DEBUG] Removed old highlight layer from map
[DEBUG] Highlight layer recreated and added to map successfully
[DEBUG] Interactivity setup completed successfully
[DEBUG] Map view initialization completed successfully
```

## Best Practices

1. **Always use the service's cleanup methods** when switching between modes
2. **Mark for layer recreation** after SketchViewModel usage
3. **Wait for proper initialization** before setting up interactivity
4. **Handle both selection formats** in your callback (boundary vs custom)

## Troubleshooting

### Hover effects not working after custom drawing
- Ensure `markLayerRecreationNeeded()` is called before SketchViewModel creation
- Check that `switchGeographicLevel()` is called when returning to boundary mode
- Verify debug logs show successful layer recreation

### Initial hover effects not working
- Check that the map is fully stationary before interactivity setup
- Look for "Map view initialization completed successfully" in debug logs
- Ensure proper completion handling in the view ready callback

### Graphics not appearing on highlight layer
- Verify the layer is properly added to the map
- Check that graphics are being added to the correct layer
- Look for any console errors during layer recreation