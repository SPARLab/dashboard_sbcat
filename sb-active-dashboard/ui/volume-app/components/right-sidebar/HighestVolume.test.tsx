import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import HighestVolume from './HighestVolume'
import { VolumeChartDataService } from '../../../../lib/data-services/VolumeChartDataService'
import { 
  createMockHighestVolumeData, 
  createMockPolygonGeometry,
  createMockFeatureLayer,
  createMockMapView,
  createFilteredVolumeData,
  createRealisticVolumeData 
} from '../../../../src/test-utils/factories'
import { testIds } from '../../../../src/test-utils/test-helpers'

// Mock the VolumeChartDataService
vi.mock('../../../../lib/data-services/VolumeChartDataService', () => ({
  VolumeChartDataService: vi.fn()
}))

describe('HighestVolume Component - Data Validation', () => {
  let mockVolumeService: any
  let mockMapView: any
  let mockSitesLayer: any
  let mockCountsLayer: any
  let mockAadtTable: any
  let mockGeometry: any
  let mockDateRange: any
  let user: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create user event instance
    user = userEvent.setup()
    
    // Create mock service instance
    mockVolumeService = {
      getHighestVolumeData: vi.fn()
    }
    
    // Mock the constructor to return our mock service
    ;(VolumeChartDataService as any).mockImplementation(() => mockVolumeService)
    
    // Create mock ArcGIS objects
    mockMapView = createMockMapView()
    mockSitesLayer = createMockFeatureLayer('sites')
    mockCountsLayer = createMockFeatureLayer('counts')
    mockAadtTable = createMockFeatureLayer('aadt')
    mockGeometry = createMockPolygonGeometry()
    mockDateRange = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31')
    }
  })

  describe('Filter Combination Data Validation', () => {
    it('should request bicycle-only data when pedestrian is disabled', async () => {
      const mockData = createFilteredVolumeData(true, false)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={false}  // Pedestrian disabled
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledWith(
          mockMapView,
          { showBicyclist: true, showPedestrian: false },
          mockDateRange,
          5,
          mockGeometry
        )
      })

      // Verify the component displays the filtered data
      expect(screen.getByText((content, element) => content.includes('Downtown Transit Hub'))).toBeInTheDocument()
      expect(screen.getByText('450')).toBeInTheDocument() // Only bike volume
    })

    it('should request pedestrian-only data when bicycle is disabled', async () => {
      const mockData = createFilteredVolumeData(false, true)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={false}   // Bicycle disabled
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledWith(
          mockMapView,
          { showBicyclist: false, showPedestrian: true },
          mockDateRange,
          5,
          mockGeometry
        )
      })

      // Should show Beach Boardwalk first (highest ped volume: 300)
      expect(screen.getByText((content, element) => content.includes('Beach Boardwalk'))).toBeInTheDocument()
      expect(screen.getByText('300')).toBeInTheDocument()
    })

    it('should request combined data when both modes are enabled', async () => {
      const mockData = createRealisticVolumeData()
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledWith(
          mockMapView,
          { showBicyclist: true, showPedestrian: true },
          mockDateRange,
          5,
          mockGeometry
        )
      })

      // Downtown Transit Hub should be first (450 + 200 = 650 total)
      expect(screen.getByText((content, element) => content.includes('Downtown Transit Hub'))).toBeInTheDocument()
      expect(screen.getByText('650')).toBeInTheDocument()
    })

    it('should validate data aggregation is mathematically correct', async () => {
      const testData = {
        sites: [
          { siteId: 1, siteName: 'Test Site A', bikeAADT: 100, pedAADT: 50, totalAADV: 150, locality: 'Test' },
          { siteId: 2, siteName: 'Test Site B', bikeAADT: 80, pedAADT: 30, totalAADV: 110, locality: 'Test' },
          { siteId: 3, siteName: 'Test Site C', bikeAADT: 200, pedAADT: 75, totalAADV: 275, locality: 'Test' },
        ]
      }
      
      mockVolumeService.getHighestVolumeData.mockResolvedValue(testData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        // Verify each site shows the correct total (bike + ped)
        expect(screen.getByText('275')).toBeInTheDocument() // 200 + 75
        expect(screen.getByText('150')).toBeInTheDocument() // 100 + 50  
        expect(screen.getByText('110')).toBeInTheDocument() // 80 + 30
      })
    })
  })

  describe('Geographic Region Data Validation', () => {
    it('should request new data when geometry changes', async () => {
      const initialData = createMockHighestVolumeData(3, {
        siteName: 'Downtown Site'
      })
      
      const newGeometryData = createMockHighestVolumeData(3, {
        siteName: 'Waterfront Site'
      })

      mockVolumeService.getHighestVolumeData
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(newGeometryData)

      const { rerender } = render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getAllByText((content, element) => content.includes('Downtown Site'))).toHaveLength(3)
      })

      // Change geometry to new region
      const newGeometry = createMockPolygonGeometry({
        extent: { xmin: -121, ymin: 35, xmax: -120, ymax: 36 }
      })

      rerender(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={newGeometry}
        />
      )

      // Verify new data is requested and displayed
      await waitFor(() => {
        expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledTimes(2)
        expect(mockVolumeService.getHighestVolumeData).toHaveBeenLastCalledWith(
          mockMapView,
          { showBicyclist: true, showPedestrian: true },
          mockDateRange,
          5,
          newGeometry
        )
      })

      await waitFor(() => {
        expect(screen.getAllByText((content, element) => content.includes('Waterfront Site'))).toHaveLength(3)
      })
    })

    it('should clear data and show placeholder when no geometry is selected', async () => {
      const { rerender } = render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      // Remove geometry selection
      rerender(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={null}
        />
      )

      // Should show placeholder message
      expect(screen.getByText(/Use the polygon tool/)).toBeInTheDocument()
      expect(screen.queryByTestId(testIds.highestVolume.list)).not.toBeInTheDocument()
    })

    it('should not make API calls when required props are missing', async () => {
      render(
        <HighestVolume
          mapView={null}  // Missing mapView
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      // Should not make any API calls
      expect(mockVolumeService.getHighestVolumeData).not.toHaveBeenCalled()
      
      // Should show placeholder - check for the actual message that appears
      expect(screen.getByText((content, element) => 
        content.includes('No volume data available') ||
        content.includes('Use the polygon tool') ||
        content.includes('Select a region')
      )).toBeInTheDocument()
    })
  })

  describe('Data Ranking Validation', () => {
    it('should display sites in correct descending order by total volume', async () => {
      const mockData = {
        sites: [
          { siteId: 1, siteName: 'Highest Volume', bikeAADT: 200, pedAADT: 100, totalAADV: 300, locality: 'Test' },
          { siteId: 2, siteName: 'Medium Volume', bikeAADT: 150, pedAADT: 50, totalAADV: 200, locality: 'Test' },
          { siteId: 3, siteName: 'Lower Volume', bikeAADT: 80, pedAADT: 20, totalAADV: 100, locality: 'Test' },
        ]
      }
      
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        const listItems = screen.getAllByText(/^\d+\./)
        expect(listItems[0]).toHaveTextContent('1. Highest Volume')
        expect(listItems[1]).toHaveTextContent('2. Medium Volume') 
        expect(listItems[2]).toHaveTextContent('3. Lower Volume')
      })

      // Verify corresponding volume values are displayed correctly
      expect(screen.getByText('300')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('should format volume numbers with commas for large values', async () => {
      const mockData = {
        sites: [
          { siteId: 1, siteName: 'High Traffic Site', bikeAADT: 5000, pedAADT: 3500, totalAADV: 8500, locality: 'Test' },
          { siteId: 2, siteName: 'Medium Traffic Site', bikeAADT: 2000, pedAADT: 1200, totalAADV: 3200, locality: 'Test' },
        ]
      }
      
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        // Numbers should be formatted with commas
        expect(screen.getByText('8,500')).toBeInTheDocument()
        expect(screen.getByText('3,200')).toBeInTheDocument()
      })
    })

    it('should handle sites with zero volumes correctly', async () => {
      const mockData = {
        sites: [
          { siteId: 1, siteName: 'Active Site', bikeAADT: 100, pedAADT: 50, totalAADV: 150, locality: 'Test' },
          { siteId: 2, siteName: 'Inactive Site', bikeAADT: 0, pedAADT: 0, totalAADV: 0, locality: 'Test' },
        ]
      }
      
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(screen.getByText((content, element) => content.includes('Active Site'))).toBeInTheDocument()
        expect(screen.getByText((content, element) => content.includes('Inactive Site'))).toBeInTheDocument()
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle service errors gracefully', async () => {
      mockVolumeService.getHighestVolumeData.mockRejectedValue(
        new Error('Network error')
      )

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load highest volume data')).toBeInTheDocument()
      })

      // Should not display any site data
      expect(screen.queryByTestId(testIds.highestVolume.list)).not.toBeInTheDocument()
    })

    it('should handle empty results appropriately', async () => {
      mockVolumeService.getHighestVolumeData.mockResolvedValue({ sites: [] })

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No volume data available for current view')).toBeInTheDocument()
      })
    })

    it('should show loading state during data fetch', async () => {
      // Create a controlled promise to test loading state
      let resolvePromise: (value: any) => void
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      mockVolumeService.getHighestVolumeData.mockReturnValue(controlledPromise)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      // Should show loading state
      expect(screen.getByText('Loading highest volume data...')).toBeInTheDocument()

      // Resolve the promise
      resolvePromise!({ sites: [] })

      await waitFor(() => {
        expect(screen.queryByText('Loading highest volume data...')).not.toBeInTheDocument()
      })
    })

    it('should handle malformed service responses', async () => {
      // Test with undefined response
      mockVolumeService.getHighestVolumeData.mockResolvedValue(undefined)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        // Should show appropriate message for malformed data 
        expect(screen.getByText((content, element) => 
          content.includes('No volume data available') ||
          content.includes('Failed to load')
        )).toBeInTheDocument()
      })
    })
  })

  describe('Component Interaction', () => {
    it('should toggle collapse/expand functionality', async () => {
      const mockData = createMockHighestVolumeData(2)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId(testIds.highestVolume.list)).toBeInTheDocument()
      })

              // Find and click the collapse button
        const collapseButton = screen.getByRole('button')
        await user.click(collapseButton)

        // Content should be collapsed (check for CSS class or visibility)
        const collapsibleContent = screen.getByTestId('highest-volume-collapsible-content')
        expect(collapsibleContent).toHaveClass('max-h-0')
    })

    it('should maintain data when toggling collapse state', async () => {
      const mockData = createMockHighestVolumeData(3)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId(testIds.highestVolume.list)).toBeInTheDocument()
      })

      const collapseButton = screen.getByRole('button')
      
      // Collapse
      await user.click(collapseButton)
      
      // Expand again
      await user.click(collapseButton)

      // Data should still be there
      await waitFor(() => {
        expect(screen.getByTestId(testIds.highestVolume.list)).toBeInTheDocument()
      })

      // Should not have made additional API calls
      expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance and Optimization', () => {
    it('should not make redundant API calls for identical props', async () => {
      const mockData = createMockHighestVolumeData(3)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      const { rerender } = render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledTimes(1)
      })

      // Re-render with identical props
      rerender(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      // Should not make additional API calls
      expect(mockVolumeService.getHighestVolumeData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Selection and Rendering', () => {
    it('highlights the selected site when selectedSiteId matches', async () => {
      const mockData = createMockHighestVolumeData(3)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
          selectedSiteId={mockData.sites[1].siteId.toString()}
        />
      )

      // Wait for list to render
      await waitFor(() => {
        expect(screen.getByTestId(testIds.highestVolume.list)).toBeInTheDocument()
      })

      // Find the LI for the selected site and assert highlight classes + aria-selected
      const selectedItemName = mockData.sites[1].siteName
      const nameElement = screen.getByText((content) => content.includes(selectedItemName))
      const listItem = nameElement.closest('li') as HTMLElement
      expect(listItem).toBeTruthy()
      expect(listItem).toHaveAttribute('aria-selected', 'true')
      expect(listItem.className).toMatch(/bg-blue-100/)
      expect(listItem.className).toMatch(/border-blue-300/)
    })

    it('toggles selection on click (selects then deselects the same site)', async () => {
      const mockData = createMockHighestVolumeData(3)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      const onSiteSelect = vi.fn()

      const { rerender } = render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
          onSiteSelect={onSiteSelect}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId(testIds.highestVolume.list)).toBeInTheDocument()
      })

      // Click first item to select
      const firstItem = document.getElementById(testIds.highestVolume.item(1)) as HTMLElement
      await user.click(firstItem)
      expect(onSiteSelect).toHaveBeenCalledWith(mockData.sites[0].siteId.toString())

      // Simulate parent reflecting selection, then click again to deselect
      rerender(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
          selectedSiteId={mockData.sites[0].siteId.toString()}
          onSiteSelect={onSiteSelect}
        />
      )

      await user.click(firstItem)
      expect(onSiteSelect).toHaveBeenCalledWith(null)
    })

    it('does not render duplicate site entries', async () => {
      const mockData = createMockHighestVolumeData(5)
      mockVolumeService.getHighestVolumeData.mockResolvedValue(mockData)

      render(
        <HighestVolume
          mapView={mockMapView}
          sitesLayer={mockSitesLayer}
          countsLayer={mockCountsLayer}
          aadtTable={mockAadtTable}
          dateRange={mockDateRange}
          showBicyclist={true}
          showPedestrian={true}
          selectedGeometry={mockGeometry}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId(testIds.highestVolume.list)).toBeInTheDocument()
      })

      const list = screen.getByTestId(testIds.highestVolume.list)
      const items = Array.from(list.querySelectorAll('li'))
      expect(items.length).toBe(mockData.sites.length)

      const names = items.map((li) => {
        const nameEl = li.querySelector('p[id$="-name"]') as HTMLElement
        // Remove the leading numbering (e.g., "1. ")
        const text = nameEl?.textContent || ''
        const parts = text.split('. ')
        return parts.length > 1 ? parts.slice(1).join('. ') : text
      })
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })
  })
})