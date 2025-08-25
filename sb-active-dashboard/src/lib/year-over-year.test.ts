import { describe, it, expect } from 'vitest';
import { 
  SiteYear, 
  listYears, 
  sitesByYear, 
  overlapSites, 
  sharedSiteMean, 
  computeSharedSiteYoY 
} from './year-over-year';

describe('AADV (Average Annual Daily Volume) Calculation Functions', () => {
  // Test data representing site-year combinations with AADV values
  const mockSiteYearData: SiteYear[] = [
    // 2022 data
    { siteId: 'site1', year: 2022, aadv: 100 },
    { siteId: 'site2', year: 2022, aadv: 150 },
    { siteId: 'site3', year: 2022, aadv: 200 },
    
    // 2023 data (site1 and site2 overlap with 2022, site4 is new)
    { siteId: 'site1', year: 2023, aadv: 120 },
    { siteId: 'site2', year: 2023, aadv: 180 },
    { siteId: 'site4', year: 2023, aadv: 250 },
    
    // 2024 data (only site1 overlaps with previous years)
    { siteId: 'site1', year: 2024, aadv: 140 },
    { siteId: 'site5', year: 2024, aadv: 300 }
  ];

  describe('listYears', () => {
    it('should return unique years in ascending order', () => {
      const years = listYears(mockSiteYearData);
      expect(years).toEqual([2022, 2023, 2024]);
    });

    it('should handle empty data', () => {
      const years = listYears([]);
      expect(years).toEqual([]);
    });

    it('should handle single year', () => {
      const singleYearData: SiteYear[] = [
        { siteId: 'site1', year: 2023, aadv: 100 }
      ];
      const years = listYears(singleYearData);
      expect(years).toEqual([2023]);
    });

    it('should handle duplicate years', () => {
      const duplicateYearData: SiteYear[] = [
        { siteId: 'site1', year: 2023, aadv: 100 },
        { siteId: 'site2', year: 2023, aadv: 150 },
        { siteId: 'site3', year: 2022, aadv: 200 }
      ];
      const years = listYears(duplicateYearData);
      expect(years).toEqual([2022, 2023]);
    });
  });

  describe('sitesByYear', () => {
    it('should group sites by year correctly', () => {
      const sitesByYearMap = sitesByYear(mockSiteYearData);
      
      expect(sitesByYearMap.get(2022)).toEqual(new Set(['site1', 'site2', 'site3']));
      expect(sitesByYearMap.get(2023)).toEqual(new Set(['site1', 'site2', 'site4']));
      expect(sitesByYearMap.get(2024)).toEqual(new Set(['site1', 'site5']));
    });

    it('should handle empty data', () => {
      const sitesByYearMap = sitesByYear([]);
      expect(sitesByYearMap.size).toBe(0);
    });

    it('should handle single site across multiple years', () => {
      const singleSiteData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 100 },
        { siteId: 'site1', year: 2023, aadv: 120 }
      ];
      const sitesByYearMap = sitesByYear(singleSiteData);
      
      expect(sitesByYearMap.get(2022)).toEqual(new Set(['site1']));
      expect(sitesByYearMap.get(2023)).toEqual(new Set(['site1']));
    });
  });

  describe('overlapSites', () => {
    it('should correctly identify shared and unique sites between two years', () => {
      const overlap = overlapSites(mockSiteYearData, 2022, 2023);
      
      expect(overlap.sharedSites).toEqual(['site1', 'site2']);
      expect(overlap.onlyInY0).toEqual(['site3']); // only in 2022
      expect(overlap.onlyInY1).toEqual(['site4']); // only in 2023
      expect(overlap.sharedCount).toBe(2);
      expect(overlap.totalY0).toBe(3); // total sites in 2022
      expect(overlap.totalY1).toBe(3); // total sites in 2023
    });

    it('should handle years with no overlap', () => {
      const noOverlapData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 100 },
        { siteId: 'site2', year: 2023, aadv: 150 }
      ];
      const overlap = overlapSites(noOverlapData, 2022, 2023);
      
      expect(overlap.sharedSites).toEqual([]);
      expect(overlap.onlyInY0).toEqual(['site1']);
      expect(overlap.onlyInY1).toEqual(['site2']);
      expect(overlap.sharedCount).toBe(0);
    });

    it('should handle complete overlap', () => {
      const completeOverlapData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 100 },
        { siteId: 'site2', year: 2022, aadv: 150 },
        { siteId: 'site1', year: 2023, aadv: 120 },
        { siteId: 'site2', year: 2023, aadv: 180 }
      ];
      const overlap = overlapSites(completeOverlapData, 2022, 2023);
      
      expect(overlap.sharedSites).toEqual(['site1', 'site2']);
      expect(overlap.onlyInY0).toEqual([]);
      expect(overlap.onlyInY1).toEqual([]);
      expect(overlap.sharedCount).toBe(2);
    });

    it('should handle non-existent years', () => {
      const overlap = overlapSites(mockSiteYearData, 2020, 2021);
      
      expect(overlap.sharedSites).toEqual([]);
      expect(overlap.onlyInY0).toEqual([]);
      expect(overlap.onlyInY1).toEqual([]);
      expect(overlap.sharedCount).toBe(0);
      expect(overlap.totalY0).toBe(0);
      expect(overlap.totalY1).toBe(0);
    });
  });

  describe('sharedSiteMean', () => {
    it('should calculate correct mean AADV for shared sites', () => {
      const sharedSites = ['site1', 'site2'];
      
      // For 2022: site1=100, site2=150, mean = (100+150)/2 = 125
      const mean2022 = sharedSiteMean(mockSiteYearData, 2022, sharedSites);
      expect(mean2022).toBe(125);
      
      // For 2023: site1=120, site2=180, mean = (120+180)/2 = 150
      const mean2023 = sharedSiteMean(mockSiteYearData, 2023, sharedSites);
      expect(mean2023).toBe(150);
    });

    it('should return NaN when no shared sites exist for the year', () => {
      const sharedSites = ['site_nonexistent'];
      const mean = sharedSiteMean(mockSiteYearData, 2022, sharedSites);
      expect(mean).toBeNaN();
    });

    it('should handle single shared site', () => {
      const sharedSites = ['site1'];
      const mean = sharedSiteMean(mockSiteYearData, 2022, sharedSites);
      expect(mean).toBe(100); // site1's AADV in 2022
    });

    it('should handle empty shared sites array', () => {
      const mean = sharedSiteMean(mockSiteYearData, 2022, []);
      expect(mean).toBeNaN();
    });

    it('should handle zero AADV values correctly', () => {
      const zeroData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 0 },
        { siteId: 'site2', year: 2022, aadv: 100 }
      ];
      const mean = sharedSiteMean(zeroData, 2022, ['site1', 'site2']);
      expect(mean).toBe(50); // (0 + 100) / 2 = 50
    });
  });

  describe('computeSharedSiteYoY', () => {
    it('should calculate correct year-over-year percentage change', () => {
      const result = computeSharedSiteYoY(mockSiteYearData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.sharedCount).toBe(2);
      expect(result.sharedSites).toEqual(['site1', 'site2']);
      expect(result.mean0).toBe(125); // 2022 mean: (100+150)/2
      expect(result.mean1).toBe(150); // 2023 mean: (120+180)/2
      expect(result.yoy).toBeCloseTo(0.2, 5); // (150-125)/125 = 0.2 = 20% increase
      expect(result.totalY0).toBe(3);
      expect(result.totalY1).toBe(3);
    });

    it('should handle negative year-over-year change', () => {
      const declineData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 200 },
        { siteId: 'site2', year: 2022, aadv: 150 },
        { siteId: 'site1', year: 2023, aadv: 100 },
        { siteId: 'site2', year: 2023, aadv: 120 }
      ];
      
      const result = computeSharedSiteYoY(declineData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.mean0).toBe(175); // (200+150)/2
      expect(result.mean1).toBe(110); // (100+120)/2
      expect(result.yoy).toBeCloseTo(-0.371428571, 5); // (110-175)/175 ≈ -0.371 = -37.1% decrease
    });

    it('should handle case with single shared site', () => {
      const result = computeSharedSiteYoY(mockSiteYearData, 2023, 2024);
      
      expect(result.ok).toBe(true); // Should be true since there is 1 shared site with valid means
      expect(result.sharedCount).toBe(1); // only site1 is shared
      expect(result.yoy).toBeCloseTo(0.166666667, 5); // (140-120)/120 ≈ 0.167 = 16.7% increase
      expect(result.mean0).toBe(120); // site1 in 2023
      expect(result.mean1).toBe(140); // site1 in 2024
    });

    it('should return ok=false when no shared sites exist', () => {
      const noSharedSitesData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 100 },
        { siteId: 'site2', year: 2023, aadv: 150 }
      ];
      
      const result = computeSharedSiteYoY(noSharedSitesData, 2022, 2023);
      
      expect(result.ok).toBe(false);
      expect(result.sharedCount).toBe(0);
      expect(result.yoy).toBeNull();
      expect(result.mean0).toBeNaN(); // No shared sites means no mean
      expect(result.mean1).toBeNaN(); // No shared sites means no mean
    });

    it('should return ok=false when mean0 is zero', () => {
      const zeroMeanData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 0 },
        { siteId: 'site1', year: 2023, aadv: 100 }
      ];
      
      const result = computeSharedSiteYoY(zeroMeanData, 2022, 2023);
      
      expect(result.ok).toBe(false);
      expect(result.yoy).toBeNull();
      expect(result.mean0).toBe(0);
      expect(result.mean1).toBe(100);
    });

    it('should return ok=false when means are not finite', () => {
      const result = computeSharedSiteYoY([], 2022, 2023);
      
      expect(result.ok).toBe(false);
      expect(result.yoy).toBeNull();
      expect(result.sharedCount).toBe(0);
      expect(result.mean0).toBeNaN();
      expect(result.mean1).toBeNaN();
    });

    it('should handle identical means (no change)', () => {
      const noChangeData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 100 },
        { siteId: 'site2', year: 2022, aadv: 200 },
        { siteId: 'site1', year: 2023, aadv: 100 },
        { siteId: 'site2', year: 2023, aadv: 200 }
      ];
      
      const result = computeSharedSiteYoY(noChangeData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.yoy).toBe(0); // no change
      expect(result.mean0).toBe(150);
      expect(result.mean1).toBe(150);
    });

    it('should correctly identify sites only in each year', () => {
      const result = computeSharedSiteYoY(mockSiteYearData, 2022, 2023);
      
      expect(result.onlyInY0).toEqual(['site3']); // only in 2022
      expect(result.onlyInY1).toEqual(['site4']); // only in 2023
    });

    it('should handle edge case with very small AADV values', () => {
      const smallValueData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 0.1 },
        { siteId: 'site2', year: 2022, aadv: 0.2 },
        { siteId: 'site1', year: 2023, aadv: 0.15 },
        { siteId: 'site2', year: 2023, aadv: 0.25 }
      ];
      
      const result = computeSharedSiteYoY(smallValueData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.mean0).toBeCloseTo(0.15, 5); // (0.1+0.2)/2
      expect(result.mean1).toBeCloseTo(0.2, 5);  // (0.15+0.25)/2
      expect(result.yoy).toBeCloseTo(0.333333333, 5); // (0.2-0.15)/0.15
    });

    it('should handle large AADV values without precision loss', () => {
      const largeValueData: SiteYear[] = [
        { siteId: 'site1', year: 2022, aadv: 10000 },
        { siteId: 'site2', year: 2022, aadv: 20000 },
        { siteId: 'site1', year: 2023, aadv: 12000 },
        { siteId: 'site2', year: 2023, aadv: 24000 }
      ];
      
      const result = computeSharedSiteYoY(largeValueData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.mean0).toBe(15000); // (10000+20000)/2
      expect(result.mean1).toBe(18000); // (12000+24000)/2
      expect(result.yoy).toBeCloseTo(0.2, 5); // (18000-15000)/15000 = 0.2
    });
  });

  describe('Integration tests - Real-world scenarios', () => {
    it('should handle typical year-over-year comparison with mixed site availability', () => {
      const realisticData: SiteYear[] = [
        // 2022: 5 sites with varying volumes
        { siteId: 'downtown_1', year: 2022, aadv: 450 },
        { siteId: 'campus_2', year: 2022, aadv: 320 },
        { siteId: 'residential_3', year: 2022, aadv: 180 },
        { siteId: 'commercial_4', year: 2022, aadv: 280 },
        { siteId: 'park_5', year: 2022, aadv: 150 },
        
        // 2023: 4 sites (3 continuing, 1 new, 2 discontinued)
        { siteId: 'downtown_1', year: 2023, aadv: 480 }, // increased
        { siteId: 'campus_2', year: 2023, aadv: 300 },   // decreased
        { siteId: 'residential_3', year: 2023, aadv: 200 }, // increased
        { siteId: 'new_site_6', year: 2023, aadv: 350 }  // new site
        // commercial_4 and park_5 discontinued
      ];
      
      const result = computeSharedSiteYoY(realisticData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.sharedCount).toBe(3);
      expect(result.sharedSites).toEqual(['downtown_1', 'campus_2', 'residential_3']);
      
      // 2022 shared sites mean: (450 + 320 + 180) / 3 = 316.67
      expect(result.mean0).toBeCloseTo(316.666667, 5);
      
      // 2023 shared sites mean: (480 + 300 + 200) / 3 = 326.67
      expect(result.mean1).toBeCloseTo(326.666667, 5);
      
      // YoY change: (326.67 - 316.67) / 316.67 ≈ 0.0316 = 3.16% increase
      expect(result.yoy).toBeCloseTo(0.031578947, 5);
      
      expect(result.onlyInY0).toEqual(['commercial_4', 'park_5']);
      expect(result.onlyInY1).toEqual(['new_site_6']);
      expect(result.totalY0).toBe(5);
      expect(result.totalY1).toBe(4);
    });

    it('should handle seasonal data normalization scenario', () => {
      // Simulating normalized AADV values that account for seasonal variations
      const seasonalNormalizedData: SiteYear[] = [
        // Summer 2022 data (normalized to annual equivalent)
        { siteId: 'beach_path', year: 2022, aadv: 680 },
        { siteId: 'school_route', year: 2022, aadv: 420 },
        
        // Winter 2023 data (normalized to annual equivalent)
        { siteId: 'beach_path', year: 2023, aadv: 720 },
        { siteId: 'school_route', year: 2023, aadv: 380 }
      ];
      
      const result = computeSharedSiteYoY(seasonalNormalizedData, 2022, 2023);
      
      expect(result.ok).toBe(true);
      expect(result.sharedCount).toBe(2);
      
      // 2022 mean: (680 + 420) / 2 = 550
      expect(result.mean0).toBe(550);
      
      // 2023 mean: (720 + 380) / 2 = 550
      expect(result.mean1).toBe(550);
      
      // No change overall despite individual site variations
      expect(result.yoy).toBe(0);
    });
  });
});
