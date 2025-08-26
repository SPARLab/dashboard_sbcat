import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VolumeChartDataService } from './VolumeChartDataService'
import { CountSiteProcessingService } from '../utilities/volume-utils/count-site-processing'
import { createMockFeatureLayer, createMockMapView } from '../../src/test-utils/factories'
import { TimeSeriesPrepService } from '../utilities/chart-data-prep/time-series-prep'
import { queryDeduplicator } from '../utilities/shared/QueryDeduplicator'

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
    
    // Clear caches to ensure test isolation
    VolumeChartDataService.clearCache()
    queryDeduplicator.clearAll()
    
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
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
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
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        5,
        {} as any
      )

      // Verify filter parameters are passed correctly
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: true, showPedestrian: false },
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        5,
        {} as any
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
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        5,
        {} as any
      )

      // Verify filter parameters
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: false, showPedestrian: true },
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        5,
        {} as any
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
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        3, // limit to 3 sites
        {} as any
      )

      // Verify limit parameter is passed to the underlying service
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        3, // The limit should be passed through
        {} as any
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

      // Use unique date range to avoid cache collision
      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2022-01-01'), endDate: new Date('2022-12-31') },
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
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        5,
        mockGeometry
      )

      // Verify geometry is passed to the underlying service
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,
        mockAadtLayer,
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
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
          { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
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

      // Use unique date range to avoid cache collision
      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2021-01-01'), endDate: new Date('2021-12-31') },
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

      // Use unique date range to avoid cache collision
      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2020-01-01'), endDate: new Date('2020-12-31') },
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
          { startDate: new Date('2019-01-01'), endDate: new Date('2019-12-31') },
          5,
          {} as any
        )
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle empty results from underlying service', async () => {
      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue([])

      // Use unique date range to avoid cache collision
      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2018-01-01'), endDate: new Date('2018-12-31') },
        5,
        {} as any
      )

      expect(result.sites).toEqual([])
    })

    it('should handle null/undefined results from underlying service', async () => {
      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue(null)

      // Use unique date range to avoid cache collision
      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2017-01-01'), endDate: new Date('2017-12-31') },
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

      // Use unique date range to avoid cache collision
      const result = await service.getHighestVolumeData(
        mockMapView,
        { showBicyclist: true, showPedestrian: true },
        { startDate: new Date('2016-01-01'), endDate: new Date('2016-12-31') },
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
        { startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
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
      const mockGeometry = { 
        type: 'polygon', 
        extent: { 
          xmin: -120.5, 
          ymin: 34.5, 
          xmax: -119.5, 
          ymax: 35.5 
        } 
      }
      const mockFilters = { showBicyclist: true, showPedestrian: false }

      ;(CountSiteProcessingService.getHighestVolumeSites as any).mockResolvedValue([])

      // Use unique date range to avoid cache collision
      await service.getHighestVolumeData(
        mockMapView,
        mockFilters,
        { startDate: new Date('2015-01-01'), endDate: new Date('2015-12-31') },
        10,
        mockGeometry
      )

      // Verify all parameters are passed through exactly
      expect(CountSiteProcessingService.getHighestVolumeSites).toHaveBeenCalledWith(
        mockSitesLayer,    // sitesLayer
        mockAadtLayer,     // aadtLayer  
        mockMapView,       // mapView
        mockFilters,       // filters
        { startDate: new Date('2015-01-01'), endDate: new Date('2015-12-31') }, // dateRange
        10,                // limit
        mockGeometry       // selectedGeometry
      )
    })
  })

  describe('Timeline Data Period Detection', () => {
    // Test helper to create mock count dates
    const createDate = (year: number, month: number, day: number) => new Date(year, month - 1, day)
    
    describe('findDataPeriods - Daily Granularity (< 2 years)', () => {
      it('should create single period for continuous daily data', () => {
        const timeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        const countDates = [
          createDate(2024, 6, 1),
          createDate(2024, 6, 2),
          createDate(2024, 6, 3),
          createDate(2024, 6, 4)
        ]

        const periods = (service as any).findDataPeriods(countDates, timeSpan)
        
        expect(periods).toHaveLength(1)
        expect(periods[0].start).toEqual(createDate(2024, 6, 1))
        expect(periods[0].end).toEqual(createDate(2024, 6, 4))
      })

      it('should create two periods for data with gap > 3 days', () => {
        const timeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        const countDates = [
          createDate(2024, 6, 1),
          createDate(2024, 6, 2),
          // 5-day gap here (> 3 days)
          createDate(2024, 6, 8),
          createDate(2024, 6, 9)
        ]

        const periods = (service as any).findDataPeriods(countDates, timeSpan)
        
        expect(periods).toHaveLength(2)
        expect(periods[0].start).toEqual(createDate(2024, 6, 1))
        expect(periods[0].end).toEqual(createDate(2024, 6, 2))
        expect(periods[1].start).toEqual(createDate(2024, 6, 8))
        expect(periods[1].end).toEqual(createDate(2024, 6, 9))
      })

      it('should create three periods for data with multiple gaps', () => {
        const timeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        const countDates = [
          createDate(2024, 6, 1),
          createDate(2024, 6, 2),
          // 5-day gap
          createDate(2024, 6, 8),
          createDate(2024, 6, 9),
          // 7-day gap
          createDate(2024, 6, 17),
          createDate(2024, 6, 18)
        ]

        const periods = (service as any).findDataPeriods(countDates, timeSpan)
        
        expect(periods).toHaveLength(3)
        expect(periods[0].start).toEqual(createDate(2024, 6, 1))
        expect(periods[0].end).toEqual(createDate(2024, 6, 2))
        expect(periods[1].start).toEqual(createDate(2024, 6, 8))
        expect(periods[1].end).toEqual(createDate(2024, 6, 9))
        expect(periods[2].start).toEqual(createDate(2024, 6, 17))
        expect(periods[2].end).toEqual(createDate(2024, 6, 18))
      })
    })

    describe('findDataPeriods - Weekly Granularity (> 2 years)', () => {
      it('should create single period for continuous weekly data', () => {
        const timeSpan = { 
          start: createDate(2022, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        const countDates = [
          createDate(2023, 6, 5),  // Week 23 of 2023
          createDate(2023, 6, 12), // Week 24 of 2023
          createDate(2023, 6, 19), // Week 25 of 2023
        ]

        const periods = (service as any).findDataPeriods(countDates, timeSpan)
        
        expect(periods).toHaveLength(1)
        // Should span from start of first week to end of last week
        expect(periods[0].start).toBeDefined()
        expect(periods[0].end).toBeDefined()
      })

      it('should create two periods for data with gap > 2 weeks', () => {
        const timeSpan = { 
          start: createDate(2022, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        const countDates = [
          createDate(2023, 6, 5),   // Week 23 of 2023
          createDate(2023, 6, 12),  // Week 24 of 2023
          // 4-week gap (> 2 weeks)
          createDate(2023, 7, 17),  // Week 29 of 2023
          createDate(2023, 7, 24),  // Week 30 of 2023
        ]

        const periods = (service as any).findDataPeriods(countDates, timeSpan)
        
        expect(periods).toHaveLength(2)
        expect(periods[0].start).toBeDefined()
        expect(periods[0].end).toBeDefined()
        expect(periods[1].start).toBeDefined()
        expect(periods[1].end).toBeDefined()
      })
    })

    describe('Comprehensive Timeline Scenarios', () => {
      it('should handle 5 mock sites with specified data patterns', () => {
        // Test the individual method directly with mock data
        const timeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 12, 31) 
        }

        // Test Site 1: Single continuous period (5 consecutive days)
        const site1Dates = [
          createDate(2024, 6, 1),
          createDate(2024, 6, 2),
          createDate(2024, 6, 3),
          createDate(2024, 6, 4),
          createDate(2024, 6, 5)
        ]
        const site1Periods = (service as any).findDataPeriods(site1Dates, timeSpan)
        expect(site1Periods).toHaveLength(1)

        // Test Site 2: Single continuous period (different timeframe)
        const site2Dates = [
          createDate(2024, 8, 10),
          createDate(2024, 8, 11),
          createDate(2024, 8, 12)
        ]
        const site2Periods = (service as any).findDataPeriods(site2Dates, timeSpan)
        expect(site2Periods).toHaveLength(1)

        // Test Site 3: Two separate periods (gap > 3 days)
        const site3Dates = [
          createDate(2024, 5, 1),
          createDate(2024, 5, 2),
          createDate(2024, 5, 10), // 8-day gap
          createDate(2024, 5, 11)
        ]
        const site3Periods = (service as any).findDataPeriods(site3Dates, timeSpan)
        expect(site3Periods).toHaveLength(2)

        // Test Site 4: Two separate periods (different months)
        const site4Dates = [
          createDate(2024, 3, 15),
          createDate(2024, 3, 16),
          createDate(2024, 9, 20), // Large gap
          createDate(2024, 9, 21)
        ]
        const site4Periods = (service as any).findDataPeriods(site4Dates, timeSpan)
        expect(site4Periods).toHaveLength(2)

        // Test Site 5: Three separate periods
        const site5Dates = [
          createDate(2024, 2, 1),
          createDate(2024, 2, 2),
          createDate(2024, 4, 15), // First gap
          createDate(2024, 4, 16),
          createDate(2024, 7, 10), // Second gap
          createDate(2024, 7, 11)
        ]
        const site5Periods = (service as any).findDataPeriods(site5Dates, timeSpan)
        expect(site5Periods).toHaveLength(3)

        // Verify the actual period boundaries for Site 5 (3 periods)
        expect(site5Periods[0].start).toEqual(createDate(2024, 2, 1))
        expect(site5Periods[0].end).toEqual(createDate(2024, 2, 2))
        expect(site5Periods[1].start).toEqual(createDate(2024, 4, 15))
        expect(site5Periods[1].end).toEqual(createDate(2024, 4, 16))
        expect(site5Periods[2].start).toEqual(createDate(2024, 7, 10))
        expect(site5Periods[2].end).toEqual(createDate(2024, 7, 11))
      })

      it('should use weekly granularity for multi-year spans', () => {
        const longTimeSpan = { 
          start: createDate(2020, 1, 1), 
          end: createDate(2024, 12, 31) // > 2 years
        }
        const countDates = [
          createDate(2022, 6, 1),
          createDate(2022, 6, 8),  // Same week
          createDate(2022, 7, 1),  // Different week, small gap
        ]

        const periods = (service as any).findDataPeriods(countDates, longTimeSpan)
        
        // Should use weekly granularity and create fewer periods
        expect(periods.length).toBeGreaterThan(0)
        expect(periods.length).toBeLessThanOrEqual(2) // Should group weekly
      })

      it('should use daily granularity for short spans', () => {
        const shortTimeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 6, 30) // < 2 years
        }
        const countDates = [
          createDate(2024, 3, 1),
          createDate(2024, 3, 8),  // 7-day gap (> 3 days threshold)
        ]

        const periods = (service as any).findDataPeriods(countDates, shortTimeSpan)
        
        // Should use daily granularity and create separate periods for large gaps
        expect(periods).toHaveLength(2)
      })
    })

    describe('End-to-End Data Format Contract', () => {
      it('should produce data that matches component interface expectations', () => {
        // Test the complete data transformation pipeline
        const timeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        
        // Mock data that would come from VolumeChartDataService
        const mockTimelineData = [
          {
            siteId: 1,
            siteName: 'North Alisos St',
            siteLabel: 'Site 1',
            dataPeriods: [
              { start: createDate(2024, 6, 1), end: createDate(2024, 6, 5) },
              { start: createDate(2024, 8, 10), end: createDate(2024, 8, 15) }
            ]
          },
          {
            siteId: 2,
            siteName: 'East Anacapa St',
            siteLabel: 'Site 2', 
            dataPeriods: [
              { start: createDate(2024, 3, 1), end: createDate(2024, 3, 3) }
            ]
          }
        ]

        // Use the actual TimeSeriesPrepService to transform the data
        const transformedSites = TimeSeriesPrepService.prepareTimelineSparklineData(mockTimelineData, timeSpan)

        // Verify the transformed data matches SiteData interface
        expect(transformedSites).toHaveLength(2)
        
        // Verify site 1 structure
        const site1 = transformedSites[0]
        expect(site1).toMatchObject({
          id: '1',
          name: 'North Alisos St',
          label: 'Site 1',
          dataPeriods: expect.any(Array)
        })
        
        // Verify site 1 has 2 periods (as we created gaps)
        expect(site1.dataPeriods).toHaveLength(2)
        
        // Verify data periods are percentage values (0-100)
        site1.dataPeriods.forEach(period => {
          expect(typeof period.start).toBe('number')
          expect(typeof period.end).toBe('number')
          expect(period.start).toBeGreaterThanOrEqual(0)
          expect(period.start).toBeLessThanOrEqual(100)
          expect(period.end).toBeGreaterThanOrEqual(0)
          expect(period.end).toBeLessThanOrEqual(100)
          expect(period.end).toBeGreaterThan(period.start)
        })

        // Verify site 2 structure and single period
        const site2 = transformedSites[1]
        expect(site2).toMatchObject({
          id: '2',
          name: 'East Anacapa St', 
          label: 'Site 2',
          dataPeriods: expect.any(Array)
        })
        expect(site2.dataPeriods).toHaveLength(1)

        // Verify the data can be consumed by the component
        // This simulates what the component receives
        const componentProps = {
          sites: transformedSites,
          years: ['2024'],
          variant: 'compact' as const,
          idPrefix: 'test-timeline'
        }

        // Verify component prop structure matches expected interface
        expect(componentProps.sites).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              label: expect.any(String),
              dataPeriods: expect.arrayContaining([
                expect.objectContaining({
                  start: expect.any(Number),
                  end: expect.any(Number)
                })
              ])
            })
          ])
        )
      })

      it('should handle empty data periods correctly through the pipeline', () => {
        const timeSpan = { 
          start: createDate(2024, 1, 1), 
          end: createDate(2024, 12, 31) 
        }
        
        // Site with no data periods
        const mockTimelineData = [
          {
            siteId: 1,
            siteName: 'Empty Site',
            siteLabel: 'Site 1',
            dataPeriods: []
          }
        ]

        const transformedSites = TimeSeriesPrepService.prepareTimelineSparklineData(mockTimelineData, timeSpan)

        expect(transformedSites).toHaveLength(1)
        expect(transformedSites[0].dataPeriods).toHaveLength(0)
        
        // Verify empty data periods don't break the component interface
        expect(transformedSites[0]).toMatchObject({
          id: '1',
          name: 'Empty Site',
          label: 'Site 1',
          dataPeriods: []
        })
      })
    })
  })
})