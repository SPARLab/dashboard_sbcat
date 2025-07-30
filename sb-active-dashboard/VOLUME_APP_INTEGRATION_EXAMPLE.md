# Volume App Integration Example

## How to Connect Geographic Boundaries to Your Volume Data

Here's a practical example of how to integrate the `GeographicBoundariesService` with your existing volume app.

### 1. Update Your Volume Map Component

```typescript
// In ui/volume-app/components/map/NewVolumeMap.tsx

import { GeographicBoundariesService } from '@/lib/data-services/GeographicBoundariesService';

export default function NewVolumeMap() {
  const [boundaryService] = useState(() => new GeographicBoundariesService());
  const [selectedBoundary, setSelectedBoundary] = useState<any>(null);

  useEffect(() => {
    if (mapRef && viewRef) {
      // Add boundary layers to map
      const boundaryLayers = boundaryService.getBoundaryLayers();
      boundaryLayers.forEach(layer => mapRef.add(layer));
    }
  }, [mapRef, viewRef]);

  // Function to switch geographic level
  const handleGeographicLevelChange = async (level: string) => {
    if (!viewRef) return;
    
    const result = await boundaryService.switchGeographicLevel(level, viewRef);
    
    if (result.success && result.defaultArea) {
      setSelectedBoundary(result.defaultArea);
      // Trigger volume data refresh with new boundary
      await refreshVolumeData(result.defaultArea.geometry);
    }
  };

  return (
    <div>
      {/* Your existing map JSX */}
    </div>
  );
}
```

### 2. Update Your Sidebar with Geographic Level Selector

```typescript
// In ui/volume-app/layout/NewVolumeLeftSidebar.tsx

import GeographicLevelSection from '@/ui/components/filters/GeographicLevelSection';

export default function NewVolumeLeftSidebar() {
  return (
    <div className="space-y-4">
      {/* Add geographic level selector at the top */}
      <GeographicLevelSection 
        onLevelChange={handleGeographicLevelChange}
        selectedLevel={currentGeographicLevel}
      />
      
      {/* Your existing filters */}
      <ModelCountTypeSection />
      <RoadUserSection />
      {/* ... other sections */}
    </div>
  );
}
```

### 3. Enhance GeographicLevelSection with Callbacks

```typescript
// Update ui/components/filters/GeographicLevelSection.tsx

interface GeographicLevelSectionProps {
  onLevelChange?: (level: string) => void;
  selectedLevel?: string;
}

export default function GeographicLevelSection({ 
  onLevelChange, 
  selectedLevel = 'census-tract' 
}: GeographicLevelSectionProps) {
  const [geographicLevel, setGeographicLevel] = useState(selectedLevel);

  const handleLevelChange = (level: string) => {
    setGeographicLevel(level);
    onLevelChange?.(level);
  };

  // Rest of your component...
}
```

### 4. Update Your Volume Data Service

```typescript
// In lib/data-services/ModeledVolumeDataService.ts

// Add geometry filtering to your existing queries
export async function queryVolumeDataWithBoundary(
  geometry: __esri.Geometry,
  roadUsers: string[],
  // ... other params
) {
  const networkQuery = networkLayer.createQuery();
  networkQuery.geometry = geometry;
  networkQuery.spatialRelationship = 'intersects';
  networkQuery.outFields = ['objectid', 'route_id', 'shape_length'];
  networkQuery.returnGeometry = true;

  // Your existing query logic with geometry filter
  const networkFeatures = await networkLayer.queryFeatures(networkQuery);
  
  // Continue with your existing join logic...
}
```

### 5. Update Charts to Respond to Boundary Changes

```typescript
// In ui/volume-app/components/right-sidebar/MilesOfStreetByTrafficLevelBarChart.tsx

useEffect(() => {
  const fetchData = async () => {
    if (!viewRef || !selectedBoundary) return;

    setIsLoading(true);
    try {
      // Use boundary geometry to filter data
      const data = await queryVolumeDataWithBoundary(
        selectedBoundary.geometry,
        roadUsers,
        dateRange
      );
      
      setChartData(processDataForChart(data));
    } catch (error) {
      console.error('Error fetching volume data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [viewRef, selectedBoundary, roadUsers, dateRange]); // Add selectedBoundary to deps
```

## Quick Test Implementation

To quickly test this:

1. **Start your dev server**: `pnpm dev`
2. **Navigate to test page**: `http://localhost:5173/dashboard/test-boundaries`
3. **Run all tests** to verify boundary services work
4. **Check console** for any errors
5. **Click boundary features** on map to see popup data

## Integration Checklist

- [ ] Add GeographicBoundariesService to your volume map component
- [ ] Add boundary layers to map
- [ ] Connect GeographicLevelSection to service callbacks  
- [ ] Update volume data queries to accept geometry parameter
- [ ] Update charts to refresh when boundary changes
- [ ] Test end-to-end workflow

## Expected Behavior

When working correctly:
1. User selects "County" → Map shows county boundaries, volume data filters to Santa Barbara County
2. User selects "Census Tract" → Map shows census tracts, volume data filters to tract containing map center
3. Charts update automatically to show data only within selected boundary
4. User can click boundaries to see details and select specific areas

This provides the spatial filtering functionality you need for your volume dashboard!