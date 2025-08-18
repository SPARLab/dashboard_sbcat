import { useState } from "react";
import SharedTimelineChart, { type SiteData } from "../right-sidebar/SharedTimelineChart";
import SelectRegionPlaceholder from "../../../components/SelectRegionPlaceholder";

interface CompletenessMetricsProps {
  horizontalMargins: string;
  timelineData: SiteData[];
  selectedAreaName: string | null;
  dateRange: { startDate: Date; endDate: Date };
  isLoading: boolean;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
}

export default function CompletenessMetrics({ 
  horizontalMargins, 
  timelineData, 
  selectedAreaName, 
  dateRange, 
  isLoading,
  selectedSiteId,
  onSiteSelect
}: CompletenessMetricsProps) {
  const [isConfidenceExpanded, setIsConfidenceExpanded] = useState(true);

  // Use real data from props, fallback to empty if no data
  const sitesData = timelineData || [];
  
  // Use timeline data as source of truth for site counts to ensure sync
  const totalSites = sitesData.length;
  const activeSites = sitesData.filter(site => site.dataPeriods && site.dataPeriods.length > 0).length;
  
  // Calculate if we should show low confidence warning (less than 50% of sites contributing)
  const contributionRatio = totalSites > 0 ? activeSites / totalSites : 0;
  const showLowConfidenceWarning = contributionRatio < 0.5 && totalSites > 0;

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

      {/* Show SelectRegionPlaceholder when no geometry is selected */}
      {!selectedAreaName && (
        <div className={`py-4 ${horizontalMargins}`}>
          <SelectRegionPlaceholder 
            id="data-completeness-no-selection" 
            subtext="Use the polygon tool or click on a boundary to see the year-to-year comparison for that area" 
          />
        </div>
      )}

      {/* Show content when area is selected */}
      {selectedAreaName && (
        <>



          {/* Data Breakdown Section */}
          <div id="data-breakdown-section" className="bg-white border-non">
            <div className={`py-2 space-y-2 my-1 ${horizontalMargins}`}>
              {/* <h4 id="data-breakdown-title" className="text-sm font-medium text-gray-700">
                Data Breakdown
              </h4> */}
              
              {/* Last Count Date */}
              <div id="last-count-date-metric" className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">Last Count Date</span>
                  <span className="text-xs font-medium text-black">April 15, 2024</span>
                </div>
              </div>
            </div>
          </div>



             {/* Timeline Sparkline - Always show, with optional low confidence warning */}
       <div 
         id="confidence-warning-section" 
         className={`border-t border-b border-gray-200 rounded-t-md overflow-hidden py-1 ${
           showLowConfidenceWarning ? 'bg-red-50' : 'bg-gray-50'
         }`}
       >
           <div 
             id="confidence-warning-header"
             className="px-3 py-3 cursor-pointer flex items-center justify-between hover:opacity-80 transition-opacity"
             onClick={() => setIsConfidenceExpanded(!isConfidenceExpanded)}
           >
             <div className="flex items-center gap-2">
               {showLowConfidenceWarning && (
                 <div id="warning-icon" className="w-4 h-4 flex-shrink-0">
                   <svg 
                     viewBox="0 0 16 16" 
                     className="w-full h-full text-red-600"
                   >
                     <path
                       fill="currentColor"
                       d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
                     />
                   </svg>
                 </div>
               )}
               <p className={`text-sm leading-tight font-medium ${
                 showLowConfidenceWarning ? 'text-red-800' : 'text-gray-700'
               }`}>
                 {isLoading 
                   ? 'Loading count sites...'
                   : showLowConfidenceWarning 
                     ? `Low confidence - ${activeSites} out of ${totalSites} sites contributing data for given timeframe`
                     : `${totalSites} count sites within selected region`
                 }
               </p>
             </div>
             <div id="expand-icon" className={`transform transition-transform ${isConfidenceExpanded ? 'rotate-180' : ''}`}>
               <svg 
                 className={`w-3.5 h-2 ${
                   showLowConfidenceWarning ? 'text-red-600' : 'text-gray-500'
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
                  ({dateRange.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} – {dateRange.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})
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
        </>
      )}
    </div>
  );
} 