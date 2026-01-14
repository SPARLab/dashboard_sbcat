# Utilities & Data Services Architecture

## Overview

This directory contains the data infrastructure for the Santa Barbara Active Transportation Dashboard. It's organized into two main layers:

1. **Data Services** - High-level chart data services (one import per chart)
2. **Utilities** - Lower-level utility functions organized by domain

## Usage Patterns

### Chart Components (Recommended)

```typescript
// In a chart component - direct import, clean service usage
import { VolumeChartDataService } from '@/lib/data-services/VolumeChartDataService';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filterStore';

function SummaryStatisticsChart() {
  const volumeFilters = useFilterStore(state => state.volumeFilters);
  const mapView = useMapView();
  
  // Create service instance (or get from provider/context)
  const volumeChartService = new VolumeChartDataService(sitesLayer, countsLayer, aadtLayer);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary-stats', volumeFilters],
    queryFn: () => volumeChartService.getSummaryStatistics(mapView, volumeFilters),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  if (isLoading) return <SkeletonLoader />;
  if (error || !data) return <InsufficientDataWarning />;
  
  return <ChartComponent data={data} />;
}
```

### Direct Utility Usage (Advanced)

```typescript
// When you need more control - import specific utilities
import { CountSiteProcessingService } from '@/lib/utilities/volume-utils/count-site-processing';
import { FilterUtilService } from '@/lib/utilities/shared/filtering';

// Build custom queries
const whereClause = FilterUtilService.buildCountTypeWhereClause(['bike', 'ped']);
const customData = await CountSiteProcessingService.getSummaryStatistics(/* ... */);
```

## Directory Structure

```
lib/
├── data-services/                   # High-level chart data services
│   ├── VolumeChartDataService.ts    # → All volume chart data
│   └── SafetyChartDataService.ts    # → All safety chart data
│
└── utilities/                       # Lower-level utility functions
    ├── shared/                      # Cross-component utilities
    │   ├── filtering.ts             # WHERE clause builders
    │   ├── spatial.ts               # Extent queries, geography
    │   └── aggregation.ts           # Statistical operations
    │
    ├── volume-utils/                # Volume-specific utilities
    │   └── count-site-processing.ts # Count site analysis
    │
    ├── safety-utils/                # Safety-specific utilities  
    │   └── incident-processing.ts   # Incident analysis
    │
    └── chart-data-prep/             # Chart-specific data prep
        └── time-series-prep.ts      # Time series formatting
```

## Key Benefits

- **One import per chart** - Clean component code
- **Consistent caching** - Shared query patterns
- **No blinking re-renders** - Smart state management  
- **Easy testing** - Isolated utility functions
- **Clear organization** - Obvious where to find/add code

## Chart Component Examples

### Volume Page Charts
```typescript
import { VolumeChartDataService } from '@/lib/data-services/VolumeChartDataService';
const volumeService = new VolumeChartDataService(sitesLayer, countsLayer, aadtLayer);

// Chart method mapping:
// SummaryStatistics → volumeService.getSummaryStatistics()
// HighestVolume → volumeService.getHighestVolumeData()
// TimelineSparkline → volumeService.getTimelineSparklineData()
// ModeBreakdown → volumeService.getModeBreakdownData()
// YearToYearComparison → volumeService.getYearToYearComparisonData()
```

### Safety Page Charts  
```typescript
import { SafetyChartDataService } from '@/lib/data-services/SafetyChartDataService';
const safetyService = new SafetyChartDataService(incidentsLayer, weightsLayer);

// Chart method mapping:
// SummaryStatistics → safetyService.getSummaryStatistics()
// MostDangerousAreas → safetyService.getMostDangerousAreasData()
// SeverityBreakdown → safetyService.getSeverityBreakdownData()
// IncidentsVsTrafficRatios → safetyService.getIncidentsVsTrafficRatiosData()
```

## Performance Strategy

- **Zustand** for filter state (no React re-renders)
- **React Query** for data caching and background updates
- **Server-side aggregation** where possible  
- **Invisible line segments** for detailed data without rendering lag
- **Progressive loading** for large datasets

## Next Steps

1. Implement modeled data with invisible line segments
2. Add Zustand filter state management
3. Integrate React Query for caching
4. Build out remaining utility functions
5. Add comprehensive error handling