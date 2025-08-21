import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedAADVCalculationService, RawCountRecord, EnhancedAADVConfig } from './enhanced-aadv-calculations';
import { computeSharedSiteYoY } from './year-over-year';

// Mock the fetch function to return our controlled test data
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EnhancedAADVCalculationService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock the factor files with predictable values (all factors = 1.0)
    const mockSantaCruzFactors = {
      "SantaCruz_citywide_v1": {
        "days": {
          "1": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "2": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "3": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "4": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "5": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "6": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "7": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "8": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "9": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "10": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "11": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 },
          "12": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 }
        },
        "months": {
          "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0,
          "7": 1.0, "8": 1.0, "9": 1.0, "10": 1.0, "11": 1.0, "12": 1.0
        }
      }
    };

    const mockNBPDFactors = {
      "NBPD_PATH_moderate_2009": {
        "hours": {
          "1": {
            "weekday": { "0": 1.0, "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0, "7": 1.0, "8": 1.0, "9": 1.0, "10": 1.0, "11": 1.0, "12": 1.0, "13": 1.0, "14": 1.0, "15": 1.0, "16": 1.0, "17": 1.0, "18": 1.0, "19": 1.0, "20": 1.0, "21": 1.0, "22": 1.0, "23": 1.0 },
            "saturday": { "0": 1.0, "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0, "7": 1.0, "8": 1.0, "9": 1.0, "10": 1.0, "11": 1.0, "12": 1.0, "13": 1.0, "14": 1.0, "15": 1.0, "16": 1.0, "17": 1.0, "18": 1.0, "19": 1.0, "20": 1.0, "21": 1.0, "22": 1.0, "23": 1.0 },
            "sunday": { "0": 1.0, "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0, "7": 1.0, "8": 1.0, "9": 1.0, "10": 1.0, "11": 1.0, "12": 1.0, "13": 1.0, "14": 1.0, "15": 1.0, "16": 1.0, "17": 1.0, "18": 1.0, "19": 1.0, "20": 1.0, "21": 1.0, "22": 1.0, "23": 1.0 }
          }
        },
        "days": {
          "1": { "monday": 1.0, "tuesday": 1.0, "wednesday": 1.0, "thursday": 1.0, "friday": 1.0, "saturday": 1.0, "sunday": 1.0 }
        },
        "months": {
          "1": 1.0
        }
      }
    };

    // Mock fetch to return our test factors
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('santa_cruz_factors.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSantaCruzFactors)
        });
      } else if (url.includes('nbpd_factors_moderate_2009.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNBPDFactors)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Individual Site AADV Calculations', () => {
    it('should calculate AADV of 240 for site with 10 counts per hour for 24 hours', async () => {
      // Create mock data: Site 1 with 10 counts every hour for one day in January 2023 (Monday)
      const mockData: RawCountRecord[] = [];
      
      for (let hour = 0; hour < 24; hour++) {
        // Use UTC to avoid timezone issues - January 2nd, 2023 UTC
        const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0));
        
        mockData.push({
          site_id: 1,
          timestamp: timestamp.toISOString(),
          counts: 10,
          count_type: 'bike'
        });
      }

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);

      expect(results).toHaveLength(1);
      expect(results[0].siteYear.siteId).toBe('1');
      expect(results[0].siteYear.year).toBe(2023);
      expect(results[0].siteYear.aadv).toBe(240); // 10 counts/hour × 24 hours × daily factor (1.0) × monthly factor (1.0)
      expect(results[0].method).toBe('enhanced-expansion');
      expect(results[0].factorsUsed.santaCruz).toBe(true);
      expect(results[0].factorsUsed.nbpd).toBe(false); // Case A: 24-hour coverage uses daily factors, not hourly
    });

    it('should calculate AADV of 480 for site with 20 counts per hour for 24 hours', async () => {
      // Create mock data: Site 2 with 20 counts every hour for one day in January 2023 (Monday)
      const mockData: RawCountRecord[] = [];
      const baseDate = new Date('2023-01-02'); // Monday, January 2nd, 2023
      
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, 0, 0, 0));
        
        mockData.push({
          site_id: 2,
          timestamp: timestamp.toISOString(),
          counts: 20,
          count_type: 'bike'
        });
      }

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);

      expect(results).toHaveLength(1);
      expect(results[0].siteYear.siteId).toBe('2');
      expect(results[0].siteYear.year).toBe(2023);
      expect(results[0].siteYear.aadv).toBe(480); // 20 counts/hour × 24 hours × daily factor (1.0) × monthly factor (1.0)
      expect(results[0].method).toBe('enhanced-expansion');
      expect(results[0].factorsUsed.santaCruz).toBe(true);
      expect(results[0].factorsUsed.nbpd).toBe(false); // Case A: 24-hour coverage uses daily factors, not hourly
    });
  });

  describe('Multi-Site AADV Calculations', () => {
    it('should calculate correct AADV for multiple sites in the same year', async () => {
      // Create mock data: Both sites with their respective hourly counts
      const mockData: RawCountRecord[] = [];
      const baseDate = new Date('2023-01-02'); // Monday, January 2nd, 2023
      
      // Site 1: 10 counts per hour
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, 0, 0, 0));
        
        mockData.push({
          site_id: 1,
          timestamp: timestamp.toISOString(),
          counts: 10,
          count_type: 'bike'
        });
      }

      // Site 2: 20 counts per hour
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, 0, 0, 0));
        
        mockData.push({
          site_id: 2,
          timestamp: timestamp.toISOString(),
          counts: 20,
          count_type: 'bike'
        });
      }

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);

      expect(results).toHaveLength(2);
      
      // Find results for each site
      const site1Result = results.find(r => r.siteYear.siteId === '1');
      const site2Result = results.find(r => r.siteYear.siteId === '2');

      expect(site1Result).toBeDefined();
      expect(site1Result!.siteYear.aadv).toBe(240);
      
      expect(site2Result).toBeDefined();
      expect(site2Result!.siteYear.aadv).toBe(480);
    });
  });

  describe('Year-to-Year Comparison Logic', () => {
    it('should calculate average AADV of 360 for year-to-year comparison', async () => {
      // Create mock data for two years with the same sites
      const mockData: RawCountRecord[] = [];
      
      // Year 2023 data - Site 1: 10 counts per hour
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0)); // January 2nd, 2023
        
        mockData.push({
          site_id: 1,
          timestamp: timestamp.toISOString(),
          counts: 10,
          count_type: 'bike'
        });
      }

      // Site 2: 20 counts per hour in 2023
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0)); // January 2nd, 2023
        
        mockData.push({
          site_id: 2,
          timestamp: timestamp.toISOString(),
          counts: 20,
          count_type: 'bike'
        });
      }

      // Year 2024 data - Site 1: 10 counts per hour
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2024, 0, 1, hour, 0, 0, 0)); // January 1st, 2024
        
        mockData.push({
          site_id: 1,
          timestamp: timestamp.toISOString(),
          counts: 10,
          count_type: 'bike'
        });
      }

      // Year 2024 data - Site 2: 20 counts per hour
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2024, 0, 1, hour, 0, 0, 0)); // January 1st, 2024
        
        mockData.push({
          site_id: 2,
          timestamp: timestamp.toISOString(),
          counts: 20,
          count_type: 'bike'
        });
      }

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);
      
      // Convert to SiteYear format for year-over-year analysis
      const siteYearData = results.map(r => r.siteYear);

      // Test the year-over-year comparison logic
      const yoyResult = computeSharedSiteYoY(siteYearData, 2023, 2024);

      expect(yoyResult.sharedCount).toBe(2); // Both sites have data in both years
      expect(yoyResult.sharedSites).toEqual(['1', '2']);
      
      // Average AADV for 2023: (240 + 480) / 2 = 360
      expect(yoyResult.mean0).toBe(360);
      
      // Average AADV for 2024: (240 + 480) / 2 = 360 (same pattern)
      expect(yoyResult.mean1).toBe(360);
      
      // Year-over-year change: 0% (no change)
      expect(yoyResult.yoy).toBe(0);
      expect(yoyResult.ok).toBe(true);
    });

    it('should detect year-over-year change when site volumes change', async () => {
      // Create mock data where volumes double in the second year
      const mockData: RawCountRecord[] = [];
      
      // Year 2023 data (baseline)
      
      // Site 1: 10 counts per hour in 2023
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0)); // January 2nd, 2023
        
        mockData.push({
          site_id: 1,
          timestamp: timestamp.toISOString(),
          counts: 10,
          count_type: 'bike'
        });
      }

      // Site 2: 20 counts per hour in 2023
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0)); // January 2nd, 2023
        
        mockData.push({
          site_id: 2,
          timestamp: timestamp.toISOString(),
          counts: 20,
          count_type: 'bike'
        });
      }

      // Year 2024 data - Site 1: 20 counts per hour (doubled)
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2024, 0, 1, hour, 0, 0, 0)); // January 1st, 2024
        
        mockData.push({
          site_id: 1,
          timestamp: timestamp.toISOString(),
          counts: 20, // doubled from 10
          count_type: 'bike'
        });
      }

      // Year 2024 data - Site 2: 40 counts per hour (doubled)
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(Date.UTC(2024, 0, 1, hour, 0, 0, 0)); // January 1st, 2024
        
        mockData.push({
          site_id: 2,
          timestamp: timestamp.toISOString(),
          counts: 40, // doubled from 20
          count_type: 'bike'
        });
      }

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);
      const siteYearData = results.map(r => r.siteYear);

      const yoyResult = computeSharedSiteYoY(siteYearData, 2023, 2024);

      expect(yoyResult.sharedCount).toBe(2);
      
      // Average AADV for 2023: (240 + 480) / 2 = 360
      expect(yoyResult.mean0).toBe(360);
      
      // Average AADV for 2024: (480 + 960) / 2 = 720 (doubled)
      expect(yoyResult.mean1).toBe(720);
      
      // Year-over-year change: 100% increase
      expect(yoyResult.yoy).toBe(1.0); // 720/360 - 1 = 1.0 (100% increase)
      expect(yoyResult.ok).toBe(true);
    });
  });

  describe('Factor Application Verification', () => {
    it('should apply all three layers of normalization factors', async () => {
      const mockData: RawCountRecord[] = [{
        site_id: 1,
        timestamp: '2023-01-02T12:00:00.000Z', // Monday, January 2nd, 2023, noon
        counts: 10,
        count_type: 'bike'
      }];

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);

      expect(results).toHaveLength(1);
      const result = results[0];

      // Verify that factors were applied - Case B: partial hours (1 hour < 24 hours)
      expect(result.factorsUsed.santaCruz).toBe(true); // Monthly factor always applied
      expect(result.factorsUsed.nbpd).toBe(true); // Hourly factor applied for partial coverage
      expect(result.factorsUsed.hourlyFactorsApplied).toBeGreaterThan(0); // Should have 1 hourly factor
      expect(result.factorsUsed.dailyFactorsApplied).toBe(0); // No daily factors for Case B
      expect(result.factorsUsed.monthlyFactorsApplied).toBeGreaterThan(0); // Should have 1 monthly factor
      
      // With all factors = 1.0, the result should be the raw count (10)
      expect(result.siteYear.aadv).toBe(10);
    });

    it('should handle missing factors gracefully', async () => {
      // Mock fetch to return factors with missing data
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('santa_cruz_factors.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              "SantaCruz_citywide_v1": {
                "days": { "1": { "monday": 1.0 } }, // Limited data
                "months": { "1": 1.0 } // Limited data
              }
            })
          });
        } else if (url.includes('nbpd_factors_moderate_2009.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              "NBPD_PATH_moderate_2009": {
                "hours": { "1": { "weekday": { "12": 1.0 } } }, // Limited data
                "days": { "1": { "monday": 1.0 } },
                "months": { "1": 1.0 }
              }
            })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const mockData: RawCountRecord[] = [{
        site_id: 1,
        timestamp: '2023-01-02T12:00:00.000Z', // Monday, January 2nd, 2023, noon
        counts: 10,
        count_type: 'bike'
      }];

      const config: EnhancedAADVConfig = {
        showBicyclist: true,
        showPedestrian: false,
        santaCruzProfileKey: 'SantaCruz_citywide_v1',
        nbpdProfileKey: 'NBPD_PATH_moderate_2009'
      };

      const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);

      expect(results).toHaveLength(1);
      const result = results[0];

      // Should still work but may have warnings
      expect(result.method).toBe('enhanced-expansion');
      expect(result.siteYear.aadv).toBeGreaterThan(0);
      
      // May have warnings about missing factors
      // (The exact behavior depends on implementation details)
    });
  });
});
