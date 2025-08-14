import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';

// Mock heavy child components to avoid rendering charts/HTML elements directly
vi.mock('../components/right-sidebar/AggregatedVolumeBreakdown', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/CompletenessMetrics', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/HighestVolume', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/LowDataCoverage', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/PercentOfNetworkByVolumeLevelBarChart', () => ({
  default: vi.fn((props) => (
    <div data-testid="percent-network-chart">
      <span data-testid="chart-year">{props.year}</span>
      <span data-testid="chart-model-type">{props.modelCountsBy}</span>
      <span data-testid="chart-data-type">{props.dataType}</span>
    </div>
  ))
}));
vi.mock('../components/right-sidebar/ModeBreakdown', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/SummaryStatistics', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/TimelineSparkline', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/TrendsHeader', () => ({
  default: () => null,
}));
vi.mock('../components/right-sidebar/YearToYearVolumeComparison', () => ({
  default: () => null,
}));

import NewVolumeRightSidebar from './NewVolumeRightSidebar';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

describe('NewVolumeRightSidebar - AADT site highlighting', () => {
  beforeEach(() => {
    // Ensure we start with a clean constructor mock
    (FeatureLayer as unknown as { mockClear: () => void }).mockClear?.();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderSidebar(uiProps?: Partial<React.ComponentProps<typeof NewVolumeRightSidebar>>) {
    const aadtLayer: any = { title: 'AADT Count Sites', renderer: null };

    const defaultProps: React.ComponentProps<typeof NewVolumeRightSidebar> = {
      activeTab: 'raw-data',
      showBicyclist: true,
      showPedestrian: true,
      modelCountsBy: 'cost-benefit',
      mapView: null,
      aadtLayer,
      selectedGeometry: {} as any,
      selectedAreaName: null,
      dateRange: { startDate: new Date('2020-01-01'), endDate: new Date('2020-12-31') },
      selectedCountSite: null,
      onCountSiteSelect: () => {},
      selectedYear: 2023,
    };

    const utils = render(<NewVolumeRightSidebar {...defaultProps} {...uiProps} />);
    return { ...utils, aadtLayer };
  }

  it('sets hollow renderer when no selection', async () => {
    const { aadtLayer } = renderSidebar({ selectedGeometry: null });

    await waitFor(() => {
      expect(aadtLayer.renderer).toBeTruthy();
      expect('valueExpression' in (aadtLayer.renderer || {})).toBe(false);
    });
  });

  it('applies a UniqueValueRenderer with contributing site ids', async () => {
    // Mock constructor to return specific layer instances in order: sitesLayer, countsLayer, aadtTable
    (FeatureLayer as unknown as jest.Mock).mockImplementationOnce(() => ({
      // sitesLayer
      title: 'Count Sites',
      createQuery: vi.fn(() => ({})),
      queryFeatures: vi.fn().mockResolvedValue({
        features: [
          { attributes: { id: 1 } },
          { attributes: { id: 2 } },
        ],
      }),
    }))
    .mockImplementationOnce(() => ({
      // countsLayer
      title: 'Counts',
      createQuery: vi.fn(() => ({
        // allow mutation in component
      })),
      queryFeatures: vi.fn().mockResolvedValue({
        features: [{ attributes: { site_id: 2, site_count: 5 } }],
      }),
    }))
    .mockImplementationOnce(() => ({
      // aadtTable (unused here)
      title: 'AADT Table',
      createQuery: vi.fn(() => ({})),
      queryFeatures: vi.fn().mockResolvedValue({ features: [] }),
    }));

    const { aadtLayer } = renderSidebar();

    await waitFor(() => {
      expect(aadtLayer.renderer).toBeTruthy();
      expect(aadtLayer.renderer.valueExpression).toContain('IndexOf');
      expect(aadtLayer.renderer.valueExpression).toContain('[2]');
      expect(aadtLayer.renderer.valueExpression).toContain('Number($feature.id)');
    });
  });

  it('resets to hollow when both toggles are off', async () => {
    const { aadtLayer } = renderSidebar({ showBicyclist: false, showPedestrian: false });

    await waitFor(() => {
      expect(aadtLayer.renderer).toBeTruthy();
      expect('valueExpression' in (aadtLayer.renderer || {})).toBe(false);
    });
  });

  it('re-applies styling when date range changes', async () => {
    // First render constructor sequence (sites, counts, aadtTable)
    ;(FeatureLayer as unknown as jest.Mock)
      .mockImplementationOnce(() => ({
        title: 'Count Sites',
        createQuery: vi.fn(() => ({})),
        queryFeatures: vi.fn().mockResolvedValue({ features: [{ attributes: { id: 1 } }] }),
      }))
      .mockImplementationOnce(() => ({
        title: 'Counts',
        createQuery: vi.fn(() => ({})),
        queryFeatures: vi.fn().mockResolvedValue({ features: [{ attributes: { site_id: 1, site_count: 1 } }] }),
      }))
      .mockImplementationOnce(() => ({
        title: 'AADT Table',
        createQuery: vi.fn(() => ({})),
        queryFeatures: vi.fn().mockResolvedValue({ features: [] }),
      }));

    const { rerender, aadtLayer } = renderSidebar({
      dateRange: { startDate: new Date('2020-01-01'), endDate: new Date('2020-06-30') },
    });

    await waitFor(() => {
      expect(aadtLayer.renderer?.valueExpression).toContain('[1]');
    });

    // Re-render with new date range; mock new constructor instances are not created (state preserves them)
    // So we instead rely on previous layer mocks; simulate different results by swapping their queryFeatures
    // However, since instances are closed over, the simpler approach is to re-mount the component.

    cleanup();

    ;(FeatureLayer as unknown as jest.Mock)
      .mockImplementationOnce(() => ({
        title: 'Count Sites',
        createQuery: vi.fn(() => ({})),
        queryFeatures: vi.fn().mockResolvedValue({ features: [
          { attributes: { id: 1 } }, { attributes: { id: 3 } }
        ] }),
      }))
      .mockImplementationOnce(() => ({
        title: 'Counts',
        createQuery: vi.fn(() => ({})),
        queryFeatures: vi.fn().mockResolvedValue({ features: [{ attributes: { site_id: 3, site_count: 2 } }] }),
      }))
      .mockImplementationOnce(() => ({
        title: 'AADT Table',
        createQuery: vi.fn(() => ({})),
        queryFeatures: vi.fn().mockResolvedValue({ features: [] }),
      }));

    const { aadtLayer: aadtLayer2 } = renderSidebar({
      dateRange: { startDate: new Date('2020-07-01'), endDate: new Date('2020-12-31') },
    });

    await waitFor(() => {
      expect(aadtLayer2.renderer?.valueExpression).toContain('[3]');
    });
  });
});

describe('NewVolumeRightSidebar - selectedYear prop handling', () => {
  beforeEach(() => {
    (FeatureLayer as unknown as { mockClear: () => void }).mockClear?.();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderSidebar(uiProps?: Partial<React.ComponentProps<typeof NewVolumeRightSidebar>>) {
    const aadtLayer: any = { title: 'AADT Count Sites', renderer: null };

    const defaultProps: React.ComponentProps<typeof NewVolumeRightSidebar> = {
      activeTab: 'modeled-data',
      showBicyclist: true,
      showPedestrian: true,
      modelCountsBy: 'cost-benefit',
      mapView: null,
      aadtLayer,
      selectedGeometry: {} as any,
      selectedAreaName: null,
      dateRange: { startDate: new Date('2020-01-01'), endDate: new Date('2020-12-31') },
      selectedCountSite: null,
      onCountSiteSelect: () => {},
      selectedYear: 2023,
    };

    const utils = render(<NewVolumeRightSidebar {...defaultProps} {...uiProps} />);
    return { ...utils, aadtLayer };
  }

  it('should pass selectedYear prop to PercentOfNetworkByVolumeLevelBarChart', () => {
    const { getByTestId } = renderSidebar({ selectedYear: 2020 });
    
    expect(getByTestId('chart-year')).toHaveTextContent('2020');
  });

  it('should pass model type to chart component', () => {
    const { getByTestId } = renderSidebar({ modelCountsBy: 'cost-benefit' });
    
    expect(getByTestId('chart-model-type')).toHaveTextContent('cost-benefit');
  });

  it('should pass active tab as data type to chart', () => {
    const { getByTestId } = renderSidebar({ activeTab: 'modeled-data' });
    
    expect(getByTestId('chart-data-type')).toHaveTextContent('modeled-data');
  });

  it('should only show chart for modeled-data tab', () => {
    const { queryByTestId } = renderSidebar({ activeTab: 'raw-data' });
    
    expect(queryByTestId('percent-network-chart')).not.toBeInTheDocument();
  });

  it('should show chart for modeled-data tab', () => {
    const { getByTestId } = renderSidebar({ activeTab: 'modeled-data' });
    
    expect(getByTestId('percent-network-chart')).toBeInTheDocument();
  });

  it('should update chart year when selectedYear prop changes', () => {
    const { getByTestId, rerender } = renderSidebar({ selectedYear: 2019 });
    
    expect(getByTestId('chart-year')).toHaveTextContent('2019');
    
    // Mock the component constructor to avoid re-creating FeatureLayer instances
    const aadtLayer: any = { title: 'AADT Count Sites', renderer: null };
    const updatedProps: React.ComponentProps<typeof NewVolumeRightSidebar> = {
      activeTab: 'modeled-data',
      showBicyclist: true,
      showPedestrian: true,
      modelCountsBy: 'cost-benefit',
      mapView: null,
      aadtLayer,
      selectedGeometry: {} as any,
      selectedAreaName: null,
      dateRange: { startDate: new Date('2020-01-01'), endDate: new Date('2020-12-31') },
      selectedCountSite: null,
      onCountSiteSelect: () => {},
      selectedYear: 2022,
    };
    
    rerender(<NewVolumeRightSidebar {...updatedProps} />);
    
    expect(getByTestId('chart-year')).toHaveTextContent('2022');
  });
});

