import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VolumeBreakdownDataService } from './VolumeBreakdownDataService'
import { YearToYearComparisonDataService } from './YearToYearComparisonDataService'

// Mock ArcGIS modules
vi.mock('@arcgis/core/layers/FeatureLayer', () => ({
  default: vi.fn(() => ({
    createQuery: vi.fn(() => ({
      where: '',
      outFields: [],
      returnGeometry: false
    })),
    queryFeatures: vi.fn()
  }))
}))

describe('VolumeBreakdownDataService - Aggregation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('aggregateByTimeScale - Month Scale', () => {
    it('should correctly calculate average daily volume from hourly data', async () => {
      // Test data: Same scenario as YearToYearComparisonDataService
      const mockCountsData = [
        // Site 1, Day 1 (July 1, 2022): 3 hours of data
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 10, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 15, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T11:00:00Z', counts: 20, count_type: 'bike' },
        // Site 1, Day 2 (July 2, 2022): 2 hours of data
        { site_id: 1, timestamp: '2022-07-02T09:00:00Z', counts: 25, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-02T10:00:00Z', counts: 30, count_type: 'bike' },
        
        // Site 2, Day 1 (July 1, 2022): 4 hours of data
        { site_id: 2, timestamp: '2022-07-01T08:00:00Z', counts: 5, count_type: 'ped' },
        { site_id: 2, timestamp: '2022-07-01T09:00:00Z', counts: 8, count_type: 'ped' },
        { site_id: 2, timestamp: '2022-07-01T10:00:00Z', counts: 12, count_type: 'ped' },
        { site_id: 2, timestamp: '2022-07-01T11:00:00Z', counts: 15, count_type: 'ped' },
        // Site 2, Day 2 (July 2, 2022): 1 hour of data
        { site_id: 2, timestamp: '2022-07-02T09:00:00Z', counts: 40, count_type: 'ped' }
      ]

      // Call the private method using type casting (for testing purposes)
      const result = (VolumeBreakdownDataService as any).aggregateByTimeScale(mockCountsData, 'Month')

      // Expected calculations:
      // Site 1, July 1: (10+15+20)/3 = 15 avg hourly
      // Site 1, July 2: (25+30)/2 = 27.5 avg hourly  
      // Site 2, July 1: (5+8+12+15)/4 = 10 avg hourly
      // Site 2, July 2: 40/1 = 40 avg hourly
      // July average: (15 + 27.5 + 10 + 40)/4 = 23.125 ≈ 23 (rounded)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Jul')
      expect(result[0].value).toBe(23)
    })

    it('should handle mixed months correctly', async () => {
      const mockCountsData = [
        // July data
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 30, count_type: 'bike' },
        
        // August data  
        { site_id: 1, timestamp: '2022-08-01T09:00:00Z', counts: 40, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-08-01T10:00:00Z', counts: 50, count_type: 'bike' }
      ]

      const result = (VolumeBreakdownDataService as any).aggregateByTimeScale(mockCountsData, 'Month')

      // July: (20+30)/2 = 25 avg hourly
      // August: (40+50)/2 = 45 avg hourly
      
      expect(result).toHaveLength(2)
      
      const julyResult = result.find(r => r.name === 'Jul')
      const augustResult = result.find(r => r.name === 'Aug')
      
      expect(julyResult?.value).toBe(25)
      expect(augustResult?.value).toBe(45)
    })

    it('should handle zero counts correctly', async () => {
      const mockCountsData = [
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 0, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 10, count_type: 'bike' }
      ]

      const result = (VolumeBreakdownDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Should filter out zero counts, so only 10 counts for 1 hour = 10 avg
      expect(result[0].value).toBe(10)
    })
  })

  describe('aggregateByTimeScale - Day Scale', () => {
    it('should aggregate by day of week correctly', async () => {
      const mockCountsData = [
        // Monday (2022-07-04)
        { site_id: 1, timestamp: '2022-07-04T09:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-04T10:00:00Z', counts: 30, count_type: 'bike' },
        
        // Tuesday (2022-07-05)
        { site_id: 1, timestamp: '2022-07-05T09:00:00Z', counts: 15, count_type: 'bike' },
        
        // Another Monday (2022-07-11) - same site
        { site_id: 1, timestamp: '2022-07-11T09:00:00Z', counts: 40, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-11T10:00:00Z', counts: 50, count_type: 'bike' }
      ]

      const result = (VolumeBreakdownDataService as any).aggregateByTimeScale(mockCountsData, 'Day')

      // Monday site-days: 
      //   - July 4: (20+30)/2 = 25 avg hourly
      //   - July 11: (40+50)/2 = 45 avg hourly
      //   - Monday average: (25+45)/2 = 35
      // Tuesday site-days:
      //   - July 5: 15/1 = 15 avg hourly
      
      const mondayResult = result.find(r => r.name === 'Mon')
      const tuesdayResult = result.find(r => r.name === 'Tue')
      
      expect(mondayResult?.value).toBe(35)
      expect(tuesdayResult?.value).toBe(15)
    })
  })

  describe('aggregateByTimeScale - Hour Scale', () => {
    it('should calculate hourly averages correctly', async () => {
      const mockCountsData = [
        // Multiple 9 AM records
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T09:00:00Z', counts: 30, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-02T09:00:00Z', counts: 40, count_type: 'bike' },
        
        // 10 AM records
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 50, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T10:00:00Z', counts: 60, count_type: 'bike' }
      ]

      const result = (VolumeBreakdownDataService as any).aggregateByTimeScale(mockCountsData, 'Hour')

      // The hours may be affected by timezone conversion
      expect(result).toHaveLength(2)
      
      // Sort by hour for predictable testing
      const sortedResult = result.sort((a, b) => parseInt(a.name) - parseInt(b.name))
      
      // First hour should have average 30, second hour should have average 55
      expect(sortedResult[0].value).toBe(30)
      expect(sortedResult[1].value).toBe(55)
    })
  })

  describe('Real-world Comparison: Both Services Should Match', () => {
    it('should produce identical results to YearToYearComparisonDataService', async () => {
      // Same test data for both services
      const mockCountsData = [
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 343, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 300, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T11:00:00Z', counts: 250, count_type: 'bike' },
        
        { site_id: 2, timestamp: '2022-07-01T09:00:00Z', counts: 15, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T10:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T11:00:00Z', counts: 25, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T12:00:00Z', counts: 30, count_type: 'bike' }
      ]

      const volumeBreakdownResult = await (VolumeBreakdownDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      const yearToYearResult = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Both services should produce identical results
      expect(volumeBreakdownResult).toHaveLength(1)
      expect(yearToYearResult).toHaveLength(1)
      expect(volumeBreakdownResult[0].value).toBe(yearToYearResult[0].value)
      expect(volumeBreakdownResult[0].value).toBe(160) // The correct value from the fixed calculation
    })
  })
})