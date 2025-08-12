/**
 * Pure functions for ranking and sorting volume sites
 * Extracted for easy testing and reusability
 */

export interface SiteVolumeData {
  siteId: number;
  siteName: string;
  bikeAADT: number;
  pedAADT: number;
  totalAADT: number;
}

export interface RawSiteRecord {
  site_id: number;
  count_type: 'bike' | 'ped';
  all_aadt: number;
}

export interface SiteMetadata {
  id: number;
  name: string;
}

/**
 * Pure function to process AADT records and calculate site volumes
 * @param aadtRecords - Raw AADT records from ArcGIS layer
 * @param siteMetadata - Site metadata lookup (id -> {id, name})
 * @returns Array of processed site data with calculated totals
 */
export const calculateSiteVolumes = (
  aadtRecords: RawSiteRecord[],
  siteMetadata: Record<number, SiteMetadata>
): SiteVolumeData[] => {
  // Group AADT records by site ID
  const recordsBySite = aadtRecords.reduce((acc, record) => {
    const siteId = record.site_id;
    if (!acc[siteId]) {
      acc[siteId] = [];
    }
    acc[siteId].push(record);
    return acc;
  }, {} as Record<number, RawSiteRecord[]>);

  // Process each site's data
  return Object.entries(recordsBySite).map(([siteIdStr, records]) => {
    const siteId = parseInt(siteIdStr);
    const bikeAADT = records.find(r => r.count_type === 'bike')?.all_aadt || 0;
    const pedAADT = records.find(r => r.count_type === 'ped')?.all_aadt || 0;
    const metadata = siteMetadata[siteId];

    return {
      siteId,
      siteName: metadata?.name || `Site ${siteId}`,
      bikeAADT,
      pedAADT,
      totalAADT: bikeAADT + pedAADT,
    };
  });
};

/**
 * Pure function to rank sites by total volume and return top N
 * @param sites - Array of site volume data
 * @param limit - Maximum number of sites to return
 * @returns Top N sites ranked by totalAADT (highest first)
 */
export const rankSitesByVolume = (
  sites: SiteVolumeData[],
  limit: number
): SiteVolumeData[] => {
  return [...sites]  // Create a copy to avoid mutating the original array
    .sort((a, b) => b.totalAADT - a.totalAADT)
    .slice(0, limit);
};

/**
 * Combined function: process raw data and return top N ranked sites
 * @param aadtRecords - Raw AADT records from ArcGIS layer
 * @param siteMetadata - Site metadata lookup
 * @param limit - Maximum number of sites to return
 * @returns Top N sites ranked by volume
 */
export const processAndRankSites = (
  aadtRecords: RawSiteRecord[],
  siteMetadata: Record<number, SiteMetadata>,
  limit: number
): SiteVolumeData[] => {
  const sites = calculateSiteVolumes(aadtRecords, siteMetadata);
  return rankSitesByVolume(sites, limit);
};