import type React from "react";
import { useState } from "react";
import SharedTimelineChart, { type SiteData } from "../right-sidebar/SharedTimelineChart";

interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface ConfidenceData {
  confidence: ConfidenceLevel;
  contributingSites: number;
  totalSites: number;
}

interface CompletenessMetricsProps {
  horizontalMargins: string;
  timelineData: SiteData[];
  confidenceData: ConfidenceData | null;
  selectedAreaName: string | null;
  dateRange: { startDate: Date; endDate: Date };
  isLoading: boolean;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
}

export default function CompletenessMetrics({ 
  horizontalMargins, 
  timelineData, 
  confidenceData, 
  selectedAreaName, 
  dateRange, 
  isLoading,
  selectedSiteId,
  onSiteSelect
}: CompletenessMetricsProps) {
  const [isConfidenceExpanded, setIsConfidenceExpanded] = useState(true);

  // Use real data from props, fallback to empty if no data
  const sitesData = timelineData || [];
  const confidenceLevel = confidenceData?.confidence?.level || 'low';
  
  // Use timeline data as source of truth for site counts to ensure sync
  const totalSites = sitesData.length;
  const activeSites = sitesData.filter(site => site.dataPeriods && site.dataPeriods.length > 0).length;
  
  // Calculate confidence percentage based on active sites
  const confidencePercentage = totalSites > 0 ? Math.round((activeSites / totalSites) * 100) : 0;

  return (
    <div id="data-completeness-container" className="w-[calc(100%-2rem)] bg-white border border-gray-200 rounded-md overflow-hidden mx-4">
      {/* Zone Locator Container */}
      <div id="zone-locator-container" className="bg-white">
        <div className={`py-4 ${horizontalMargins}`}>
          <h3 id="zone-locator-title" className="text-lg font-medium text-gray-800 leading-normal">
            {selectedAreaName || "Select an area"}
          </h3>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Data Completeness Section */}
      <div id="data-completeness-section" className="bg-white">
        <div className={`py-2 space-y-1.5 ${horizontalMargins}`}>
          <h4 id="data-completeness-title" className="text-sm font-medium text-gray-700">
            Data Completeness
          </h4>
          
          {/* Progress Bar */}
          <div id="data-completeness-progress-container" className="flex items-center justify-between">
            <div id="data-completeness-progress-bar" className="bg-gray-200 h-4 rounded-full flex-1 mr-4">
              <div 
                id="data-completeness-progress-fill"
                className={`h-4 rounded-full ${
                  confidenceLevel === 'high' ? 'bg-green-400' : 
                  confidenceLevel === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${confidencePercentage}%` }}
              />
            </div>
            <span id="data-completeness-percentage" className="text-sm font-medium text-black">{confidencePercentage}%</span>
          </div>
          
          <p id="data-completeness-confidence" className="text-xs text-gray-500">
            {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} confidence level
          </p>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Data Breakdown Section */}
      <div id="data-breakdown-section" className="bg-white">
        <div className={`py-2 space-y-2 ${horizontalMargins}`}>
          <h4 id="data-breakdown-title" className="text-sm font-medium text-gray-700">
            Data Breakdown
          </h4>
          
          {/* Freshness */}
          <div id="freshness-metric" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black">Freshness</span>
              <span className="text-xs font-medium text-black">72%</span>
            </div>
            <p className="text-xs text-gray-500">Avg. last data upload: April 2024</p>
          </div>
          
          {/* Spatial Density */}
          <div id="spatial-density-metric" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black">Spatial Density</span>
              <span className="text-xs font-medium text-black">{Math.round((activeSites / Math.max(totalSites, 1)) * 100)}%</span>
            </div>
            <p className="text-xs text-gray-500">{totalSites} count site{totalSites !== 1 ? 's' : ''} in this zone</p>
          </div>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Stale Count Sites Section - Only show if there are sites with limited data */}
      {sitesData.length > 0 && (activeSites < totalSites) && (
        <div id="stale-count-sites-section" className="bg-white">
          <div className={`py-2 space-y-1.5 ${horizontalMargins}`}>
            <h4 id="stale-count-sites-title" className="text-sm font-medium text-gray-700">
              Limited Data Sites
            </h4>
            
            <div id="stale-sites-list" className="space-y-1">
              {sitesData
                .filter(site => !site.dataPeriods || site.dataPeriods.length === 0)
                .slice(0, 3) // Show max 3 for space
                .map((site) => (
                  <div key={site.id} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.05078 2.05078L1.12109 1.12109C0.708203 0.708203 0 1.00078 0 1.5832V4.59375C0 4.95742 0.292578 5.25 0.65625 5.25H3.6668C4.25195 5.25 4.54453 4.5418 4.13164 4.12891L3.28945 3.28672C4.23828 2.33789 5.55078 1.75 7 1.75C9.89844 1.75 12.25 4.10156 12.25 7C12.25 9.89844 9.89844 12.25 7 12.25C5.88438 12.25 4.85078 11.9027 4.00039 11.3094C3.60391 11.0332 3.05977 11.1289 2.78086 11.5254C2.50195 11.9219 2.60039 12.466 2.99688 12.7449C4.13438 13.5352 5.51523 14 7 14C10.8664 14 14 10.8664 14 7C14 3.13359 10.8664 0 7 0C5.0668 0 3.3168 0.784766 2.05078 2.05078ZM7 3.5C6.63633 3.5 6.34375 3.79258 6.34375 4.15625V7C6.34375 7.175 6.41211 7.3418 6.53516 7.46484L8.50391 9.43359C8.76094 9.69063 9.17656 9.69063 9.43086 9.43359C9.68516 9.17656 9.68789 8.76094 9.43086 8.50664L7.65352 6.7293V4.15625C7.65352 3.79258 7.36094 3.5 6.99727 3.5H7Z" fill="#F59E0B"/>
                      </svg>
                    </div>
                    <span className="text-sm text-black">{site.name} (Limited data available)</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Confidence Warning with Timeline - Always show but with different styling */}
      <div 
        id="confidence-warning-section" 
        className={`border-t border-b rounded-t-md overflow-hidden ${
          totalSites > 0 ? (
            confidenceLevel === 'high' ? 'bg-green-50 border-green-200' : 
            confidenceLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          ) : 'bg-gray-50 border-gray-200'
        }`}
      >
          <div 
            id="confidence-warning-header"
            className="px-3 py-2 cursor-pointer flex items-center justify-between hover:opacity-80 transition-opacity"
            onClick={() => setIsConfidenceExpanded(!isConfidenceExpanded)}
          >
            <div className="flex items-center gap-2">
              <div id="warning-icon" className="w-4 h-4 flex-shrink-0">
                <svg 
                  viewBox="0 0 16 16" 
                  className={`w-full h-full ${
                    totalSites > 0 ? (
                      confidenceLevel === 'high' ? 'text-green-600' : 
                      confidenceLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    ) : 'text-gray-500'
                  }`}
                >
                  <path
                    fill="currentColor"
                    d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
                  />
                </svg>
              </div>
              <p className={`text-xs leading-tight font-medium ${
                totalSites > 0 ? (
                  confidenceLevel === 'high' ? 'text-green-800' : 
                  confidenceLevel === 'medium' ? 'text-yellow-800' : 'text-red-800'
                ) : 'text-gray-700'
              }`}>
                {totalSites > 0 
                  ? `${confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} confidence - ${activeSites} out of ${totalSites} sites contributing data for given timeframe`
                  : `${totalSites} count sites within selected region`
                }
              </p>
            </div>
            <div id="expand-icon" className={`transform transition-transform ${isConfidenceExpanded ? 'rotate-180' : ''}`}>
              <svg 
                className={`w-3.5 h-2 ${
                  totalSites > 0 ? (
                    confidenceLevel === 'high' ? 'text-green-600' : 
                    confidenceLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  ) : 'text-gray-500'
                }`} 
                viewBox="0 0 14 8"
              >
                <path
                  fill="currentColor"
                  d="M7 8L0 1l1.41-1.41L7 5.17l5.59-5.58L14 1 7 8z"
                />
              </svg>
            </div>
          </div>

          {/* Timeline Sparkline */}
          <div className={`transition-all duration-300 ease-in-out ${isConfidenceExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div id="timeline-sparkline-section" className="bg-white border-t border-gray-200 p-4">
              <div className="text-center mb-4">
                <h3 className="text-sm font-medium text-gray-600">Timeline of available data per site</h3>
                <p className="text-xs text-gray-500 mt-1">
                  ({dateRange.startDate.toLocaleDateString()} – {dateRange.endDate.toLocaleDateString()})
                </p>
              </div>
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500">Loading timeline data...</div>
                </div>
              ) : sitesData.length > 0 ? (
                <div 
                  className="max-h-60 overflow-y-auto overflow-x-hidden border border-gray-200 rounded-md p-3"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d1d5db transparent'
                  }}
                >
                  <SharedTimelineChart
                    sites={sitesData}
                    years={[dateRange.startDate.getFullYear(), dateRange.endDate.getFullYear()]}
                    variant="compact"
                    idPrefix="data-completeness-timeline"
                    selectedSiteId={selectedSiteId}
                    onSiteSelect={onSiteSelect}
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500">No data available for selected area</div>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Total Data Collected Section */}
      {sitesData.length > 0 && (
        <div id="total-data-collected-section" className="bg-white">
          <div className={`py-2 space-y-1.5 ${horizontalMargins}`}>
            <h4 id="total-data-title" className="text-sm font-medium text-gray-700">
              Data Collection Summary
            </h4>
            <div id="total-data-card" className="bg-gray-50 rounded-md p-3">
              <div className="text-2xl font-medium text-black">{activeSites}</div>
              <div className="text-xs text-gray-500">
                Active sites contributing data in selected timeframe
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 