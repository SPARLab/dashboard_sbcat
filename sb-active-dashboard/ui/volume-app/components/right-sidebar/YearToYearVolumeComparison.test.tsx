import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Polygon from "@arcgis/core/geometry/Polygon";
import YearToYearVolumeComparison from './YearToYearVolumeComparison';
import { YearToYearComparisonDataService } from '../../../../lib/data-services/YearToYearComparisonDataService';
import { SiteYear, computeSharedSiteYoY } from '../../../../src/lib/year-over-year';

// Mock the data service
vi.mock('../../../../lib/data-services/YearToYearComparisonDataService', () => ({
  YearToYearComparisonDataService: {
    getSiteYearData: vi.fn(),
    getSiteNamesInGeometry: vi.fn(),
    getSiteNames: vi.fn()
  }
}));

// Mock the panel functions
vi.mock('../../../../src/lib/year-over-year', async () => {
  const actual = await vi.importActual('../../../../src/lib/year-over-year');
  return {
    ...actual,
    computeSharedSiteYoY: vi.fn()
  };
});

// Mock the volume app store
const mockSetHighlightedBinSites = vi.fn();
vi.mock('../../../../lib/stores/volume-app-state', () => ({
  useVolumeAppStore: () => ({
    setHighlightedBinSites: mockSetHighlightedBinSites
  })
}));

