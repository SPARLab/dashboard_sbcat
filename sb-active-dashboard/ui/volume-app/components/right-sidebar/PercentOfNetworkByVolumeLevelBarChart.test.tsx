import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import PercentOfNetworkByVolumeLevelBarChart from './PercentOfNetworkByVolumeLevelBarChart';
import Polygon from '@arcgis/core/geometry/Polygon';

// Mock the chart data service
const mockGetTrafficLevelBreakdownData = vi.fn();
vi.mock('../../../../lib/data-services/ModeledVolumeChartDataService', () => ({
  ModeledVolumeChartDataService: vi.fn().mockImplementation(() => ({
    getTrafficLevelBreakdownData: mockGetTrafficLevelBreakdownData
  }))
}));

// Mock ReactECharts
vi.mock('echarts-for-react', () => ({
  default: vi.fn(({ option, onEvents }) => (
    <div data-testid="echarts-mock">
      <div data-testid="chart-data">{JSON.stringify(option.series[0].data)}</div>
      <div data-testid="chart-categories">{JSON.stringify(option.xAxis.data)}</div>
    </div>
  ))
}));

describe('PercentOfNetworkByVolumeLevelBarChart', () => {
  const mockMapView = {} as __esri.MapView;
  const mockGeometry = new Polygon({
    rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
  });

  const defaultProps = {
    dataType: 'modeled-data',
    horizontalMargins: 'mx-4',
    mapView: mockMapView,
    showBicyclist: true,
    showPedestrian: true,
    modelCountsBy: 'cost-benefit',
    year: 2023,
    selectedGeometry: mockGeometry
  };

  beforeEach(() => {
    mockGetTrafficLevelBreakdownData.mockResolvedValue({
      categories: ['Low', 'Medium', 'High'],
      totalMiles: [10, 20, 30],
      percentages: [16.7, 33.3, 50.0],
      details: {
        low: { miles: 10, percentage: 16.7, segments: 5 },
        medium: { miles: 20, percentage: 33.3, segments: 10 },
        high: { miles: 30, percentage: 50.0, segments: 15 }
      },
      totalNetworkMiles: 60
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<PercentOfNetworkByVolumeLevelBarChart {...defaultProps} />);
    expect(screen.getByText('Percent of Network by Volume Level')).toBeInTheDocument();
  });

  it('should use dynamic year in data service call', async () => {
    render(<PercentOfNetworkByVolumeLevelBarChart {...defaultProps} year={2020} />);

    await waitFor(() => {
      expect(mockGetTrafficLevelBreakdownData).toHaveBeenCalledWith(
        mockMapView,
        expect.objectContaining({
          year: 2020,
          dataSource: 'dillon'
        }),
        mockGeometry
      );
    });
  });

  it('should pass correct count types when both bike and ped selected', async () => {
    render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      showBicyclist={true} 
      showPedestrian={true}
    />);

    await waitFor(() => {
      expect(mockGetTrafficLevelBreakdownData).toHaveBeenCalledWith(
        mockMapView,
        expect.objectContaining({
          countTypes: ['bike', 'ped']
        }),
        mockGeometry
      );
    });
  });

  it('should pass only bike when pedestrian disabled', async () => {
    render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      showBicyclist={true} 
      showPedestrian={false}
    />);

    await waitFor(() => {
      expect(mockGetTrafficLevelBreakdownData).toHaveBeenCalledWith(
        mockMapView,
        expect.objectContaining({
          countTypes: ['bike']
        }),
        mockGeometry
      );
    });
  });

  it('should display chart data when loaded successfully', async () => {
    render(<PercentOfNetworkByVolumeLevelBarChart {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });

    // Verify chart displays correct percentages
    const chartData = screen.getByTestId('chart-data');
    expect(chartData).toHaveTextContent('16.7');
    expect(chartData).toHaveTextContent('33.3');
    expect(chartData).toHaveTextContent('50');
  });

  it('should show loading state during fetch', () => {
    // Make the promise not resolve immediately
    mockGetTrafficLevelBreakdownData.mockReturnValue(new Promise(() => {}));
    
    render(<PercentOfNetworkByVolumeLevelBarChart {...defaultProps} />);
    
    expect(screen.getByText('Loading network data...')).toBeInTheDocument();
    expect(screen.getByText('Querying selected area')).toBeInTheDocument();
  });

  it('should display error state on failure', async () => {
    mockGetTrafficLevelBreakdownData.mockRejectedValue(new Error('Network error'));
    
    render(<PercentOfNetworkByVolumeLevelBarChart {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Failed to load traffic data')).toBeInTheDocument();
    });
  });

  it('should only render for cost-benefit model', () => {
    const { rerender } = render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      modelCountsBy="strava-bias-corrected" 
    />);
    
    expect(screen.queryByTestId('echarts-mock')).not.toBeInTheDocument();
    
    rerender(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      modelCountsBy="cost-benefit" 
    />);
    
    // Should show loading at minimum since we have valid props
    expect(screen.getByText('Loading network data...')).toBeInTheDocument();
  });

  it('should require selected geometry', () => {
    render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      selectedGeometry={null} 
    />);
    
    expect(screen.queryByTestId('echarts-mock')).not.toBeInTheDocument();
    expect(mockGetTrafficLevelBreakdownData).not.toHaveBeenCalled();
  });

  it('should show placeholder when no region selected', () => {
    render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      selectedGeometry={null} 
    />);
    
    expect(screen.getByText('Please select an area on the map')).toBeInTheDocument();
    expect(screen.getByText('Click on a boundary to see results')).toBeInTheDocument();
  });

  it('should require modeled-data type', () => {
    render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      dataType="raw-data" 
    />);
    
    expect(screen.queryByTestId('echarts-mock')).not.toBeInTheDocument();
    expect(mockGetTrafficLevelBreakdownData).not.toHaveBeenCalled();
  });

  it('should require at least one count type enabled', () => {
    render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      showBicyclist={false}
      showPedestrian={false}
    />);
    
    expect(screen.queryByTestId('echarts-mock')).not.toBeInTheDocument();
    expect(mockGetTrafficLevelBreakdownData).not.toHaveBeenCalled();
  });

  it('should refetch data when year changes', async () => {
    const { rerender } = render(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      year={2020} 
    />);

    await waitFor(() => {
      expect(mockGetTrafficLevelBreakdownData).toHaveBeenCalledWith(
        mockMapView,
        expect.objectContaining({ year: 2020 }),
        mockGeometry
      );
    });

    mockGetTrafficLevelBreakdownData.mockClear();

    rerender(<PercentOfNetworkByVolumeLevelBarChart 
      {...defaultProps} 
      year={2021} 
    />);

    await waitFor(() => {
      expect(mockGetTrafficLevelBreakdownData).toHaveBeenCalledWith(
        mockMapView,
        expect.objectContaining({ year: 2021 }),
        mockGeometry
      );
    });
  });

  it('should show no data state when total is zero', async () => {
    mockGetTrafficLevelBreakdownData.mockResolvedValue({
      categories: ['Low', 'Medium', 'High'],
      totalMiles: [0, 0, 0],
      percentages: [0, 0, 0],
      details: {
        low: { miles: 0, percentage: 0, segments: 0 },
        medium: { miles: 0, percentage: 0, segments: 0 },
        high: { miles: 0, percentage: 0, segments: 0 }
      },
      totalNetworkMiles: 0
    });

    render(<PercentOfNetworkByVolumeLevelBarChart {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No data available for selected area')).toBeInTheDocument();
      expect(screen.getByText('Try selecting a different area')).toBeInTheDocument();
    });
  });
});