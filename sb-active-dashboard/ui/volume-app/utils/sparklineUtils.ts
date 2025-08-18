import { type SiteData } from "../components/right-sidebar/SharedTimelineChart";

/**
 * Interface for confidence calculation results
 */
export interface ConfidenceData {
  totalSites: number;
  activeSites: number;
  contributionRatio: number;
  showLowConfidenceWarning: boolean;
}

/**
 * Calculate confidence data based on site contribution
 * Shows low confidence warning when < 50% of sites contribute data
 */
export function calculateConfidenceData(sites: SiteData[]): ConfidenceData {
  const totalSites = sites.length;
  const activeSites = sites.filter(site => site.dataPeriods && site.dataPeriods.length > 0).length;
  const contributionRatio = totalSites > 0 ? activeSites / totalSites : 0;
  const showLowConfidenceWarning = contributionRatio < 0.5 && totalSites > 0;

  return {
    totalSites,
    activeSites,
    contributionRatio,
    showLowConfidenceWarning
  };
}

/**
 * Format date range for sparkline display
 * Converts dates to "Aug 15, 2018 - Jul 16, 2025" format
 */
export function formatSparklineDateRange(startDate: Date, endDate: Date): string {
  const formatOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  const start = startDate.toLocaleDateString('en-US', formatOptions);
  const end = endDate.toLocaleDateString('en-US', formatOptions);
  
  return `${start} - ${end}`;
}

/**
 * Generate confidence message based on state
 */
export function getConfidenceMessage(
  isLoading: boolean,
  confidenceData: ConfidenceData,
  noSelectionMessage?: string
): string {
  if (isLoading) {
    return 'Loading count sites...';
  }
  
  if (confidenceData.totalSites === 0 && noSelectionMessage) {
    return noSelectionMessage;
  }
  
  if (confidenceData.showLowConfidenceWarning) {
    return `Low confidence - ${confidenceData.activeSites} out of ${confidenceData.totalSites} sites contributing data for given timeframe`;
  }
  
  return `${confidenceData.totalSites} count sites within selected region`;
}
