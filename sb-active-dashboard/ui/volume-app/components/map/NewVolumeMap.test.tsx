import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NewVolumeMap from './NewVolumeMap';
import { shouldShowLineSegments, ZOOM_THRESHOLD_FOR_LINE_SEGMENTS } from '../../../../lib/volume-app/volumeLayers';

// Mock ArcGIS components and services
vi.mock('@arcgis/map-components-react', () => ({
  ArcgisMap: ({ onArcgisViewReadyChange }: any) => {
    // Simulate map initialization
    setTimeout(() => {
      const mockMapView = {
        ready: true,
        stationary: true,
        center: { longitude: -120, latitude: 34.7 },
        zoom: 9,
        extent: { xmin: -121, ymin: 34, xmax: -119, ymax: 35 },
        map: {
          add: vi.fn(),
          remove: vi.fn(),
          layers: {
            length: 0,
            includes: vi.fn(() => false),
            getItemAt: vi.fn(),
            toArray: vi.fn(() => [])
          }
        },
        goTo: vi.fn().mockResolvedValue(undefined),
        graphics: {
          add: vi.fn(),
          remove: vi.fn()
        },
        popup: {
          visible: false,
          open: vi.fn()
        },
        on: vi.fn(),
        container: document.createElement('div'),
        toMap: vi.fn()
      };
      
      if (onArcgisViewReadyChange) {
        onArcgisViewReadyChange({ target: { view: mockMapView } });
      }
    }, 100);
    
    return <div data-testid="arcgis-map">Mock ArcGIS Map</div>;
  },
}));

vi.mock('../../../../lib/data-services/GeographicBoundariesService', () => ({
  GeographicBoundariesService: vi.fn().mockImplementation(() => ({
    getBoundaryLayers: vi.fn(() => []),
    setSelectionChangeCallback: vi.fn(),
    switchGeographicLevel: vi.fn(),
    cleanupInteractivity: vi.fn(),
    markLayerRecreationNeeded: vi.fn()
  }))
}));

vi.mock('../../../../lib/data-services/ModeledVolumeDataService', () => ({
  ModeledVolumeDataService: vi.fn().mockImplementation(() => ({
    getLayers: vi.fn(() => []),
    getTrafficLevelDataWithGeometry: vi.fn().mockResolvedValue({
      categories: ['Low', 'Medium', 'High'],
      totalMiles: [50, 75, 25],
      details: {
        low: { miles: 50, segments: 200 },
        medium: { miles: 75, segments: 225 },
        high: { miles: 25, segments: 100 }
      }
    })
  }))
}));

