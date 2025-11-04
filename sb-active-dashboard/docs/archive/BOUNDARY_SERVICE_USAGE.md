# Geographic Boundaries Service - Usage Guide

## Overview
The `GeographicBoundariesService` provides access to 5 geographic boundary types for spatial filtering in your dashboard application.

## Available Boundary Types

1. **County** - USGS National Map county boundaries
2. **City / Service Area** - USGS National Map incorporated places  
3. **Census Tract** - U.S. Census Bureau TIGERweb 2020 data
4. **Hexagons** - Handled by modeled volume service
5. **Custom Draw Tool** - User-drawn areas

## Testing the Service

### 1. Test Page
Navigate to: `http://localhost:5173/dashboard/test-boundaries`

This test page provides:
- Visual map interface
- Individual and batch testing of all boundary types
- Real-time test results
- Data sources availability report
- Interactive boundary layer visualization

### 2. Manual Testing Steps
1. Click "Run All Tests" to test all boundary services
2. Watch for green (success) or red (error) results
3. Click individual boundary features on the map to see popup information
4. Test individual levels using the specific test buttons

## Integration with Your Volume App

### Basic Usage
```typescript
import { GeographicBoundariesService } from '@/lib/data-services/GeographicBoundariesService';

// Initialize service
const boundaryService = new GeographicBoundariesService();

// Add boundary layers to your map
const boundaryLayers = boundaryService.getBoundaryLayers();
boundaryLayers.forEach(layer => map.add(layer));

// Switch to a geographic level
const result = await boundaryService.switchGeographicLevel('census-tract', mapView);

if (result.success && result.defaultArea) {
  // Use the selected area geometry for spatial filtering
  console.log('Selected area:', result.defaultArea.name);
  console.log('Geometry:', result.defaultArea.geometry);
}
```

### Spatial Filtering Example
```typescript
// Get the currently selected area
const selectedArea = boundaryService.getSelectedArea();

if (selectedArea) {
  // Use geometry to filter your volume data
  const query = {
    geometry: selectedArea.geometry,
    spatialRelationship: 'intersects'
  };
  
  // Apply to your volume data service
  const filteredData = await modeledVolumeService.queryData(query);
}
```

### Error Handling
```typescript
const result = await boundaryService.switchGeographicLevel('county', mapView);

if (!result.success) {
  console.warn('Boundary service error:', result.warning);
  // Handle fallback or show user message
}
```

## Service API

### Methods

#### `getAvailableGeographicLevels(): GeographicLevel[]`
Returns array of available geographic levels based on loaded data sources.

#### `switchGeographicLevel(level, mapView): Promise<SwitchResult>`
Switches to a specific geographic level and returns the default selected area.

#### `getBoundaryLayers(): FeatureLayer[]`
Returns all boundary layers for adding to the map.

#### `getSelectedArea(): SelectedArea | null`
Returns the currently selected geographic area.

#### `getCurrentLevel(): GeographicLevel['id']`
Returns the current geographic level.

#### `isLevelAvailable(level): boolean`
Checks if a specific geographic level is available.

#### `getMissingDataSources(): DataSourcesReport`
Returns report of available and missing data sources.

### Types

```typescript
interface SelectedArea {
  id: string;
  name: string;
  geometry: __esri.Geometry;
  level: string;
}

interface SwitchResult {
  success: boolean;
  defaultArea?: SelectedArea;
  warning?: string;
}
```

## Data Sources

All boundary services use public, authentication-free endpoints:

- **Counties**: USGS National Map
- **Cities**: USGS National Map  
- **Census Tracts**: U.S. Census Bureau TIGERweb (2020 data)

No API keys or tokens required.

## Troubleshooting

1. **Service not loading**: Check browser console for network errors
2. **No boundaries visible**: Ensure layers are added to map and view is in Santa Barbara area
3. **Test failures**: Check network connectivity and service URLs
4. **Performance issues**: Consider zoom-level dependent layer visibility

## Next Steps

1. Test the service using the test page
2. Integrate with your volume app's filtering logic
3. Connect to the UI components in your sidebar
4. Add spatial filtering to your data queries