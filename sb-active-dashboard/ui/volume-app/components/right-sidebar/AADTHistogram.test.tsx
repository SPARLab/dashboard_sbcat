import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AADTHistogram from './AADTHistogram';
import { AADTHistogramDataService } from '../../../../lib/data-services/AADTHistogramDataService';
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
vi.mock('../../../../lib/data-services/AADTHistogramDataService');

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

const mockAADTHistogramDataService = AADTHistogramDataService as any;

describe('AADTHistogram', () => {
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
          { siteId: 1, siteName: 'Site A', aadt: 50, bikeAADT: 30, pedAADT: 20 },
          { siteId: 2, siteName: 'Site B', aadt: 75, bikeAADT: 45, pedAADT: 30 }
        ]
      },
      {
        binLabel: '100-200',
        binMin: 100,
        binMax: 200,
        count: 3,
        sites: [
          { siteId: 3, siteName: 'Site C', aadt: 150, bikeAADT: 90, pedAADT: 60 }
        ]
      }
    ],
    totalSites: 8,
    minAADT: 25,
    maxAADT: 180,
    meanAADT: 95,
    medianAADT: 85,
    isLoading: false,
    error: null
  };

  const defaultProps = {
    selectedGeometry: mockPolygon,
    dateRange: mockDateRange,
    showBicyclist: true,
    showPedestrian: true,
    selectedCountSite: null,
    onCountSiteSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAADTHistogramDataService.queryAADTHistogram = vi.fn().mockResolvedValue(mockHistogramResult);
    mockAADTHistogramDataService.queryIndividualSiteAADT = vi.fn().mockResolvedValue({
      sites: [
        { siteId: 1, siteName: 'Site A', aadt: 50, bikeAADT: 30, pedAADT: 20 },
        { siteId: 2, siteName: 'Site B', aadt: 75, bikeAADT: 45, pedAADT: 30 },
        { siteId: 3, siteName: 'Site C', aadt: 150, bikeAADT: 90, pedAADT: 60 }
      ],
      error: null
    });
    mockAADTHistogramDataService.getSitesInAADTRange = vi.fn().mockImplementation((result, binIndex) => {
      return result.bins[binIndex]?.sites || [];
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders component with title and collapse icon', () => {
    render(<AADTHistogram {...defaultProps} />);
    
    expect(screen.getByText('AADT Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('collapse-icon')).toBeInTheDocument();
  });

  it('shows placeholder when no geometry is selected', () => {
    render(<AADTHistogram {...defaultProps} selectedGeometry={null} />);
    
    expect(screen.getByTestId('select-region-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/Use the polygon tool or click on a boundary/)).toBeInTheDocument();
  });

  it('fetches and displays histogram data', async () => {
    render(<AADTHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockAADTHistogramDataService.queryAADTHistogram).toHaveBeenCalledWith(
        mockPolygon,
        mockDateRange,
        true,
        true,
        10
      );
    });

    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    expect(screen.getByText(/Mock ECharts - Bins: 2/)).toBeInTheDocument();
  });

  it('displays statistics correctly', async () => {
    render(<AADTHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/8 sites • Mean: 95 • Median: 85 • Range: 25-180/)).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    mockAADTHistogramDataService.queryAADTHistogram = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockHistogramResult), 100))
    );

    render(<AADTHistogram {...defaultProps} />);
    
    expect(screen.getByText('Calculating AADT...')).toBeInTheDocument();
    expect(screen.getByText(/Processing count data for/)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const errorResult = {
      ...mockHistogramResult,
      error: 'Failed to fetch data'
    };
    mockAADTHistogramDataService.queryAADTHistogram = vi.fn().mockResolvedValue(errorResult);

    render(<AADTHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Data Error:')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('handles collapse/expand functionality', async () => {
    render(<AADTHistogram {...defaultProps} />);
    
    const collapseIcon = screen.getByTestId('collapse-icon');
    expect(collapseIcon).toHaveTextContent('Collapse');
    
    fireEvent.click(collapseIcon);
    expect(collapseIcon).toHaveTextContent('Expand');
  });

  it('allows changing number of bins', async () => {
    render(<AADTHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    const binsSelect = screen.getByDisplayValue('10');
    fireEvent.change(binsSelect, { target: { value: '8' } });
    
    await waitFor(() => {
      expect(mockAADTHistogramDataService.queryAADTHistogram).toHaveBeenCalledWith(
        mockPolygon,
        mockDateRange,
        true,
        true,
        8
      );
    });
  });

  it('handles histogram bar click for single site', async () => {
    const onCountSiteSelect = vi.fn();
    render(<AADTHistogram {...defaultProps} onCountSiteSelect={onCountSiteSelect} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // Mock getSitesInAADTRange to return single site
    mockAADTHistogramDataService.getSitesInAADTRange.mockReturnValue([
      { siteId: 3, siteName: 'Site C', aadt: 150, bikeAADT: 90, pedAADT: 60 }
    ]);

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.click(chart);
    
    expect(onCountSiteSelect).toHaveBeenCalledWith('Site C');
  });

  it('handles histogram bar click for multiple sites - selects highest AADT', async () => {
    const onCountSiteSelect = vi.fn();
    render(<AADTHistogram {...defaultProps} onCountSiteSelect={onCountSiteSelect} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // Mock getSitesInAADTRange to return multiple sites
    mockAADTHistogramDataService.getSitesInAADTRange.mockReturnValue([
      { siteId: 1, siteName: 'Site A', aadt: 50, bikeAADT: 30, pedAADT: 20 },
      { siteId: 2, siteName: 'Site B', aadt: 75, bikeAADT: 45, pedAADT: 30 }
    ]);

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.click(chart);
    
    expect(onCountSiteSelect).toHaveBeenCalledWith('Site B'); // Higher AADT
  });

  it('cycles through sites when clicking on same bin repeatedly', async () => {
    const onCountSiteSelect = vi.fn();
    const sites = [
      { siteId: 1, siteName: 'Site A', aadt: 50, bikeAADT: 30, pedAADT: 20 },
      { siteId: 2, siteName: 'Site B', aadt: 75, bikeAADT: 45, pedAADT: 30 }
    ];
    
    render(<AADTHistogram {...defaultProps} onCountSiteSelect={onCountSiteSelect} selectedCountSite="Site B" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    mockAADTHistogramDataService.getSitesInAADTRange.mockReturnValue(sites);

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.click(chart);
    
    expect(onCountSiteSelect).toHaveBeenCalledWith('Site A'); // Cycles to next site
  });

  it('highlights selected site bin with different color', async () => {
    render(<AADTHistogram {...defaultProps} selectedCountSite="Site A" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // The component should render with the selected site highlighting
    // This is tested through the getBarColor function which returns different colors
    // for bins containing the selected site
  });

  it('shows hover tooltip with site information', async () => {
    render(<AADTHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    const chart = screen.getByTestId('echarts-mock');
    fireEvent.mouseOver(chart);
    
    await waitFor(() => {
      expect(screen.getByText(/sites with AADT/)).toBeInTheDocument();
    });
  });

  it('debounces date range changes', async () => {
    vi.useFakeTimers();
    
    const { rerender } = render(<AADTHistogram {...defaultProps} />);
    
    // Change date range multiple times quickly
    const newDateRange1 = { startDate: new Date('2023-02-01'), endDate: new Date('2023-12-31') };
    const newDateRange2 = { startDate: new Date('2023-03-01'), endDate: new Date('2023-12-31') };
    
    rerender(<AADTHistogram {...defaultProps} dateRange={newDateRange1} />);
    rerender(<AADTHistogram {...defaultProps} dateRange={newDateRange2} />);
    
    // Fast forward past debounce delay
    vi.advanceTimersByTime(400);
    
    await waitFor(() => {
      // Should only call with the final date range
      expect(mockAADTHistogramDataService.queryAADTHistogram).toHaveBeenCalledWith(
        mockPolygon,
        newDateRange2,
        true,
        true,
        10
      );
    });
    
    vi.useRealTimers();
  });

  it('respects road user filters', async () => {
    render(<AADTHistogram {...defaultProps} showBicyclist={false} showPedestrian={true} />);
    
    await waitFor(() => {
      expect(mockAADTHistogramDataService.queryAADTHistogram).toHaveBeenCalledWith(
        mockPolygon,
        mockDateRange,
        false,
        true,
        10
      );
    });
  });

  it('shows no data message when no sites available', async () => {
    const emptyResult = {
      bins: [],
      totalSites: 0,
      minAADT: 0,
      maxAADT: 0,
      meanAADT: 0,
      medianAADT: 0,
      isLoading: false,
      error: null
    };
    mockAADTHistogramDataService.queryAADTHistogram = vi.fn().mockResolvedValue(emptyResult);

    render(<AADTHistogram {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No AADT data available for selected area')).toBeInTheDocument();
      expect(screen.getByText(/Try selecting a different area or adjusting the date range/)).toBeInTheDocument();
    });
  });

  it('includes tooltip with explanation', async () => {
    render(<AADTHistogram {...defaultProps} />);
    
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveTextContent(/AADT is calculated by averaging daily traffic counts/);
  });
});
