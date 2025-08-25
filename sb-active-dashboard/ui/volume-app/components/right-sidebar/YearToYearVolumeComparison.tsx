'use client';
import Polygon from "@arcgis/core/geometry/Polygon";
import { useEffect, useState, useRef } from 'react';
import { YearToYearComparisonDataService } from '../../../../lib/data-services/YearToYearComparisonDataService';
import { SiteYear, listYears, computeSharedSiteYoY } from '../../../../src/lib/year-over-year';
import CollapseExpandIcon from './CollapseExpandIcon';
import SelectRegionPlaceholder from '../../../components/SelectRegionPlaceholder';
import { useVolumeAppStore } from '../../../../lib/stores/volume-app-state';

interface YearToYearVolumeComparisonProps {
  selectedGeometry?: Polygon | null;
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  dateRange: { startDate: Date; endDate: Date };
}

export default function YearToYearVolumeComparison({
  selectedGeometry = null,
  showBicyclist = true,
  showPedestrian = true,
  dateRange
}: YearToYearVolumeComparisonProps) {
  const { setHighlightedBinSites } = useVolumeAppStore();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced AADV calculation using both Santa Cruz and NBPD factors - always enabled
  const santaCruzProfileKey = 'SantaCruz_citywide_v1';
  const nbpdProfileKey = 'NBPD_PATH_moderate_2009';
  const useEnhancedExpansion = true;
  
  // Shared site YoY state
  const [siteYearData, setSiteYearData] = useState<SiteYear[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYearA, setSelectedYearA] = useState<number | null>(null);
  const [selectedYearB, setSelectedYearB] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Cleanup effect to clear highlights when component unmounts
  useEffect(() => {
    return () => {
      setHighlightedBinSites([]);
    };
  }, [setHighlightedBinSites]);

  // Load SiteYear data when dependencies change
  useEffect(() => {
    const loadSiteYearData = async () => {
      if (!selectedGeometry) {
        setSiteYearData([]);
        setAvailableYears([]);
        setSelectedYearA(null);
        setSelectedYearB(null);
        setComparisonResult(null);
        setHighlightedBinSites([]); // Clear map highlights
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get years from date range
        const startYear = dateRange.startDate.getFullYear();
        const endYear = dateRange.endDate.getFullYear();
        const years = [];
        for (let year = startYear; year <= endYear; year++) {
          years.push(year);
        }

        
        const data = await YearToYearComparisonDataService.getSiteYearData(
          selectedGeometry,
          years,
          showBicyclist,
          showPedestrian,
          useEnhancedExpansion ? nbpdProfileKey : undefined
        );

        
        setSiteYearData(data);
        const availYears = listYears(data);
        setAvailableYears(availYears);
        
        // Auto-select years if we have exactly 2
        if (availYears.length === 2) {
          setSelectedYearA(availYears[0]);
          setSelectedYearB(availYears[1]);
        } else if (availYears.length > 2) {
          // Select the two most recent years
          setSelectedYearA(availYears[availYears.length - 2]);
          setSelectedYearB(availYears[availYears.length - 1]);
        } else {
          setSelectedYearA(availYears[0] || null);
          setSelectedYearB(null);
        }
        
      } catch (err) {
        console.error('Error loading SiteYear data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setSiteYearData([]);
        setAvailableYears([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSiteYearData();
  }, [selectedGeometry, showBicyclist, showPedestrian, dateRange]);

  // Compute shared site YoY when years are selected
  useEffect(() => {
    const computeAndHighlight = async () => {
      if (selectedYearA && selectedYearB && siteYearData.length > 0) {
        const result = computeSharedSiteYoY(siteYearData, selectedYearA, selectedYearB);
        setComparisonResult(result);
        
        // Highlight shared sites on the map
        if (result.sharedCount > 0 && selectedGeometry) {
          try {
            // Get actual site names from database using site IDs, but filter by current geometry
            const siteIds = result.sharedSites.map(siteId => parseInt(siteId));
            const siteNameMap = await YearToYearComparisonDataService.getSiteNamesInGeometry(siteIds, selectedGeometry);
            const sharedSiteNames = siteIds
              .filter(id => siteNameMap.has(id)) // Only include sites that are actually in the geometry
              .map(id => siteNameMap.get(id) || `Site ${id}`);
            
            setHighlightedBinSites(sharedSiteNames);
          } catch (error) {
            console.error('Error getting site names for highlighting:', error);
            // Fallback: try the original method
            try {
              const siteIds = result.sharedSites.map(siteId => parseInt(siteId));
              const siteNameMap = await YearToYearComparisonDataService.getSiteNames(siteIds);
              const sharedSiteNames = siteIds.map(id => siteNameMap.get(id) || `Site ${id}`);
              setHighlightedBinSites(sharedSiteNames);
            } catch (fallbackError) {
              console.error('Fallback highlighting also failed:', fallbackError);
              const fallbackNames = result.sharedSites.map(siteId => `Site ${siteId}`);
              setHighlightedBinSites(fallbackNames);
            }
          }
        } else {
          setHighlightedBinSites([]);
        }
      } else {
        setComparisonResult(null);
        setHighlightedBinSites([]);
      }
    };

    computeAndHighlight();
  }, [selectedYearA, selectedYearB, siteYearData, setHighlightedBinSites]);

  // Check if a year pair has any shared sites
  const hasSharedSites = (yearA: number, yearB: number): boolean => {
    if (siteYearData.length === 0) return false;
    const result = computeSharedSiteYoY(siteYearData, yearA, yearB);
    return result.sharedCount > 0;
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    const percent = (value * 100);
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  // Handle Compare button click to re-highlight shared sites
  const handleCompareClick = async () => {
    if (comparisonResult && comparisonResult.sharedCount > 0 && selectedGeometry) {
      try {
        // Get actual site names from database using site IDs, but filter by current geometry
        const siteIds = comparisonResult.sharedSites.map((siteId: any) => parseInt(siteId));
        const siteNameMap = await YearToYearComparisonDataService.getSiteNamesInGeometry(siteIds, selectedGeometry);
        const sharedSiteNames = siteIds
          .filter((id: number) => siteNameMap.has(id)) // Only include sites that are actually in the geometry
          .map((id: number) => siteNameMap.get(id) || `Site ${id}`);
        
        setHighlightedBinSites(sharedSiteNames);
      } catch (error) {
        console.error('Error getting site names for re-highlighting:', error);
        // Fallback: try the original method
        try {
          const siteIds = comparisonResult.sharedSites.map((siteId: any) => parseInt(siteId));
          const siteNameMap = await YearToYearComparisonDataService.getSiteNames(siteIds);
          const sharedSiteNames = siteIds.map((id: number) => siteNameMap.get(id) || `Site ${id}`);
          setHighlightedBinSites(sharedSiteNames);
        } catch (fallbackError) {
          console.error('Fallback highlighting also failed:', fallbackError);
          const fallbackNames = comparisonResult.sharedSites.map((siteId: any) => `Site ${siteId}`);
          setHighlightedBinSites(fallbackNames);
        }
      }
    }
  };

  return (
    <div id="year-to-year-volume-comparison-container" className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div id="year-to-year-volume-comparison-header" className="flex justify-between items-center">
        <h3 id="year-to-year-volume-comparison-title" className="text-lg font-medium text-gray-900">Year to Year Volume Comparison</h3>
        <CollapseExpandIcon id="year-to-year-volume-comparison-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="year-to-year-volume-comparison-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[700px]'}`}>
        {!selectedGeometry && (
          <SelectRegionPlaceholder id="year-to-year-volume-comparison-no-selection" subtext="Use the polygon tool or click on a boundary to see the year-to-year comparison for that area" />
        )}
        {selectedGeometry && (
        <>
{/* Year Selection */}
        <div className="mt-4 space-y-3">
          <div className="text-sm text-gray-700 font-medium">
            Select two years to attempt comparison
            <br/>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1">
              <label htmlFor="yoy-year-select-a" className="text-sm text-gray-600">A:</label>
              <select
                id="yoy-year-select-a"
                className="rounded p-2 w-20 bg-white border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedYearA || ''}
                onChange={(e) => setSelectedYearA(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isLoading || availableYears.length === 0}
              >
                <option value="">Select Year A</option>
                {availableYears.map(year => (
                  <option 
                    key={year} 
                    value={year}
                    disabled={year === selectedYearB || (selectedYearB ? !hasSharedSites(year, selectedYearB) : false)}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-gray-400 text-sm">vs</div>

            <div className="flex items-center gap-1">
              <label htmlFor="yoy-year-select-b" className="text-sm text-gray-600">B:</label>
              <select
                id="yoy-year-select-b"
                className="rounded p-2 w-20 bg-white border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedYearB || ''}
                onChange={(e) => setSelectedYearB(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isLoading || availableYears.length === 0}
              >
                <option value="">Select Year B</option>
                {availableYears.map(year => (
                  <option 
                    key={year} 
                    value={year}
                    disabled={year === selectedYearA || (selectedYearA ? !hasSharedSites(selectedYearA, year) : false)}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="yoy-compare-button"
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedYearA && selectedYearB && comparisonResult?.sharedCount > 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedYearA || !selectedYearB || !comparisonResult || comparisonResult.sharedCount === 0}
              onClick={handleCompareClick}
            >
              Compare
            </button>
          </div>
        </div>

        {/* Site Statistics */}
        {selectedYearA && selectedYearB && comparisonResult && (
          <div id="yoy-panel-stats" className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-2">Site Analysis</div>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-blue-700">Shared Sites:</span> 
                <span className="font-medium ml-1">{comparisonResult.sharedCount} sites</span>
                <span className="text-xs text-green-600 ml-2">● Highlighted on map</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-blue-700">Total {selectedYearA}:</span> 
                  <span className="font-medium ml-1">{comparisonResult.totalY0} sites</span>
                </div>
                <div>
                  <span className="text-blue-700">Total {selectedYearB}:</span> 
                  <span className="font-medium ml-1">{comparisonResult.totalY1} sites</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YoY Comparison Chart */}
        {selectedYearA && selectedYearB && comparisonResult && comparisonResult.sharedCount > 0 && (
          <div className="mt-4">
            {comparisonResult.ok && comparisonResult.yoy !== null ? (
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="text-lg font-bold text-gray-900 mb-4">
                  Year-over-Year Change: {formatPercent(comparisonResult.yoy)}
                </div>
                
                {/* Simple Bar Chart */}
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-2">Average Annual Daily Volume (AADV) (Based on {comparisonResult.sharedCount} shared sites)</div>
                  
                  {/* Earlier Year Bar */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 text-sm font-medium text-gray-700">{selectedYearA}</div>
                    <div className="flex-1 relative">
                      <div 
                        className="bg-blue-500 h-8 rounded flex items-center justify-end pr-2 text-white text-sm font-medium"
                        style={{ width: `${Math.max(20, (comparisonResult.mean0 / Math.max(comparisonResult.mean0, comparisonResult.mean1)) * 100)}%` }}
                      >
                        {comparisonResult.mean0.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Later Year Bar */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 text-sm font-medium text-gray-700">{selectedYearB}</div>
                    <div className="flex-1 relative">
                      <div 
                        className={`h-8 rounded flex items-center justify-end pr-2 text-white text-sm font-medium ${
                          comparisonResult.mean1 > comparisonResult.mean0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(20, (comparisonResult.mean1 / Math.max(comparisonResult.mean0, comparisonResult.mean1)) * 100)}%` }}
                      >
                        {comparisonResult.mean1.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Change Indicator */}
                <div className={`mt-3 text-sm font-medium ${
                  comparisonResult.yoy > 0 ? 'text-green-700' : comparisonResult.yoy < 0 ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {comparisonResult.yoy > 0 ? '↗' : comparisonResult.yoy < 0 ? '↘' : '→'} 
                  {comparisonResult.yoy > 0 ? ' Increase ' : comparisonResult.yoy < 0 ? ' Decrease ' : 'No Change'} 
                  of {Math.abs(comparisonResult.yoy * 100).toFixed(1)}%
                </div>
              </div>
            ) : (
              <div id="yoy-warning" className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-900 mb-2">⚠️ Cannot Calculate Comparison</div>
                <div className="text-sm text-yellow-700">
                  Unable to compute valid averages for the shared sites. This may be due to missing or invalid data.
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* No Shared Sites Warning */}
        {selectedYearA && selectedYearB && comparisonResult && comparisonResult.sharedCount === 0 && (
          <div id="yoy-warning" className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm font-medium text-yellow-900 mb-2">⚠️ No Shared Sites</div>
            <div className="text-sm text-yellow-700">
              No count sites exist in both {selectedYearA} and {selectedYearB}. Cannot perform year-to-year comparison.
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-4 flex justify-center items-center py-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <span className="text-sm text-gray-700 font-medium">Loading site data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}