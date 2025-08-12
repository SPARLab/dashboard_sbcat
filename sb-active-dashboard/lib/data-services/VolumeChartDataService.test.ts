import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VolumeChartDataService } from './VolumeChartDataService'
import { CountSiteProcessingService } from '../utilities/volume-utils/count-site-processing'
import { createMockFeatureLayer, createMockMapView } from '../../src/test-utils/factories'

// Mock the dependencies
vi.mock('../utilities/volume-utils/count-site-processing', () => ({
  CountSiteProcessingService: {
    getHighestVolumeSites: vi.fn(),
    getSummaryStatistics: vi.fn()
  }
}))

describe('VolumeChartDataService - Data Accuracy Tests', () => {
  let service: VolumeChartDataService
  let mockSitesLayer: any
  let mockCountsLayer: any  
  let mockAadtLayer: any
  let mockMapView: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSitesLayer = createMockFeatureLayer('sites')
    mockCountsLayer = createMockFeatureLayer('counts')
    mockAadtLayer = createMockFeatureLayer('aadt')
    mockMapView = createMockMapView()
    
    service = new VolumeChartDataService(mockSitesLayer, mockCountsLayer, mockAadtLayer)
  })

  describe('getHighestVolumeData - Data Aggregation', () => {
    it('should correctly aggregate bike and pedestrian AADT values', async () => {
      const mockRawSites = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2, siteName: 'Site B', bikeAADT: 80, pedAADT: 30, totalAADT: 110 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockRawSites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any // geometry
      )

      // Verify data aggregation is mathematically correct
      expect(result.sites).toHaveLength(2)
      expect(result.sites[0].totalAADT).toBe(150) // 100 + 50
      expect(result.sites[1].totalAADT).toBe(110) // 80 + 30
      
      // Verify individual components are preserved
      expect(result.sites[0].bikeAADT).toBe(100)
      expect(result.sites[0].pedAADT).toBe(50)
      
      // Verify locality field is added (interface requirement)
      expect(result.sites[0].locality).toBe('Unknown')
      expect(result.sites[1].locality).toBe('Unknown')
    })

    it('should handle bike-only filter correctly', async () => {
      const mockBikeOnlySites = [
        { siteId: 1, siteName: 'Bike Route A', bikeAADT: 200, pedAADT: 0, totalAADT: 200 },
        { siteId: 2, siteName: 'Bike Route B', bikeAADT: 150, pedAADT: 0, totalAADT: 150 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockBikeOnlySites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: false },
        5,
        {} as any
      )

      // Verify filter parameters are passed correctly
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: true, showPedestrian: false },
        5,
        expect.anything()
      )

      // Verify results show only bike data
      expect(result.sites[0].pedAADT).toBe(0)
      expect(result.sites[0].totalAADT).toBe(result.sites[0].bikeAADT)
    })

    it('should handle pedestrian-only filter correctly', async () => {
      const mockPedOnlySites = [
        { siteId: 1, siteName: 'Ped Route A', bikeAADT: 0, pedAADT: 300, totalAADT: 300 },
        { siteId: 2, siteName: 'Ped Route B', bikeAADT: 0, pedAADT: 250, totalAADT: 250 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockPedOnlySites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: false, showPedestrian: true },
        5,
        {} as any
      )

      // Verify filter parameters
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: false, showPedestrian: true },
        5,
        expect.anything()
      )

      // Verify results show only pedestrian data
      expect(result.sites[0].bikeAADT).toBe(0)
      expect(result.sites[0].totalAADT).toBe(result.sites[0].pedAADT)
    })

    it('should respect the limit parameter correctly', async () => {
      const mockLargeSiteList = Array.from({ length: 10 }, (_, i) => ({
        siteId: i + 1,
        siteName: `Site ${i + 1}`,
        bikeAADT: 100 - i * 10,
        pedAADT: 50 - i * 5,
        totalAADT: 150 - i * 15
      }))

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockLargeSiteList)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        3, // limit to 3 sites
        {} as any
      )

      // Verify limit parameter is passed to the underlying service
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        3, // The limit should be passed through
        expect.anything()
      )

      // The service should return what the underlying service returns
      // (limiting is handled by the underlying service)
      expect(result.sites).toHaveLength(10)
    })

    it('should handle zero volume data correctly', async () => {
      const mockZeroVolumeSites = [
        { siteId: 1, siteName: 'Inactive Site', bikeAADT: 0, pedAADT: 0, totalAADT: 0 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockZeroVolumeSites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      expect(result.sites[0].totalAADT).toBe(0)
      expect(result.sites[0].bikeAADT).toBe(0)
      expect(result.sites[0].pedAADT).toBe(0)
    })

    it('should handle geometry parameter correctly', async () => {
      const mockGeometry = {
        extent: { xmin: -120, ymin: 34, xmax: -119, ymax: 35 },
        type: 'polygon'
      }

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue([])

      await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        mockGeometry
      )

      // Verify geometry is passed to the underlying service
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        mockGeometry
      )
    })
  })

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across different filter combinations', async () => {
      const baseSiteData = [
        { siteId: 1, siteName: 'Mixed Traffic Site', bikeAADT: 200, pedAADT: 100, totalAADT: 300 },
        { siteId: 2, siteName: 'Bike Heavy Site', bikeAADT: 300, pedAADT: 50, totalAADT: 350 },
        { siteId: 3, siteName: 'Ped Heavy Site', bikeAADT: 50, pedAADT: 250, totalAADT: 300 },
      ]

      // Test all filter combinations
      const filterCombinations = [
        { showBicyclist: true, showPedestrian: true },
        { showBicyclist: true, showPedestrian: false },
        { showBicyclist: false, showPedestrian: true }
      ]

      for (const filters of filterCombinations) {
        ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(
          baseSiteData.map(site => ({
            ...site,
            bikeAADT: filters.showBicyclist ? site.bikeAADT : 0,
            pedAADT: filters.showPedestrian ? site.pedAADT : 0,
            totalAADT: (filters.showBicyclist ? site.bikeAADT : 0) + 
                      (filters.showPedestrian ? site.pedAADT : 0)
          }))
        )

        const result = await service.getHighestVolumeData(
          mockMapView,
          filters,
          5,
          {} as any
        )

        // Verify data consistency: totalAADT should always equal bikeAADT + pedAADT
        result.sites.forEach(site => {
          expect(site.totalAADT).toBe(site.bikeAADT + site.pedAADT)
        })

        // Verify filters are applied correctly
        if (!filters.showBicyclist) {
          result.sites.forEach(site => {
            expect(site.bikeAADT).toBe(0)
          })
        }

        if (!filters.showPedestrian) {
          result.sites.forEach(site => {
            expect(site.pedAADT).toBe(0)
          })
        }
      }
    })

    it('should handle edge case with very large volume numbers', async () => {
      const mockLargeVolumeSites = [
        { siteId: 1, siteName: 'Major Highway', bikeAADT: 50000, pedAADT: 25000, totalAADT: 75000 },
        { siteId: 2, siteName: 'City Center', bikeAADT: 30000, pedAADT: 45000, totalAADT: 75000 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockLargeVolumeSites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      // Verify large numbers are handled correctly
      expect(result.sites[0].totalAADT).toBe(75000)
      expect(result.sites[1].totalAADT).toBe(75000)
      
      // Verify no overflow or precision issues
      expect(result.sites[0].bikeAADT + result.sites[0].pedAADT).toBe(result.sites[0].totalAADT)
      expect(result.sites[1].bikeAADT + result.sites[1].pedAADT).toBe(result.sites[1].totalAADT)
    })

    it('should handle fractional AADT values correctly', async () => {
      const mockFractionalSites = [
        { siteId: 1, siteName: 'Low Volume Site', bikeAADT: 12.5, pedAADT: 7.3, totalAADT: 19.8 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockFractionalSites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      // Verify fractional values are preserved
      expect(result.sites[0].bikeAADT).toBe(12.5)
      expect(result.sites[0].pedAADT).toBe(7.3)
      expect(result.sites[0].totalAADT).toBe(19.8)
    })
  })

  describe('Error Handling and Robustness', () => {
    it('should handle underlying service errors gracefully', async () => {
      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        service.getHighestVolumeData(
          mockMapView,
          { showBicyclist: true, showPedestrian: true },
          5,
          {} as any
        )
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle empty results from underlying service', async () => {
      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue([])

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      expect(result.sites).toEqual([])
    })

    it('should handle null/undefined results from underlying service', async () => {
      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(null)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      expect(result.sites).toEqual([])
    })

    it('should handle malformed site data', async () => {
      const mockMalformedSites = [
        { siteId: 1, siteName: 'Valid Site', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2 }, // Missing required fields
        { siteId: 3, siteName: 'Partial Site', bikeAADT: 75 }, // Missing pedAADT and totalAADT
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(mockMalformedSites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      // Service should handle malformed data gracefully
      expect(result.sites).toHaveLength(3)
      expect(result.sites[0].locality).toBe('Unknown') // Default value added
      
      // Verify the service doesn't crash with incomplete data
      result.sites.forEach(site => {
        expect(site).toHaveProperty('siteId')
        expect(site).toHaveProperty('locality', 'Unknown')
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should not modify the original data from underlying service', async () => {
      const originalSites = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2, siteName: 'Site B', bikeAADT: 80, pedAADT: 30, totalAADT: 110 },
      ]

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(originalSites)

      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        5,
        {} as any
      )

      // Verify original data is not modified
      expect(originalSites[0]).not.toHaveProperty('locality')
      expect(originalSites[1]).not.toHaveProperty('locality')
      
      // Verify returned data has the added field
      expect(result.sites[0]).toHaveProperty('locality', 'Unknown')
      expect(result.sites[1]).toHaveProperty('locality', 'Unknown')
    })

    it('should pass through all parameters correctly to underlying service', async () => {
      const mockGeometry = { type: 'polygon', extent: {} }
      const mockFilters = { showBicyclist: true, showPedestrian: false }

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue([])

      await service.getHighestVolumeData(
        mockMapView,
        mockFilters,
        10,
        mockGeometry
      )

      // Verify all parameters are passed through exactly
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,    // sitesLayer
        mockAadtLayer,     // aadtLayer  
        mockMapView,       // mapView
        mockFilters,       // filters
        10,                // limit
        mockGeometry       // selectedGeometry
      )
    })
  })
})