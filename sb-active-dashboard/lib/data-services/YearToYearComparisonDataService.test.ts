import { describe, it, expect, vi, beforeEach } from 'vitest'
import { YearToYearComparisonDataService } from './YearToYearComparisonDataService'

// Mock ArcGIS modules
vi.mock('@arcgis/core/layers/FeatureLayer', () => ({
  default: vi.fn(() => ({
    createQuery: vi.fn(() => ({
      where: '',
      outFields: [],
      returnGeometry: false
    })),
    queryFeatures: vi.fn(),
    queryObjectIds: vi.fn()
  }))
}))

describe('YearToYearComparisonDataService - Aggregation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('aggregateByTimeScale - Month Scale', () => {
    it('should correctly calculate average daily volume from hourly data', async () => {
      // Test data: 2 sites, 2 days each, multiple hours per day
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
      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')

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

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')

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

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Should filter out zero counts, so only 10 counts for 1 hour = 10 avg
      expect(result[0].value).toBe(10)
    })

    it('should handle single site-day with single hour', async () => {
      const mockCountsData = [
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 50, count_type: 'bike' }
      ]

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      expect(result[0].value).toBe(50)
    })

    it('should handle empty data', async () => {
      const mockCountsData: any[] = []

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      expect(result).toHaveLength(0)
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

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Day')

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

  describe('aggregateByTimeScale - Weekday vs Weekend Scale', () => {
    it('should aggregate weekdays vs weekends correctly', async () => {
      const mockCountsData = [
        // Monday (weekday)
        { site_id: 1, timestamp: '2022-07-04T09:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-04T10:00:00Z', counts: 30, count_type: 'bike' },
        
        // Saturday (weekend)
        { site_id: 1, timestamp: '2022-07-02T09:00:00Z', counts: 40, count_type: 'bike' },
        
        // Sunday (weekend)
        { site_id: 1, timestamp: '2022-07-03T09:00:00Z', counts: 60, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-03T10:00:00Z', counts: 80, count_type: 'bike' }
      ]

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Weekday vs Weekend')

      // Weekday: Monday (20+30)/2 = 25 avg hourly
      // Weekend: 
      //   - Saturday: 40/1 = 40 avg hourly  
      //   - Sunday: (60+80)/2 = 70 avg hourly
      //   - Weekend average: (40+70)/2 = 55
      
      const weekdayResult = result.find(r => r.name === 'Weekday')
      const weekendResult = result.find(r => r.name === 'Weekend')
      
      expect(weekdayResult?.value).toBe(25)
      expect(weekendResult?.value).toBe(55)
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

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Hour')

      // The hours may be affected by timezone conversion
      expect(result).toHaveLength(2)
      
      // Sort by hour for predictable testing
      const sortedResult = result.sort((a, b) => parseInt(a.name) - parseInt(b.name))
      
      // First hour should have average 30, second hour should have average 55
      expect(sortedResult[0].value).toBe(30)
      expect(sortedResult[1].value).toBe(55)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing or null counts', async () => {
      const mockCountsData = [
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: null, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: undefined, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T11:00:00Z', counts: 30, count_type: 'bike' }
      ]

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Should only count the valid 30 count for 1 hour = 30 avg
      expect(result[0].value).toBe(30)
    })

    it('should handle data spanning multiple years', async () => {
      const mockCountsData = [
        { site_id: 1, timestamp: '2021-07-01T09:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 40, count_type: 'bike' }
      ]

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Both are July, so should be averaged: (20+40)/2 = 30
      expect(result[0].value).toBe(30)
    })

    it('should handle very large count values', async () => {
      const mockCountsData = [
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 10000, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 5000, count_type: 'bike' }
      ]

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Note: This will fail with the old logic due to the >10000 filter, 
      // but should work with the new logic: (10000+5000)/2 = 7500
      expect(result[0].value).toBe(7500)
    })
  })

  describe('Real-world Scenario: July 2022 Issue', () => {
    it('should produce reasonable ADV values even with high individual counts', async () => {
      // Simulate the July 2022 scenario with high individual counts but reasonable averages
      const mockCountsData = [
        // Site with high counts but limited hours (simulating data quality issue)
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 343, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 300, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T11:00:00Z', counts: 250, count_type: 'bike' },
        
        // Normal site with typical counts
        { site_id: 2, timestamp: '2022-07-01T09:00:00Z', counts: 15, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T10:00:00Z', counts: 20, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T11:00:00Z', counts: 25, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T12:00:00Z', counts: 30, count_type: 'bike' }
      ]

      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockCountsData, 'Month')
      
      // Site 1 daily avg: (343+300+250)/3 = 297.67
      // Site 2 daily avg: (15+20+25+30)/4 = 22.5  
      // July average: (297.67 + 22.5)/2 = 160.08 ≈ 160
      
      // This should be in hundreds, not thousands like the old calculation
      expect(result[0].value).toBe(160)
      expect(result[0].value).toBeLessThan(1000) // Should not be in the thousands
    })
  })

  describe('Bug Replication: May-September Spike Pattern', () => {
    it('should demonstrate the unrealistic spike pattern that boss mentioned', async () => {
      // Create data that mimics what we're seeing in the real dashboard:
      // Relatively consistent individual counts but with dramatic differences in monthly averages
      const mockRealisticData = [
        // March 2022 - consistent, normal data (spring baseline)
        { site_id: 10, timestamp: '2022-03-15T09:00:00Z', counts: 8, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-03-15T10:00:00Z', counts: 12, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-03-15T11:00:00Z', counts: 6, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-03-20T09:00:00Z', counts: 10, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-03-20T10:00:00Z', counts: 14, count_type: 'bike' },
        
        // April 2022 - still normal  
        { site_id: 10, timestamp: '2022-04-15T09:00:00Z', counts: 9, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-04-15T10:00:00Z', counts: 11, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-04-20T09:00:00Z', counts: 13, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-04-20T10:00:00Z', counts: 7, count_type: 'bike' },
        
        // May 2022 - beginning of spike (maybe some data quality issues start?)
        { site_id: 10, timestamp: '2022-05-15T09:00:00Z', counts: 45, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-05-15T10:00:00Z', counts: 38, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-05-20T09:00:00Z', counts: 52, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-05-20T10:00:00Z', counts: 47, count_type: 'bike' },
        
        // July 2022 - dramatic spike (the problematic data your boss noticed)
        { site_id: 10, timestamp: '2022-07-15T09:00:00Z', counts: 150, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-07-15T10:00:00Z', counts: 180, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-07-15T11:00:00Z', counts: 120, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-07-20T09:00:00Z', counts: 200, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-07-20T10:00:00Z', counts: 165, count_type: 'bike' },
        
        // September 2022 - still elevated but starting to drop
        { site_id: 10, timestamp: '2022-09-15T09:00:00Z', counts: 35, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-09-15T10:00:00Z', counts: 42, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-09-20T09:00:00Z', counts: 38, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-09-20T10:00:00Z', counts: 45, count_type: 'bike' },
        
        // November 2022 - back to normal levels
        { site_id: 10, timestamp: '2022-11-15T09:00:00Z', counts: 11, count_type: 'bike' },
        { site_id: 10, timestamp: '2022-11-15T10:00:00Z', counts: 9, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-11-20T09:00:00Z', counts: 12, count_type: 'bike' },
        { site_id: 11, timestamp: '2022-11-20T10:00:00Z', counts: 8, count_type: 'bike' }
      ]

      // Call the aggregation method
      const result = await (YearToYearComparisonDataService as any).aggregateByTimeScale(mockRealisticData, 'Month')
      
      // Sort results by month for easier analysis
      const sortedResult = result.sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name)
      })
      
      console.log('🚨 SPIKE PATTERN ANALYSIS:')
      sortedResult.forEach(month => {
        console.log(`  ${month.name}: ${month.value.toFixed(2)} ADV`)
      })
      
      // Calculate the ratios to demonstrate the unrealistic spikes
      const marValues = sortedResult.filter(r => r.name === 'Mar')[0]?.value || 0
      const julValues = sortedResult.filter(r => r.name === 'Jul')[0]?.value || 0
      const novValues = sortedResult.filter(r => r.name === 'Nov')[0]?.value || 0
      
      const julToMarRatio = julValues / marValues
      const julToNovRatio = julValues / novValues
      
      console.log(`  July/March ratio: ${julToMarRatio.toFixed(1)}x`)
      console.log(`  July/November ratio: ${julToNovRatio.toFixed(1)}x`)
      
      // These ratios demonstrate the problem your boss identified
      // Manual human counts shouldn't vary by 10x+ between months
      expect(julToMarRatio).toBeGreaterThan(10) // This test SHOULD PASS, showing the bug exists
      expect(julToNovRatio).toBeGreaterThan(10) // This test SHOULD PASS, showing the bug exists
      
      // A realistic expectation would be seasonal variation of at most 2-3x
      // expect(julToMarRatio).toBeLessThan(3) // This is what we WANT after fixing
      // expect(julToNovRatio).toBeLessThan(3) // This is what we WANT after fixing
    })
    
    it('should investigate potential causes of the spike pattern', async () => {
      // Test different potential causes of the spike
      
      // Hypothesis 1: Different sites have vastly different recording patterns
      const differentSitePatterns = [
        // "Normal" site - consistent low counts
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 5, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 8, count_type: 'bike' },
        
        // "Problem" site - extremely high counts (data entry error? sensor malfunction?)
        { site_id: 2, timestamp: '2022-07-01T09:00:00Z', counts: 500, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-07-01T10:00:00Z', counts: 600, count_type: 'bike' }
      ]
      
      const sitePatternResult = await (YearToYearComparisonDataService as any).aggregateByTimeScale(differentSitePatterns, 'Month')
      
      console.log('🔍 SITE PATTERN INVESTIGATION:')
      console.log(`  July ADV with mixed site patterns: ${sitePatternResult[0]?.value.toFixed(2)}`)
      
      // Expected: (5+8)/2 = 6.5 for site 1, (500+600)/2 = 550 for site 2
      // Monthly average: (6.5 + 550) / 2 = 278.25
      expect(sitePatternResult[0]?.value).toBe(278)
      
      // Hypothesis 2: Hours of data collection varies dramatically between months
      const varyingDataDensity = [
        // March: lots of sites, few hours each (sparse but broad coverage)
        { site_id: 1, timestamp: '2022-03-01T09:00:00Z', counts: 10, count_type: 'bike' },
        { site_id: 2, timestamp: '2022-03-01T09:00:00Z', counts: 12, count_type: 'bike' },
        { site_id: 3, timestamp: '2022-03-01T09:00:00Z', counts: 8, count_type: 'bike' },
        { site_id: 4, timestamp: '2022-03-01T09:00:00Z', counts: 15, count_type: 'bike' },
        
        // July: fewer sites, many hours each (dense but narrow coverage)  
        { site_id: 1, timestamp: '2022-07-01T09:00:00Z', counts: 10, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T10:00:00Z', counts: 12, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T11:00:00Z', counts: 8, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T12:00:00Z', counts: 15, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T13:00:00Z', counts: 11, count_type: 'bike' },
        { site_id: 1, timestamp: '2022-07-01T14:00:00Z', counts: 9, count_type: 'bike' }
      ]
      
      const densityResult = await (YearToYearComparisonDataService as any).aggregateByTimeScale(varyingDataDensity, 'Month')
      const densitySorted = densityResult.sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name)
      })
      
      console.log('🔍 DATA DENSITY INVESTIGATION:')
      densitySorted.forEach(month => {
        console.log(`  ${month.name}: ${month.value.toFixed(2)} ADV`)
      })
      
      // March: 4 site-days with 1 hour each = (10+12+8+15)/4 = 11.25
      // July: 1 site-day with 6 hours = (10+12+8+15+11+9)/6 = 10.83
      // This should be similar - the bug might be elsewhere
      const marDensity = densitySorted.find(r => r.name === 'Mar')?.value || 0
      const julDensity = densitySorted.find(r => r.name === 'Jul')?.value || 0
      
      expect(Math.abs(marDensity - julDensity)).toBeLessThan(1) // Should be similar
    })
  })
})