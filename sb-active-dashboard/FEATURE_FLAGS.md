# Feature Flags for Geographic Boundaries

## Overview
The Geographic Boundaries Service now supports feature flags to control whether to show all California cities and service areas, or just the filtered Santa Barbara County list.

## Available Feature Flags

### `VITE_SHOW_ALL_CA_CITIES`
- **Default**: `false` (shows only Santa Barbara County cities: 7 total)
- **When `true`**: Shows ALL cities in California (482 total)
- **Impact**: Dramatically increases the number of selectable city polygons

### `VITE_SHOW_ALL_CA_SERVICE_AREAS` 
- **Default**: `false` (shows only Santa Barbara County CDPs: 17 total)
- **When `true`**: Shows ALL Census Designated Places in California (1,129 total)
- **Impact**: Dramatically increases the number of selectable service area polygons

## How to Enable

### Option 1: Create a `.env` file
Create a `.env` file in the project root with:
```bash
# Enable all California cities
VITE_SHOW_ALL_CA_CITIES=true

# Enable all California service areas  
VITE_SHOW_ALL_CA_SERVICE_AREAS=true
```

### Option 2: Set environment variables directly
```bash
# For development
VITE_SHOW_ALL_CA_CITIES=true VITE_SHOW_ALL_CA_SERVICE_AREAS=true npm run dev

# For build
VITE_SHOW_ALL_CA_CITIES=true VITE_SHOW_ALL_CA_SERVICE_AREAS=true npm run build
```

## Coverage Comparison

| Mode | Cities | Service Areas | Total Places |
|------|--------|---------------|--------------|
| **Default (Santa Barbara County only)** | 7 | 17 | 24 |
| **All California** | 482 | 1,129 | 1,611 |

## Performance Considerations

- **Loading**: All California mode will load significantly more boundary data
- **Rendering**: More polygons to render on the map
- **Selection**: Much larger dropdown/selection lists
- **Memory**: Higher memory usage for boundary geometries

## Use Cases

### Default Mode (Santa Barbara County only)
- Production deployment focused on Santa Barbara area
- Faster loading and better performance
- Curated list of relevant places

### All California Mode  
- Development and testing
- Comprehensive coverage for incidents across California
- Research and analysis requiring statewide data

## Implementation Details

The feature flags are checked in `GeographicBoundariesService.ts` constructor:
- When enabled: Uses `STATE = '06'` (all California)
- When disabled: Uses name-based filtering for specific places

## Testing

Run the boundary service tests to verify both modes work:
```bash
npm test -- GeographicBoundariesService.test.ts
```