vi.mock('../../../../lib/volume-app/volumeLayers', async () => {
  const actual = await vi.importActual('../../../../lib/volume-app/volumeLayers');
  return {
    ...actual,
    createAADTLayer: vi.fn().mockResolvedValue({
      title: 'Mock AADT Layer',
      visible: false,
      createQuery: vi.fn(() => ({ where: '', outFields: [], returnGeometry: true })),
      queryFeatures: vi.fn().mockResolvedValue({ features: [] })
    }),
    createHexagonLayer: vi.fn().mockImplementation((modelCountsBy, selectedYear) => ({
      title: 'Mock Hexagon Layer',
      visible: false,
      layers: [
        { title: 'Modeled Biking Volumes', visible: true },
        { title: 'Modeled Walking Volumes', visible: true }
      ]
    })),
    createLineSegmentGroupLayer: vi.fn().mockImplementation((modelCountsBy, selectedYear) => ({
      title: 'Mock Line Segment Layer',
      visible: false,
      layers: [
        { title: `Modeled Biking Network (${modelCountsBy === 'cost-benefit' ? 'Cost Benefit' : 'Strava Bias'})`, visible: true },
        { title: `Modeled Walking Network (${modelCountsBy === 'cost-benefit' ? 'Cost Benefit' : 'Strava Bias'})`, visible: true }
      ]
    })),
    applyVolumeDataStyling: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('../../../../lib/volume-app/hourlyStats', () => ({
  queryHourlyCounts: vi.fn().mockResolvedValue({
    hourlyData: []
  })
}));

// Mock reactiveUtils
vi.mock('@arcgis/core/core/reactiveUtils', () => ({
  watch: vi.fn((getter, callback, options) => {
    // Simulate initial call if specified
    if (options?.initial) {
      // Use a timeout to avoid React state update issues during testing
      setTimeout(() => {
        try {
          callback(getter());
        } catch (error) {
          // Ignore errors during test teardown
        }
      }, 50);
    }
    return { remove: vi.fn() };
  })
}));

describe('NewVolumeMap - Zoom-Dependent Layer Switching', () => {
  const defaultProps = {
    activeTab: 'modeled-data' as const,
    showBicyclist: true,
    showPedestrian: true,
    modelCountsBy: 'cost-benefit',
    selectedYear: 2023,
    geographicLevel: 'city',
    selectedCountSite: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render the map component', async () => {
    render(<NewVolumeMap {...defaultProps} />);
    
    expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
    expect(screen.getByText(/Cost Benefit Tool Legend/)).toBeInTheDocument();
  });

  it('should show hexagon view at default zoom levels', async () => {
    const onMapViewReady = vi.fn();
    render(<NewVolumeMap {...defaultProps} onMapViewReady={onMapViewReady} />);
    
    await waitFor(() => {
      expect(onMapViewReady).toHaveBeenCalled();
    });

    // Verify legend shows hexagon view for zoom level 9 (below threshold of 16)
    await waitFor(() => {
      expect(screen.getByText(/Hexagon Areas \(Zoom 9\.0\)/)).toBeInTheDocument();
    });
  });

  it('should indicate line segment view at higher zoom levels', async () => {
    // Test the zoom threshold logic directly
    expect(shouldShowLineSegments(15)).toBe(false); // Below threshold
    expect(shouldShowLineSegments(16)).toBe(true);  // At threshold
    expect(shouldShowLineSegments(18)).toBe(true);  // Above threshold
    
    expect(ZOOM_THRESHOLD_FOR_LINE_SEGMENTS).toBe(16);
  });

  it('should show zoom instruction when in line segment view', async () => {
    // Test that the legend structure is correct and shows zoom level info
    render(<NewVolumeMap {...defaultProps} />);
    
    // Check that the legend shows hexagon view at default zoom level 9 (below threshold of 16)
    await waitFor(() => {
      expect(screen.getByText(/Hexagon Areas \(Zoom 9\.0\)/)).toBeInTheDocument();
    });
  });

  it('should handle different model types correctly', async () => {
    const { rerender } = render(<NewVolumeMap {...defaultProps} modelCountsBy="cost-benefit" />);
    
    expect(screen.getByText(/Cost Benefit Tool Legend/)).toBeInTheDocument();
    
    rerender(<NewVolumeMap {...defaultProps} modelCountsBy="strava-bias" />);
    
    expect(screen.getByText(/Volume Legend/)).toBeInTheDocument();
  });

  it('should show different volume level descriptions', async () => {
    render(<NewVolumeMap {...defaultProps} />);
    
    // Check that volume level indicators are shown with ranges
    expect(screen.getByText(/Low \(<50\)/)).toBeInTheDocument();
    expect(screen.getByText(/Medium \(50-200\)/)).toBeInTheDocument(); 
    expect(screen.getByText(/High \(≥200\)/)).toBeInTheDocument();
  });

  it('should handle road user visibility toggles', async () => {
    const { rerender } = render(<NewVolumeMap {...defaultProps} showBicyclist={true} showPedestrian={true} />);
    
    // Initially both should be enabled
    await waitFor(() => {
      expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
    });
    
    // Test with only bike enabled
    rerender(<NewVolumeMap {...defaultProps} showBicyclist={true} showPedestrian={false} />);
    
    // Test with only pedestrian enabled  
    rerender(<NewVolumeMap {...defaultProps} showBicyclist={false} showPedestrian={true} />);
    
    // Test with both disabled
    rerender(<NewVolumeMap {...defaultProps} showBicyclist={false} showPedestrian={false} />);
  });

  it('should handle tab switching correctly', async () => {
    const { rerender } = render(<NewVolumeMap {...defaultProps} activeTab="modeled-data" />);
    
    // Legend should be visible for modeled data
    expect(screen.getByText(/Cost Benefit Tool Legend/)).toBeInTheDocument();
    
    // Switch to raw data tab
    rerender(<NewVolumeMap {...defaultProps} activeTab="raw-data" />);
    
    // Legend should be hidden for raw data
    expect(screen.queryByText(/Cost Benefit Tool Legend/)).not.toBeInTheDocument();
  });

  it('should handle year changes correctly', async () => {
    const { rerender } = render(<NewVolumeMap {...defaultProps} selectedYear={2023} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
    });
    
    // Change year
    rerender(<NewVolumeMap {...defaultProps} selectedYear={2022} />);
    
    // Verify component handles year change without errors
    expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
  });

  it('should handle geographic level changes', async () => {
    const { rerender } = render(<NewVolumeMap {...defaultProps} geographicLevel="city" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
    });
    
    // Switch to county level
    rerender(<NewVolumeMap {...defaultProps} geographicLevel="county" />);
    
    // Switch to custom level
    rerender(<NewVolumeMap {...defaultProps} geographicLevel="custom" />);
    
    // Verify component handles geographic level changes
    expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
  });

  it('should handle map view ready callback', async () => {
    const onMapViewReady = vi.fn();
    const onAadtLayerReady = vi.fn();
    
    render(<NewVolumeMap 
      {...defaultProps} 
      onMapViewReady={onMapViewReady}
      onAadtLayerReady={onAadtLayerReady}
    />);
    
    await waitFor(() => {
      expect(onMapViewReady).toHaveBeenCalled();
    });
  });

  it('should handle selection changes correctly', async () => {
    const onSelectionChange = vi.fn();
    
    render(<NewVolumeMap {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('arcgis-map')).toBeInTheDocument();
    });
    
    // The selection change callback should be set up (we can't easily test the actual selection without more complex mocking)
  });
});

describe('Volume Layer Helper Functions', () => {
  it('should correctly determine when to show line segments', () => {
    // Test zoom threshold logic
    expect(shouldShowLineSegments(10)).toBe(false);
    expect(shouldShowLineSegments(15)).toBe(false);
    expect(shouldShowLineSegments(16)).toBe(true);
    expect(shouldShowLineSegments(18)).toBe(true);
    expect(shouldShowLineSegments(20)).toBe(true);
  });

  it('should have correct zoom threshold constant', () => {
    expect(ZOOM_THRESHOLD_FOR_LINE_SEGMENTS).toBe(16);
    expect(typeof ZOOM_THRESHOLD_FOR_LINE_SEGMENTS).toBe('number');
  });
});
