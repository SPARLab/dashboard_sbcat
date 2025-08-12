import { describe, it, expect } from 'vitest';
import {
  calculateSiteVolumes,
  rankSitesByVolume,
  processAndRankSites,
  type RawSiteRecord,
  type SiteMetadata,
  type SiteVolumeData
} from './site-ranking';

describe('Site Ranking Utils - Pure Functions', () => {
  
  describe('calculateSiteVolumes', () => {
    it('should correctly calculate bike + ped totals for each site', () => {
      const aadtRecords: RawSiteRecord[] = [
        { site_id: 1, count_type: 'bike', all_aadt: 100 },
        { site_id: 1, count_type: 'ped', all_aadt: 50 },
        { site_id: 2, count_type: 'bike', all_aadt: 200 },
        { site_id: 2, count_type: 'ped', all_aadt: 75 },
      ];

      const siteMetadata: Record<number, SiteMetadata> = {
        1: { id: 1, name: 'Downtown Hub' },
        2: { id: 2, name: 'University Ave' }
      };

      const result = calculateSiteVolumes(aadtRecords, siteMetadata);

      expect(result).toHaveLength(2);
      
      const site1 = result.find(s => s.siteId === 1)!;
      expect(site1.bikeAADT).toBe(100);
      expect(site1.pedAADT).toBe(50);
      expect(site1.totalAADT).toBe(150);
      expect(site1.siteName).toBe('Downtown Hub');

      const site2 = result.find(s => s.siteId === 2)!;
      expect(site2.bikeAADT).toBe(200);
      expect(site2.pedAADT).toBe(75);
      expect(site2.totalAADT).toBe(275);
      expect(site2.siteName).toBe('University Ave');
    });

    it('should handle missing bike or ped data (defaults to 0)', () => {
      const aadtRecords: RawSiteRecord[] = [
        { site_id: 1, count_type: 'bike', all_aadt: 150 },
        // No pedestrian data for site 1
        { site_id: 2, count_type: 'ped', all_aadt: 80 },
        // No bike data for site 2
      ];

      const siteMetadata: Record<number, SiteMetadata> = {
        1: { id: 1, name: 'Bike Only Site' },
        2: { id: 2, name: 'Ped Only Site' }
      };

      const result = calculateSiteVolumes(aadtRecords, siteMetadata);

      const site1 = result.find(s => s.siteId === 1)!;
      expect(site1.bikeAADT).toBe(150);
      expect(site1.pedAADT).toBe(0);
      expect(site1.totalAADT).toBe(150);

      const site2 = result.find(s => s.siteId === 2)!;
      expect(site2.bikeAADT).toBe(0);
      expect(site2.pedAADT).toBe(80);
      expect(site2.totalAADT).toBe(80);
    });

    it('should handle missing site metadata (uses default name)', () => {
      const aadtRecords: RawSiteRecord[] = [
        { site_id: 999, count_type: 'bike', all_aadt: 100 },
      ];

      const siteMetadata: Record<number, SiteMetadata> = {}; // Empty metadata

      const result = calculateSiteVolumes(aadtRecords, siteMetadata);

      expect(result[0].siteName).toBe('Site 999');
    });

    it('should handle fractional AADT values', () => {
      const aadtRecords: RawSiteRecord[] = [
        { site_id: 1, count_type: 'bike', all_aadt: 12.5 },
        { site_id: 1, count_type: 'ped', all_aadt: 7.3 },
      ];

      const siteMetadata: Record<number, SiteMetadata> = {
        1: { id: 1, name: 'Low Volume Site' }
      };

      const result = calculateSiteVolumes(aadtRecords, siteMetadata);

      expect(result[0].bikeAADT).toBe(12.5);
      expect(result[0].pedAADT).toBe(7.3);
      expect(result[0].totalAADT).toBe(19.8);
    });
  });

  describe('rankSitesByVolume', () => {
    it('should return top 5 sites from 12 sites by totalAADT', () => {
      // Create 12 sites with known rankings
      const sites: SiteVolumeData[] = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2, siteName: 'Site B', bikeAADT: 200, pedAADT: 100, totalAADT: 300 }, // #1
        { siteId: 3, siteName: 'Site C', bikeAADT: 80, pedAADT: 40, totalAADT: 120 },
        { siteId: 4, siteName: 'Site D', bikeAADT: 150, pedAADT: 100, totalAADT: 250 }, // #2
        { siteId: 5, siteName: 'Site E', bikeAADT: 90, pedAADT: 60, totalAADT: 150 },
        { siteId: 6, siteName: 'Site F', bikeAADT: 110, pedAADT: 70, totalAADT: 180 }, // #4
        { siteId: 7, siteName: 'Site G', bikeAADT: 130, pedAADT: 90, totalAADT: 220 }, // #3
        { siteId: 8, siteName: 'Site H', bikeAADT: 70, pedAADT: 50, totalAADT: 120 },
        { siteId: 9, siteName: 'Site I', bikeAADT: 95, pedAADT: 65, totalAADT: 160 }, // #5
        { siteId: 10, siteName: 'Site J', bikeAADT: 60, pedAADT: 40, totalAADT: 100 },
        { siteId: 11, siteName: 'Site K', bikeAADT: 85, pedAADT: 55, totalAADT: 140 },
        { siteId: 12, siteName: 'Site L', bikeAADT: 75, pedAADT: 45, totalAADT: 120 },
      ];

      const result = rankSitesByVolume(sites, 5);

      expect(result).toHaveLength(5);
      
      // Verify correct ranking (highest to lowest)
      expect(result[0].siteId).toBe(2); // 300 total
      expect(result[0].totalAADT).toBe(300);
      
      expect(result[1].siteId).toBe(4); // 250 total
      expect(result[1].totalAADT).toBe(250);
      
      expect(result[2].siteId).toBe(7); // 220 total
      expect(result[2].totalAADT).toBe(220);
      
      expect(result[3].siteId).toBe(6); // 180 total
      expect(result[3].totalAADT).toBe(180);
      
      expect(result[4].siteId).toBe(9); // 160 total
      expect(result[4].totalAADT).toBe(160);
    });

    it('should handle ties in totalAADT consistently', () => {
      const sites: SiteVolumeData[] = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2, siteName: 'Site B', bikeAADT: 90, pedAADT: 60, totalAADT: 150 }, // Same total
        { siteId: 3, siteName: 'Site C', bikeAADT: 200, pedAADT: 100, totalAADT: 300 },
      ];

      const result = rankSitesByVolume(sites, 3);

      expect(result).toHaveLength(3);
      expect(result[0].totalAADT).toBe(300); // Highest
      expect(result[1].totalAADT).toBe(150); // First tied site
      expect(result[2].totalAADT).toBe(150); // Second tied site
    });

    it('should return all sites when limit exceeds array length', () => {
      const sites: SiteVolumeData[] = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2, siteName: 'Site B', bikeAADT: 200, pedAADT: 100, totalAADT: 300 },
      ];

      const result = rankSitesByVolume(sites, 10); // Limit > array length

      expect(result).toHaveLength(2);
      expect(result[0].siteId).toBe(2); // Still sorted correctly
      expect(result[1].siteId).toBe(1);
    });

    it('should handle empty array', () => {
      const result = rankSitesByVolume([], 5);
      expect(result).toEqual([]);
    });

    it('should handle zero limit', () => {
      const sites: SiteVolumeData[] = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
      ];

      const result = rankSitesByVolume(sites, 0);
      expect(result).toEqual([]);
    });

    it('should not modify the original array', () => {
      const sites: SiteVolumeData[] = [
        { siteId: 1, siteName: 'Site A', bikeAADT: 100, pedAADT: 50, totalAADT: 150 },
        { siteId: 2, siteName: 'Site B', bikeAADT: 200, pedAADT: 100, totalAADT: 300 },
      ];

      const originalOrder = [...sites];
      rankSitesByVolume(sites, 2);

      // Original array should be unchanged
      expect(sites).toEqual(originalOrder);
    });
  });

  describe('processAndRankSites - Integration', () => {
    it('should process raw data and return top 3 ranked sites', () => {
      const aadtRecords: RawSiteRecord[] = [
        { site_id: 1, count_type: 'bike', all_aadt: 100 },
        { site_id: 1, count_type: 'ped', all_aadt: 50 },   // Total: 150
        { site_id: 2, count_type: 'bike', all_aadt: 200 },
        { site_id: 2, count_type: 'ped', all_aadt: 100 },  // Total: 300 (should be #1)
        { site_id: 3, count_type: 'bike', all_aadt: 150 },
        { site_id: 3, count_type: 'ped', all_aadt: 75 },   // Total: 225 (should be #2)
        { site_id: 4, count_type: 'bike', all_aadt: 80 },
        { site_id: 4, count_type: 'ped', all_aadt: 40 },   // Total: 120
        { site_id: 5, count_type: 'bike', all_aadt: 120 },
        { site_id: 5, count_type: 'ped', all_aadt: 60 },   // Total: 180 (should be #3)
      ];

      const siteMetadata: Record<number, SiteMetadata> = {
        1: { id: 1, name: 'Downtown' },
        2: { id: 2, name: 'University' },
        3: { id: 3, name: 'Beach' },
        4: { id: 4, name: 'Residential' },
        5: { id: 5, name: 'Shopping' }
      };

      const result = processAndRankSites(aadtRecords, siteMetadata, 3);

      expect(result).toHaveLength(3);
      
      // Verify correct ranking
      expect(result[0].siteId).toBe(2);
      expect(result[0].siteName).toBe('University');
      expect(result[0].totalAADT).toBe(300);
      
      expect(result[1].siteId).toBe(3);
      expect(result[1].siteName).toBe('Beach');
      expect(result[1].totalAADT).toBe(225);
      
      expect(result[2].siteId).toBe(5);
      expect(result[2].siteName).toBe('Shopping');
      expect(result[2].totalAADT).toBe(180);
    });

    it('should handle real-world scenario with 12 sites returning top 5', () => {
      // Simulate 12 count sites with realistic AADT values
      const aadtRecords: RawSiteRecord[] = [];
      const expectedRanking = [
        { siteId: 7, total: 450 }, // University Campus
        { siteId: 3, total: 420 }, // Beach Boardwalk  
        { siteId: 1, total: 380 }, // Downtown Transit
        { siteId: 9, total: 350 }, // Shopping District
        { siteId: 5, total: 320 }, // City Center
      ];

      // Generate AADT records for 12 sites
      const siteData = [
        { id: 1, bike: 250, ped: 130, name: 'Downtown Transit' },
        { id: 2, bike: 120, ped: 80, name: 'Residential North' },
        { id: 3, bike: 300, ped: 120, name: 'Beach Boardwalk' },
        { id: 4, bike: 90, ped: 60, name: 'Suburban Mall' },
        { id: 5, bike: 200, ped: 120, name: 'City Center' },
        { id: 6, bike: 80, ped: 40, name: 'Industrial Area' },
        { id: 7, bike: 320, ped: 130, name: 'University Campus' },
        { id: 8, bike: 110, ped: 70, name: 'Park Entrance' },
        { id: 9, bike: 220, ped: 130, name: 'Shopping District' },
        { id: 10, bike: 95, ped: 55, name: 'Office Complex' },
        { id: 11, bike: 140, ped: 90, name: 'Train Station' },
        { id: 12, bike: 160, ped: 100, name: 'Airport Road' },
      ];

      siteData.forEach(site => {
        aadtRecords.push(
          { site_id: site.id, count_type: 'bike', all_aadt: site.bike },
          { site_id: site.id, count_type: 'ped', all_aadt: site.ped }
        );
      });

      const siteMetadata: Record<number, SiteMetadata> = siteData.reduce((acc, site) => {
        acc[site.id] = { id: site.id, name: site.name };
        return acc;
      }, {} as Record<number, SiteMetadata>);

      const result = processAndRankSites(aadtRecords, siteMetadata, 5);

      expect(result).toHaveLength(5);
      
      // Verify the top 5 sites are returned in correct order
      expect(result[0].siteId).toBe(7); // University Campus (450)
      expect(result[0].totalAADT).toBe(450);
      
      expect(result[1].siteId).toBe(3); // Beach Boardwalk (420)
      expect(result[1].totalAADT).toBe(420);
      
      expect(result[2].siteId).toBe(1); // Downtown Transit (380)
      expect(result[2].totalAADT).toBe(380);
      
      expect(result[3].siteId).toBe(9); // Shopping District (350)
      expect(result[3].totalAADT).toBe(350);
      
      expect(result[4].siteId).toBe(5); // City Center (320)
      expect(result[4].totalAADT).toBe(320);
    });
  });
});