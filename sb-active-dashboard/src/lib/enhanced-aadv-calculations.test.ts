import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedAADVCalculationService, RawCountRecord, EnhancedAADVConfig } from './enhanced-aadv-calculations';
import { computeSharedSiteYoY } from './year-over-year';

// Mock the fetch function to return our controlled test data
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EnhancedAADVCalculationService', () => {
  // Helper function to create flat expansion factors for simple testing
  const createFlatFactors = () => {
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

    // SIMPLE FLAT NBPD FACTORS: All hourly expansion factors = 24
    // This means p = 1/24 for each hour, so if you have 1 hour of data,
    // ADT = count / (1/24) = count × 24
    const mockNBPDFactors = {
      "NBPD_PATH_moderate_2009": {
        "hours": {
          "1": {
            "weekday": { 
              "0": 24, "1": 24, "2": 24, "3": 24, "4": 24, "5": 24, 
              "6": 24, "7": 24, "8": 24, "9": 24, "10": 24, 
              "11": 24, "12": 24, "13": 24, "14": 24, "15": 24, 
              "16": 24, "17": 24, "18": 24, "19": 24, "20": 24, 
              "21": 24, "22": 24, "23": 24 
            },
            "saturday": { 
              "0": 24, "1": 24, "2": 24, "3": 24, "4": 24, "5": 24, 
              "6": 24, "7": 24, "8": 24, "9": 24, "10": 24, 
              "11": 24, "12": 24, "13": 24, "14": 24, "15": 24, 
              "16": 24, "17": 24, "18": 24, "19": 24, "20": 24, 
              "21": 24, "22": 24, "23": 24 
            },
            "sunday": { 
              "0": 24, "1": 24, "2": 24, "3": 24, "4": 24, "5": 24, 
              "6": 24, "7": 24, "8": 24, "9": 24, "10": 24, 
              "11": 24, "12": 24, "13": 24, "14": 24, "15": 24, 
              "16": 24, "17": 24, "18": 24, "19": 24, "20": 24, 
              "21": 24, "22": 24, "23": 24 
            }
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

    return { mockSantaCruzFactors, mockNBPDFactors };
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Set up default flat factors for simple testing
    const { mockSantaCruzFactors, mockNBPDFactors } = createFlatFactors();

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

  describe('Sanity Check Tests - Simple Flat Factors', () => {
    it('should calculate AADV of 240 for site with 10 counts per hour for 24 hours using flat factors (Case A)', async () => {
      // SANITY CHECK: With flat factors (all = 1.0 and H = 24), 
      // 24 hours × 10 counts = 240 total daily counts
      // Case A: Full day coverage uses daily factors only
      // AADV = 240 × daily_factor(1.0) × monthly_factor(1.0) = 240
      
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

    it('should calculate AADV of 480 for site with 20 counts per hour for 24 hours using flat factors (Case A)', async () => {
      // SANITY CHECK: With flat factors (all = 1.0 and H = 24),
      // 24 hours × 20 counts = 480 total daily counts
      // Case A: Full day coverage uses daily factors only
      // AADV = 480 × daily_factor(1.0) × monthly_factor(1.0) = 480
      
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

    it('should calculate AADV of 240 for 1 hour of 10 counts using flat factors (Case B)', async () => {
      // SANITY CHECK: With flat factors (H = 24 for all hours),
      // 1 hour × 10 counts, p = 1/24
      // Case B: Partial hours uses p-value methodology
      // ADT = 10 / (1/24) = 10 × 24 = 240
      // AADV = 240 × daily_factor(1.0) × monthly_factor(1.0) = 240
      
      const mockData: RawCountRecord[] = [{
        site_id: 3,
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
      expect(results[0].siteYear.siteId).toBe('3');
      expect(results[0].siteYear.year).toBe(2023);
      expect(results[0].method).toBe('enhanced-expansion');
      expect(results[0].factorsUsed.santaCruz).toBe(true);
      expect(results[0].factorsUsed.nbpd).toBe(true); // Case B: uses hourly factors
      expect(results[0].factorsUsed.hourlyFactorsApplied).toBe(1);
      expect(results[0].factorsUsed.dailyFactorsApplied).toBe(1);
      expect(results[0].factorsUsed.monthlyFactorsApplied).toBe(1);
      
      // With flat H=24: p=1/24, ADT = 10/(1/24) = 240, AADV = 240×1.0×1.0 = 240
      expect(results[0].siteYear.aadv).toBe(240);
    });

    it('should calculate AADV of 240 for 4 hours of 10 counts each using flat factors (Case B)', async () => {
      // SANITY CHECK: With flat factors (H = 24 for all hours),
      // 4 hours × 10 counts = 40 total counts, each p = 1/24, total p = 4/24 = 1/6
      // Case B: Partial hours uses p-value methodology
      // ADT = 40 / (1/6) = 40 × 6 = 240
      // AADV = 240 × daily_factor(1.0) × monthly_factor(1.0) = 240
      
      const mockData: RawCountRecord[] = [];
      
      // 4 hours of data: 9am, 10am, 11am, 12pm
      const hoursToTest = [9, 10, 11, 12];
      for (const hour of hoursToTest) {
        const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0)); // January 2nd, 2023 (Monday)
        
        mockData.push({
          site_id: 4,
          timestamp: timestamp.toISOString(),
          counts: 10, // 10 counts per hour
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
      expect(results[0].siteYear.siteId).toBe('4');
      expect(results[0].siteYear.year).toBe(2023);
      expect(results[0].method).toBe('enhanced-expansion');
      expect(results[0].factorsUsed.santaCruz).toBe(true);
      expect(results[0].factorsUsed.nbpd).toBe(true); // Case B: uses hourly factors
      expect(results[0].factorsUsed.hourlyFactorsApplied).toBe(4);
      expect(results[0].factorsUsed.dailyFactorsApplied).toBe(1);
      expect(results[0].factorsUsed.monthlyFactorsApplied).toBe(1);
      
      // With flat H=24: each p=1/24, total p=4/24=1/6, ADT = 40/(1/6) = 240, AADV = 240×1.0×1.0 = 240
      expect(results[0].siteYear.aadv).toBe(240);
    });


  });

  describe('Realistic Factor Tests - Manual Verification', () => {
    it('should calculate AADV for 4 hours using actual NBPD factors (Case B)', async () => {
      // Save original cache to restore later
      // @ts-ignore - Access private static property for testing
      const originalCache = EnhancedAADVCalculationService.factorsCache;
      
      try {
        // Set up realistic NBPD factors from the actual file
        const mockSantaCruzFactors = {
          "SantaCruz_citywide_v1": {
            "days": { "1": { "monday": 1.0 } },
            "months": { "1": 1.0 }
          }
        };

        const mockNBPDFactors = {
          "NBPD_PATH_moderate_2009": {
            "hours": {
              "1": {
                "weekday": { 
                  "9": 15.0,                   // 9am: H=15.0, p=1/15.0=0.0667
                  "10": 11.666666666666668,    // 10am: H=11.667, p=1/11.667=0.0857
                  "11": 11.666666666666668,    // 11am: H=11.667, p=1/11.667=0.0857
                  "12": 11.666666666666668     // 12pm: H=11.667, p=1/11.667=0.0857
                }
              }
            },
            "days": { "1": { "monday": 1.0 } },
            "months": { "1": 1.0 }
          }
        };

        // Clear any existing cached profiles and set up fresh mocks
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = null;
        mockFetch.mockClear();
        mockFetch.mockImplementation((url: string) => {
          if (url.includes('santa_cruz_factors.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSantaCruzFactors) });
          } else if (url.includes('nbpd_factors_moderate_2009.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockNBPDFactors) });
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        // Create test data: 4 hours of 15 counts each
        const mockData: RawCountRecord[] = [];
        const hoursToTest = [9, 10, 11, 12];
        for (const hour of hoursToTest) {
          const timestamp = new Date(Date.UTC(2023, 0, 2, hour, 0, 0, 0)); // January 2nd, 2023 (Monday)
          
          mockData.push({
            site_id: 5,
            timestamp: timestamp.toISOString(),
            counts: 15, // 15 counts per hour
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
        expect(results[0].siteYear.siteId).toBe('5');
        expect(results[0].siteYear.year).toBe(2023);
        expect(results[0].method).toBe('enhanced-expansion');
        expect(results[0].factorsUsed.santaCruz).toBe(true);
        expect(results[0].factorsUsed.nbpd).toBe(true);
        expect(results[0].factorsUsed.hourlyFactorsApplied).toBe(4);
        expect(results[0].factorsUsed.dailyFactorsApplied).toBe(1);
        expect(results[0].factorsUsed.monthlyFactorsApplied).toBe(1);
        
        // MANUAL CALCULATION with realistic NBPD factors:
        // Hour 9: count=15, H=15.0, p=1/15.0=0.0667
        // Hour 10: count=15, H=11.667, p=1/11.667=0.0857  
        // Hour 11: count=15, H=11.667, p=1/11.667=0.0857
        // Hour 12: count=15, H=11.667, p=1/11.667=0.0857
        // Total counts = 60, Total p = 0.0667 + 0.0857 + 0.0857 + 0.0857 = 0.3238
        // ADT = 60 / 0.3238 = 185.31
        // Apply daily factor (1.0) and monthly factor (1.0): 185.31 × 1.0 × 1.0 = 185.31
        expect(results[0].siteYear.aadv).toBeCloseTo(185.31, 1);
      } finally {
        // Restore original cache
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = originalCache;
      }
    });

    it('should demonstrate proper hourly expansion with different peak/off-peak factors', async () => {
      // Save original cache to restore later
      // @ts-ignore - Access private static property for testing
      const originalCache = EnhancedAADVCalculationService.factorsCache;
      
      try {
        // Create mock data: 2 hours during different times of day with different expansion needs
        const mockData: RawCountRecord[] = [
          {
            site_id: 6,
            timestamp: '2023-01-02T07:00:00.000Z', // 7am UTC (off-peak)
            counts: 5,
            count_type: 'bike'
          },
          {
            site_id: 6,
            timestamp: '2023-01-02T17:00:00.000Z', // 5pm UTC (peak)
            counts: 20,
            count_type: 'bike'
          }
        ];

        // Mock factors where 7am needs high expansion (low typical volume) and 5pm needs low expansion (high typical volume)
        const mockSantaCruzFactors = {
          "SantaCruz_citywide_v1": {
            "days": { "1": { "monday": 1.0 } },
            "months": { "1": 2.0 } // 2x monthly factor for demonstration
          }
        };

        const mockNbpdFactors = {
          "NBPD_PATH_moderate_2009": {
            "hours": { 
              "1": { 
                "weekday": { 
                  "7": 48.0,  // 7am needs 48x expansion (low typical volume hour)
                  "17": 15.0  // 5pm needs 15x expansion (higher typical volume hour)
                } 
              } 
            },
            "days": { "1": { "monday": 1.0 } },
            "months": { "1": 1.0 }
          }
        };

        // Clear any existing cached profiles and set up fresh mocks
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = null;
        mockFetch.mockClear();
        mockFetch.mockImplementation((url: string) => {
          if (url.includes('santa_cruz_factors.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSantaCruzFactors) });
          } else if (url.includes('nbpd_factors_moderate_2009.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockNbpdFactors) });
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        const config: EnhancedAADVConfig = {
          showBicyclist: true,
          showPedestrian: false,
          santaCruzProfileKey: 'SantaCruz_citywide_v1',
          nbpdProfileKey: 'NBPD_PATH_moderate_2009'
        };

        const results = await EnhancedAADVCalculationService.calculateEnhancedAADV(mockData, config);

        expect(results).toHaveLength(1);
        expect(results[0].factorsUsed.hourlyFactorsApplied).toBe(2);
        
        // MANUAL CALCULATION using proper p-value methodology:
        // 7am: count=5, H=48.0, p=1/48.0=0.0208
        // 5pm: count=20, H=15.0, p=1/15.0=0.0667
        // Total counts = 25, Total p = 0.0208 + 0.0667 = 0.0875
        // ADT = 25 / 0.0875 = 285.71
        // Apply daily factor (1.0) and monthly factor (2.0): 285.71 × 1.0 × 2.0 = 571.43 AADV
        expect(results[0].siteYear.aadv).toBeCloseTo(571.43, 1);
      } finally {
        // Restore original cache
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = originalCache;
      }
    });

    it('should calculate AADV of 166.34 for 16 hours (6 AM to 9 PM) using actual NBPD weekend hourly factors for August, flat daily and monthly factors', async () => {
      // Save original cache to restore later
      // @ts-ignore - Access private static property for testing
      const originalCache = EnhancedAADVCalculationService.factorsCache;
      
      try {
        // Set up actual NBPD weekend factors for August (month 8) with flat daily/monthly factors
        const mockSantaCruzFactors = {
          "SantaCruz_citywide_v1": {
            "days": { "8": { "saturday": 1.0, "sunday": 1.0 } },
            "months": { "8": 1.0 }
          }
        };

        const mockNBPDFactors = {
          "NBPD_PATH_moderate_2009": {
            "hours": {
              "8": {
                "saturday": {
                  "6": 105.0,                  // 6 AM: H=105.0, p=1/105.0=0.0095
                  "7": 35.0,                   // 7 AM: H=35.0, p=1/35.0=0.0286
                  "8": 17.5,                   // 8 AM: H=17.5, p=1/17.5=0.0571
                  "9": 11.666666666666668,     // 9 AM: H=11.667, p=1/11.667=0.0857
                  "10": 11.666666666666668,    // 10 AM: H=11.667, p=1/11.667=0.0857
                  "11": 9.545454545454545,     // 11 AM: H=9.545, p=1/9.545=0.1048
                  "12": 10.5,                  // 12 PM: H=10.5, p=1/10.5=0.0952
                  "13": 11.666666666666668,    // 1 PM: H=11.667, p=1/11.667=0.0857
                  "14": 13.125,                // 2 PM: H=13.125, p=1/13.125=0.0762
                  "15": 13.125,                // 3 PM: H=13.125, p=1/13.125=0.0762
                  "16": 15.0,                  // 4 PM: H=15.0, p=1/15.0=0.0667
                  "17": 17.5,                  // 5 PM: H=17.5, p=1/17.5=0.0571
                  "18": 21.0,                  // 6 PM: H=21.0, p=1/21.0=0.0476
                  "19": 26.25,                 // 7 PM: H=26.25, p=1/26.25=0.0381
                  "20": 35.0,                  // 8 PM: H=35.0, p=1/35.0=0.0286
                  "21": 52.5                   // 9 PM: H=52.5, p=1/52.5=0.0190
                },
                "sunday": {
                  "6": 105.0, "7": 35.0, "8": 17.5, "9": 11.666666666666668, "10": 11.666666666666668,
                  "11": 9.545454545454545, "12": 10.5, "13": 11.666666666666668, "14": 13.125, "15": 13.125,
                  "16": 15.0, "17": 17.5, "18": 21.0, "19": 26.25, "20": 35.0, "21": 52.5
                }
              }
            },
            "days": { "8": { "saturday": 1.0, "sunday": 1.0 } },
            "months": { "8": 1.0 }
          }
        };

        // Clear any existing cached profiles and set up fresh mocks
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = null;
        mockFetch.mockClear();
        mockFetch.mockImplementation((url: string) => {
          if (url.includes('santa_cruz_factors.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSantaCruzFactors) });
          } else if (url.includes('nbpd_factors_moderate_2009.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockNBPDFactors) });
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        // Create test data: 16 hours (6 AM to 9 PM) of 10 counts each on a weekend day in August
        const mockData: RawCountRecord[] = [];
        const hoursToTest = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        
        for (const hour of hoursToTest) {
          // Use August 5th, 2023 (Saturday) for weekend factors
          const timestamp = new Date(Date.UTC(2023, 7, 5, hour, 0, 0, 0));
          
          mockData.push({
            site_id: 7,
            timestamp: timestamp.toISOString(),
            counts: 10, // 10 counts per hour
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
        expect(results[0].siteYear.siteId).toBe('7');
        expect(results[0].siteYear.year).toBe(2023);
        expect(results[0].method).toBe('enhanced-expansion');
        expect(results[0].factorsUsed.santaCruz).toBe(true);
        expect(results[0].factorsUsed.nbpd).toBe(true);
        expect(results[0].factorsUsed.hourlyFactorsApplied).toBe(16);
        expect(results[0].factorsUsed.dailyFactorsApplied).toBe(1);
        expect(results[0].factorsUsed.monthlyFactorsApplied).toBe(1);
        
        // MANUAL CALCULATION with actual NBPD weekend factors for August:
        // Total counts = 16 hours × 10 counts = 160
        // Sum of p-values = 0.0095 + 0.0286 + 0.0571 + 0.0857 + 0.0857 + 0.1048 + 0.0952 + 
        //                   0.0857 + 0.0762 + 0.0762 + 0.0667 + 0.0571 + 0.0476 + 0.0381 + 
        //                   0.0286 + 0.0190 = 0.9618
        // ADT = 160 / 0.9618 = 166.34
        // Apply daily factor (1.0) and monthly factor (1.0): 166.34 × 1.0 × 1.0 = 166.34
        expect(results[0].siteYear.aadv).toBeCloseTo(166.34, 2);
      } finally {
        // Restore original cache
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = originalCache;
      }
    });

    it('should calculate ADT of 166.34 and AADV of 244.22 using actual Santa Cruz and NBPD factors for Friday in January', async () => {
      // Save original cache to restore later
      // @ts-ignore - Access private static property for testing
      const originalCache = EnhancedAADVCalculationService.factorsCache;
      
      try {
        // Set up actual Santa Cruz factors for Friday in January
        const mockSantaCruzFactors = {
          "SantaCruz_citywide_v1": {
            "days": { 
              "1": { 
                "friday": 0.9820799864865795    // Friday daily factor for January
              } 
            },
            "months": { 
              "1": 1.495031                     // January monthly factor
            }
          }
        };

        // Set up actual NBPD weekday factors for January
        const mockNBPDFactors = {
          "NBPD_PATH_moderate_2009": {
            "hours": {
              "1": {
                "weekday": {
                  "6": 52.5,                     // 6 AM: H=52.5, p=1/52.5=0.0190
                  "7": 26.25,                    // 7 AM: H=26.25, p=1/26.25=0.0381
                  "8": 17.5,                     // 8 AM: H=17.5, p=1/17.5=0.0571
                  "9": 15.0,                     // 9 AM: H=15.0, p=1/15.0=0.0667
                  "10": 11.666666666666668,      // 10 AM: H=11.667, p=1/11.667=0.0857
                  "11": 11.666666666666668,      // 11 AM: H=11.667, p=1/11.667=0.0857
                  "12": 11.666666666666668,      // 12 PM: H=11.667, p=1/11.667=0.0857
                  "13": 11.666666666666668,      // 1 PM: H=11.667, p=1/11.667=0.0857
                  "14": 11.666666666666668,      // 2 PM: H=11.667, p=1/11.667=0.0857
                  "15": 13.125,                  // 3 PM: H=13.125, p=1/13.125=0.0762
                  "16": 13.125,                  // 4 PM: H=13.125, p=1/13.125=0.0762
                  "17": 15.0,                    // 5 PM: H=15.0, p=1/15.0=0.0667
                  "18": 17.5,                    // 6 PM: H=17.5, p=1/17.5=0.0571
                  "19": 26.25,                   // 7 PM: H=26.25, p=1/26.25=0.0381
                  "20": 52.5,                    // 8 PM: H=52.5, p=1/52.5=0.0190
                  "21": 52.5                     // 9 PM: H=52.5, p=1/52.5=0.0190
                }
              }
            },
            "days": { "1": { "friday": 1.0 } },
            "months": { "1": 1.0 }
          }
        };

        // Clear any existing cached profiles and set up fresh mocks
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = null;
        mockFetch.mockClear();
        mockFetch.mockImplementation((url: string) => {
          if (url.includes('santa_cruz_factors.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSantaCruzFactors) });
          } else if (url.includes('nbpd_factors_moderate_2009.json')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockNBPDFactors) });
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        // Create test data: 16 hours (6 AM to 9 PM) of 10 counts each on Friday, January 6th, 2023
        const mockData: RawCountRecord[] = [];
        const hoursToTest = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        
        for (const hour of hoursToTest) {
          // Use January 6th, 2023 (Friday) for weekday factors
          const timestamp = new Date(Date.UTC(2023, 0, 6, hour, 0, 0, 0));
          
          mockData.push({
            site_id: 8,
            timestamp: timestamp.toISOString(),
            counts: 10, // 10 counts per hour
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
        expect(results[0].siteYear.siteId).toBe('8');
        expect(results[0].siteYear.year).toBe(2023);
        expect(results[0].method).toBe('enhanced-expansion');
        expect(results[0].factorsUsed.santaCruz).toBe(true);
        expect(results[0].factorsUsed.nbpd).toBe(true);
        expect(results[0].factorsUsed.hourlyFactorsApplied).toBe(16);
        expect(results[0].factorsUsed.dailyFactorsApplied).toBe(1);
        expect(results[0].factorsUsed.monthlyFactorsApplied).toBe(1);
        
        // MANUAL CALCULATION with actual Santa Cruz and NBPD factors:
        // Step 1: Calculate ADT using NBPD hourly factors
        // Total counts = 16 hours × 10 counts = 160
        // Sum of p-values = 0.0190 + 0.0381 + 0.0571 + 0.0667 + 0.0857 + 0.0857 + 0.0857 + 
        //                   0.0857 + 0.0857 + 0.0762 + 0.0762 + 0.0667 + 0.0571 + 0.0381 + 
        //                   0.0190 + 0.0190 = 0.9618
        // ADT = 160 / 0.9618 = 166.34
        
        // Step 2: Apply Santa Cruz daily factor
        // MADT = ADT × daily_factor = 166.34 × 0.9820799864865795 = 163.36
        
        // Step 3: Apply Santa Cruz monthly factor  
        // AADV = MADT × monthly_factor = 163.36 × 1.495031 = 244.22
        
        // VERIFICATION: All three factor types are being applied:
        // 1. NBPD hourly factors: ADT = 166.34
        // 2. Santa Cruz daily factor: MADT = 166.34 × 0.9821 = 163.36  
        // 3. Santa Cruz monthly factor: AADV = 163.36 × 1.495 = 244.22
        expect(results[0].siteYear.aadv).toBeCloseTo(244.22, 1);
      } finally {
        // Restore original cache
        // @ts-ignore - Access private static property for testing
        EnhancedAADVCalculationService.factorsCache = originalCache;
      }
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
      expect(result.factorsUsed.dailyFactorsApplied).toBe(1); // Daily factors now applied in Case B
      expect(result.factorsUsed.monthlyFactorsApplied).toBeGreaterThan(0); // Should have 1 monthly factor
      
      // Using flat factors (H=24 for all hours):
      // Hour 12 (noon): count=10, H=24, p=1/24=0.0417
      // ADT = 10 / 0.0417 = 240
      // Apply daily factor (1.0) and monthly factor (1.0): 240 × 1.0 × 1.0 = 240 AADV
      expect(result.siteYear.aadv).toBe(240);
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
