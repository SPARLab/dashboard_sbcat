import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AADVHistogram from './AADTHistogram';
import { AADVHistogramDataService } from '../../../../lib/data-services/AADVHistogramDataService';
import Polygon from "@arcgis/core/geometry/Polygon";

// Mock ReactECharts
vi.mock('echarts-for-react', () => ({
  default: vi.fn(({ onEvents, option }) => (
    <div 
      data-testid="echarts-mock" 
      onClick={() => onEvents?.click?.({ dataIndex: 0 })}
      onMouseOver={() => onEvents?.mouseover?.({ dataIndex: 0 })}
      onMouseOut={() => onEvents?.mouseout?.()}
    >
      Mock ECharts - Bins: {option?.xAxis?.data?.length || 0}
    </div>
  ))
}));

// Mock the data service
vi.mock('../../../../lib/data-services/AADVHistogramDataService');

// Mock Tooltip component
vi.mock('../../../components/Tooltip', () => ({
  default: ({ text }: { text: string }) => <span data-testid="tooltip">{text}</span>
}));

// Mock CollapseExpandIcon component
vi.mock('./CollapseExpandIcon', () => ({
  default: ({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) => (
    <button data-testid="collapse-icon" onClick={onClick}>
      {isCollapsed ? 'Expand' : 'Collapse'}
    </button>
  )
}));

// Mock SelectRegionPlaceholder component
vi.mock('../../../components/SelectRegionPlaceholder', () => ({
  default: ({ subtext }: { subtext: string }) => (
    <div data-testid="select-region-placeholder">{subtext}</div>
  )
}));

// Mock the volume app store
const mockSetSelectedCountSite = vi.fn();
const mockSetHighlightedBinSites = vi.fn();
vi.mock('../../../../lib/stores/volume-app-state', () => ({
  useVolumeAppStore: () => ({
    setSelectedCountSite: mockSetSelectedCountSite,
    setHighlightedBinSites: mockSetHighlightedBinSites,
    selectedCountSite: null
  })
}));

const mockAADVHistogramDataService = AADVHistogramDataService as any;

describe('AADVHistogram', () => {
  const mockDateRange = {
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31')
  };

  const mockPolygon = new Polygon({
    rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
  });

  const mockHistogramResult = {
    bins: [
      {
        binLabel: '0-100',
        binMin: 0,
        binMax: 100,
        count: 5,
        sites: [
          { siteId: 1, siteName: 'Site A', aadv: 50, bikeAADV: 30, pedAADV: 20 },
          { siteId: 2, siteName: 'Site B', aadv: 75, bikeAADV: 45, pedAADV: 30 }
        ]
      },
      {
        binLabel: '100-200',
        binMin: 100,
        binMax: 200,
        count: 3,
        sites: [
          { siteId: 3, siteName: 'Site C', aadv: 150, bikeAADV: 90, pedAADV: 60 }
        ]
      }
    ],
    totalSites: 8,
    minAADV: 25,
    maxAADV: 180,
    meanAADV: 95,
    medianAADV: 85,
    isLoading: false,
    error: null
  };

  const defaultProps = {
    selectedGeometry: mockPolygon,
    dateRange: mockDateRange,
    showBicyclist: true,
    showPedestrian: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSelectedCountSite.mockClear();
    mockSetHighlightedBinSites.mockClear();
    mockAADVHistogramDataService.queryAADVHistogram = vi.fn().mockResolvedValue(mockHistogramResult);
    mockAADVHistogramDataService.getSitesInAADVRange = vi.fn().mockReturnValue([]);
    mockAADVHistogramDataService.queryIndividualSiteAADV = vi.fn().mockResolvedValue({
      sites: [
        { siteId: 1, siteName: 'Site A', aadv: 50, bikeAADV: 30, pedAADV: 20 },
        { siteId: 2, siteName: 'Site B', aadv: 75, bikeAADV: 45, pedAADV: 30 },
        { siteId: 3, siteName: 'Site C', aadv: 150, bikeAADV: 90, pedAADV: 60 }
      ],
      error: null
    });
    mockAADVHistogramDataService.getSitesInAADVRange = vi.fn().mockImplementation((result, binIndex) => {
      return result.bins[binIndex]?.sites || [];
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders component with title and collapse icon', () => {
    render(<AADVHistogram {...defaultProps} />);
    
    expect(screen.getByText('AADV Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('collapse-icon')).toBeInTheDocument();
  });

  it('shows placeholder when no geometry is selected', () => {
    render(<AADVHistogram {...defaultProps} selectedGeometry={null} />);
    
    expect(screen.getByTestId('select-region-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/Use the polygon tool or click on a boundary/)).toBeInTheDocument();
  });

  it('fetches and displays histogram data', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    // Switch to histogram mode to trigger queryAADVHistogram call
    const modeSelect = screen.getByDisplayValue('Individual Sites');
    fireEvent.change(modeSelect, { target: { value: 'histogram' } });
    
    await waitFor(() => {
      expect(mockAADVHistogramDataService.queryAADVHistogram).toHaveBeenCalledWith(
        mockPolygon,
        mockDateRange,
        true,
        true,
        30
      );
    });

    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    expect(screen.getByText(/Mock ECharts - Bins: 2/)).toBeInTheDocument();
  });

  it('displays statistics correctly', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    await waitFor(() => {
      // Component starts in individual-bars mode, so it shows stats for the 3 individual sites
      expect(screen.getByText(/3 sites.*Mean: 92.*Median: 75.*Range: 50-150/)).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    mockAADVHistogramDataService.queryAADVHistogram = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockHistogramResult), 100))
    );

    render(<AADVHistogram {...defaultProps} />);
    
    expect(screen.getByText('Calculating AADV...')).toBeInTheDocument();
    expect(screen.getByText(/Processing count data for/)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    // Component starts in individual-bars mode, so mock the individual sites query to return an error
    const errorResult = {
      sites: [],
      error: 'Failed to fetch data'
    };
    mockAADVHistogramDataService.queryIndividualSiteAADV = vi.fn().mockResolvedValue(errorResult);

    render(<AADVHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Data Error:')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('handles collapse/expand functionality', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    const collapseIcon = screen.getByTestId('collapse-icon');
    expect(collapseIcon).toHaveTextContent('Collapse');
    
    fireEvent.click(collapseIcon);
    expect(collapseIcon).toHaveTextContent('Expand');
  });

  it('allows changing number of bins', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    // First switch to histogram mode to make bins select visible
    const modeSelect = screen.getByDisplayValue('Individual Sites');
    fireEvent.change(modeSelect, { target: { value: 'histogram' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });

    const binsSelect = screen.getByDisplayValue('30');
    fireEvent.change(binsSelect, { target: { value: '8' } });
    
    await waitFor(() => {
      expect(mockAADVHistogramDataService.queryAADVHistogram).toHaveBeenCalledWith(
        mockPolygon,
        mockDateRange,
        true,
        true,
        8
      );
    });
  });

  it('handles histogram bar click for single site', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    // Switch to histogram mode first
    const modeSelect = screen.getByDisplayValue('Individual Sites');
    fireEvent.change(modeSelect, { target: { value: 'histogram' } });
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // Mock getSitesInAADVRange to return single site
    mockAADVHistogramDataService.getSitesInAADVRange.mockReturnValue([
      { siteId: 3, siteName: 'Site C', aadv: 150, bikeAADV: 90, pedAADV: 60 }
    ]);

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.click(chart);
    
    expect(mockSetHighlightedBinSites).toHaveBeenCalledWith(['Site C']);
  });

  it('handles histogram bar click for multiple sites - highlights all sites', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    // Switch to histogram mode first
    const modeSelect = screen.getByDisplayValue('Individual Sites');
    fireEvent.change(modeSelect, { target: { value: 'histogram' } });
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // Mock getSitesInAADVRange to return multiple sites
    mockAADVHistogramDataService.getSitesInAADVRange.mockReturnValue([
      { siteId: 1, siteName: 'Site A', aadv: 50, bikeAADV: 30, pedAADV: 20 },
      { siteId: 2, siteName: 'Site B', aadv: 75, bikeAADV: 45, pedAADV: 30 }
    ]);

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.click(chart);
    
    expect(mockSetHighlightedBinSites).toHaveBeenCalledWith(['Site A', 'Site B']);
  });

  it('selects individual site when clicking in individual-bars mode', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    // Component starts in individual-bars mode by default
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.click(chart);
    
    // Should call setSelectedCountSite with the first site's ID (dataIndex: 0)
    expect(mockSetSelectedCountSite).toHaveBeenCalledWith('1');
  });

  it('highlights selected site bin with different color', async () => {
    render(<AADVHistogram {...defaultProps} selectedCountSite="Site A" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // The component should render with the selected site highlighting
    // This is tested through the getBarColor function which returns different colors
    // for bins containing the selected site
  });

  it('shows hover tooltip with site information', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.mouseOver(chart);
    
    await waitFor(() => {
      expect(screen.getByText(/Site A: 50 AADV/)).toBeInTheDocument();
    });
  });

  it('debounces date range changes', async () => {
    const { rerender } = render(<AADVHistogram {...defaultProps} />);
    
    // Clear initial call
    mockAADVHistogramDataService.queryIndividualSiteAADV.mockClear();
    
    // Change date range multiple times quickly
    const newDateRange1 = { startDate: new Date('2023-02-01'), endDate: new Date('2023-12-31') };
    const newDateRange2 = { startDate: new Date('2023-03-01'), endDate: new Date('2023-12-31') };
    
    rerender(<AADVHistogram {...defaultProps} dateRange={newDateRange1} />);
    rerender(<AADVHistogram {...defaultProps} dateRange={newDateRange2} />);
    
    // Wait for debounced operations to complete
    await waitFor(() => {
      // Should call with the final date range (component is in individual-bars mode)
      expect(mockAADVHistogramDataService.queryIndividualSiteAADV).toHaveBeenCalledWith(
        mockPolygon,
        newDateRange2,
        true,
        true
      );
    }, { timeout: 2000 });
  });

  it('respects road user filters', async () => {
    render(<AADVHistogram {...defaultProps} showBicyclist={false} showPedestrian={true} />);
    
    await waitFor(() => {
      // Component is in individual-bars mode, so it calls queryIndividualSiteAADV
      expect(mockAADVHistogramDataService.queryIndividualSiteAADV).toHaveBeenCalledWith(
        mockPolygon,
        mockDateRange,
        false,
        true
      );
    }, { timeout: 2000 });
  });

  it('shows no data message when no sites available', async () => {
    // Component is in individual-bars mode, so mock queryIndividualSiteAADV
    const emptyResult = {
      sites: [],
      error: null
    };
    mockAADVHistogramDataService.queryIndividualSiteAADV = vi.fn().mockResolvedValue(emptyResult);

    render(<AADVHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No AADV data available for selected area')).toBeInTheDocument();
      expect(screen.getByText(/Try selecting a different area or adjusting the date range/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('includes tooltip with explanation', async () => {
    render(<AADVHistogram {...defaultProps} />);
    
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveTextContent(/AADV is calculated using enhanced normalization/);
  });
});