describe('YearToYearVolumeComparison', () => {
  const mockGeometry = new Polygon({
    rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
  });

  const mockDateRange = {
    startDate: new Date('2022-01-01'),
    endDate: new Date('2024-12-31')
  };

  const mockDateRangeFilters = {
    startDate: new Date('2021-01-01'),
    endDate: new Date('2024-12-31')
  };

  const mockSiteYearData: SiteYear[] = [
    { siteId: 'site1', year: 2022, aadv: 100 },
    { siteId: 'site2', year: 2022, aadv: 150 },
    { siteId: 'site1', year: 2023, aadv: 120 },
    { siteId: 'site2', year: 2023, aadv: 180 },
    { siteId: 'site1', year: 2024, aadv: 140 }
  ];

  const mockComparisonResult = {
    ok: true,
    yoy: 0.2, // 20% increase
    mean0: 125, // (100 + 150) / 2
    mean1: 150, // (120 + 180) / 2
    sharedCount: 2,
    sharedSites: ['site1', 'site2'],
    onlyInY0: [],
    onlyInY1: [],
    totalY0: 2,
    totalY1: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(YearToYearComparisonDataService.getSiteYearData).mockResolvedValue(mockSiteYearData);
    vi.mocked(YearToYearComparisonDataService.getSiteNamesInGeometry).mockResolvedValue(
      new Map([
        [1, 'Downtown Site 1'],
        [2, 'Campus Site 2']
      ])
    );
    vi.mocked(computeSharedSiteYoY).mockReturnValue(mockComparisonResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component with correct title', () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      expect(screen.getByText('Year to Year Volume Comparison')).toBeInTheDocument();
    });

    it('should show placeholder when no geometry is selected', () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={null}
          dateRange={mockDateRange}
        />
      );

      expect(screen.getByText(/Use the polygon tool or click on a boundary/)).toBeInTheDocument();
    });

    it('should show data normalization info when geometry is selected', () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      expect(screen.getByText(/Data Normalization:/)).toBeInTheDocument();
      expect(screen.getByText(/Santa Cruz expansion factors/)).toBeInTheDocument();
    });

    it('should be collapsible', async () => {
      const user = userEvent.setup();
      
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      const collapseButton = screen.getByRole('button');
      await user.click(collapseButton);

      // Content should be collapsed (max-height: 0)
      const collapsibleContent = screen.getByTestId('year-to-year-volume-comparison-collapsible-content') ||
        document.querySelector('[id="year-to-year-volume-comparison-collapsible-content"]');
      expect(collapsibleContent).toHaveClass('max-h-0');
    });
  });

  describe('Data Loading and Year Selection', () => {
    it('should load site year data when geometry changes', async () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(YearToYearComparisonDataService.getSiteYearData).toHaveBeenCalledWith(
          mockGeometry,
          [2022, 2023, 2024], // years from date range
          true, // showBicyclist
          true, // showPedestrian
          'SantaCruz_citywide_v1' // nbpdProfileKey
        );
      });
    });

    it('should auto-select years when exactly 2 years are available', async () => {
      const twoYearData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 100 },
        { siteId: 'site1', year: 2023, aadv: 120 }
      ];
      
      vi.mocked(YearToYearComparisonDataService.getSiteYearData).mockResolvedValue(twoYearData);

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        const yearASelect = screen.getByLabelText('A:') as HTMLSelectElement;
        const yearBSelect = screen.getByLabelText('B:') as HTMLSelectElement;
        
        expect(yearASelect.value).toBe('2022');
        expect(yearBSelect.value).toBe('2023');
      });
    });

    it('should auto-select two most recent years when more than 2 years available', async () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        const yearASelect = screen.getByLabelText('A:') as HTMLSelectElement;
        const yearBSelect = screen.getByLabelText('B:') as HTMLSelectElement;
        
        expect(yearASelect.value).toBe('2023'); // second most recent
        expect(yearBSelect.value).toBe('2024'); // most recent
      });
    });

    it('should handle manual year selection', async () => {
      const user = userEvent.setup();
      
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('A:')).toBeInTheDocument();
      });

      const yearASelect = screen.getByLabelText('A:');
      await user.selectOptions(yearASelect, '2022');

      expect(yearASelect).toHaveValue('2022');
    });
  });

  describe('AADV Calculations and Display', () => {
    it('should display year-over-year comparison results correctly', async () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Year-over-Year Change: +20.0%')).toBeInTheDocument();
      });

      // Check shared sites count
      expect(screen.getByText('2 sites')).toBeInTheDocument();
      expect(screen.getByText('● Highlighted on map')).toBeInTheDocument();

      // Check AADV values in bars
      expect(screen.getByText('125.0')).toBeInTheDocument(); // mean0
      expect(screen.getByText('150.0')).toBeInTheDocument(); // mean1

      // Check change indicator
      expect(screen.getByText('↗ Increase of 20.0%')).toBeInTheDocument();
    });

    it('should handle negative year-over-year change', async () => {
      const negativeChangeResult = {
        ...mockComparisonResult,
        yoy: -0.15, // 15% decrease
        mean0: 200,
        mean1: 170
      };
      
      vi.mocked(computeSharedSiteYoY).mockReturnValue(negativeChangeResult);

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Year-over-Year Change: -15.0%')).toBeInTheDocument();
        expect(screen.getByText('↘ Decrease of 15.0%')).toBeInTheDocument();
      });
    });

    it('should handle zero change', async () => {
      const noChangeResult = {
        ...mockComparisonResult,
        yoy: 0,
        mean0: 150,
        mean1: 150
      };
      
      vi.mocked(computeSharedSiteYoY).mockReturnValue(noChangeResult);

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Year-over-Year Change: +0.0%')).toBeInTheDocument();
        expect(screen.getByText('→ No Change of 0.0%')).toBeInTheDocument();
      });
    });

    it('should show warning when no shared sites exist', async () => {
      const noSharedSitesResult = {
        ...mockComparisonResult,
        ok: false,
        sharedCount: 0,
        yoy: null
      };
      
      vi.mocked(computeSharedSiteYoY).mockReturnValue(noSharedSitesResult);

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('⚠️ No Shared Sites')).toBeInTheDocument();
        expect(screen.getByText(/No count sites exist in both/)).toBeInTheDocument();
      });
    });

    it('should show warning when calculation is invalid', async () => {
      const invalidResult = {
        ...mockComparisonResult,
        ok: false,
        sharedCount: 2,
        yoy: null
      };
      
      vi.mocked(computeSharedSiteYoY).mockReturnValue(invalidResult);

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('⚠️ Cannot Calculate Comparison')).toBeInTheDocument();
        expect(screen.getByText(/Unable to compute valid averages/)).toBeInTheDocument();
      });
    });
  });

  describe('Map Highlighting Integration', () => {
    it('should highlight shared sites on the map', async () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      // Wait for component to load and process data
      await waitFor(() => {
        expect(YearToYearComparisonDataService.getSiteYearData).toHaveBeenCalled();
      });

      // Check that highlighting was called (may be called with empty array initially)
      await waitFor(() => {
        expect(mockSetHighlightedBinSites).toHaveBeenCalled();
      });
    });

    it('should re-highlight sites when Compare button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      // Clear the mock to count only button click calls
      mockSetHighlightedBinSites.mockClear();

      const compareButton = screen.getByText('Compare');
      await user.click(compareButton);

      // Should call highlighting once for the button click
      await waitFor(() => {
        expect(mockSetHighlightedBinSites).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear highlights when no geometry is selected', async () => {
      const { rerender } = render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      // Wait for initial highlighting
      await waitFor(() => {
        expect(mockSetHighlightedBinSites).toHaveBeenCalled();
      });

      // Clear geometry
      rerender(
        <YearToYearVolumeComparison
          selectedGeometry={null}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(mockSetHighlightedBinSites).toHaveBeenCalledWith([]);
      });
    });

    it('should handle highlighting errors gracefully', async () => {
      vi.mocked(YearToYearComparisonDataService.getSiteNamesInGeometry)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Map([[1, 'Fallback Site 1']]));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error getting site names for highlighting:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching data', async () => {
      // Mock a delayed response
      vi.mocked(YearToYearComparisonDataService.getSiteYearData)
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSiteYearData), 100)));

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      expect(screen.getByText('Loading site data...')).toBeInTheDocument();
      // Check for the spinner div instead of role
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show error state when data loading fails', async () => {
      vi.mocked(YearToYearComparisonDataService.getSiteYearData)
        .mockRejectedValue(new Error('Failed to fetch data'));

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
      });
    });

    it('should disable controls while loading', async () => {
      vi.mocked(YearToYearComparisonDataService.getSiteYearData)
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSiteYearData), 100)));

      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      const yearASelect = screen.getByLabelText('A:');
      const yearBSelect = screen.getByLabelText('B:');
      
      expect(yearASelect).toBeDisabled();
      expect(yearBSelect).toBeDisabled();
    });
  });

  describe('Filter Integration', () => {
    it('should respect bicyclist and pedestrian filters', async () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          showBicyclist={false}
          showPedestrian={true}
          dateRange={mockDateRangeFilters}
        />
      );

      await waitFor(() => {
        expect(YearToYearComparisonDataService.getSiteYearData).toHaveBeenCalledWith(
          mockGeometry,
          [2021, 2022, 2023, 2024], // Updated to include 2021
          false, // showBicyclist
          true,  // showPedestrian
          'SantaCruz_citywide_v1'
        );
      });
    });

    it('should update when filters change', async () => {
      const { rerender } = render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          showBicyclist={true}
          showPedestrian={true}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(YearToYearComparisonDataService.getSiteYearData).toHaveBeenCalledTimes(1);
      });

      // Clear the mock to reset call count
      vi.mocked(YearToYearComparisonDataService.getSiteYearData).mockClear();

      rerender(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          showBicyclist={false}
          showPedestrian={true}
          dateRange={mockDateRange}
        />
      );

      await waitFor(() => {
        expect(YearToYearComparisonDataService.getSiteYearData).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form controls', () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      expect(screen.getByLabelText('A:')).toBeInTheDocument();
      expect(screen.getByLabelText('B:')).toBeInTheDocument();
    });

    it('should have descriptive IDs for all major elements', () => {
      render(
        <YearToYearVolumeComparison
          selectedGeometry={mockGeometry}
          dateRange={mockDateRange}
        />
      );

      expect(document.getElementById('year-to-year-volume-comparison-container')).toBeInTheDocument();
      expect(document.getElementById('year-to-year-volume-comparison-header')).toBeInTheDocument();
      expect(document.getElementById('year-to-year-volume-comparison-title')).toBeInTheDocument();
      expect(document.getElementById('yoy-year-select-a')).toBeInTheDocument();
      expect(document.getElementById('yoy-year-select-b')).toBeInTheDocument();
      expect(document.getElementById('yoy-compare-button')).toBeInTheDocument();
    });
  });
});
