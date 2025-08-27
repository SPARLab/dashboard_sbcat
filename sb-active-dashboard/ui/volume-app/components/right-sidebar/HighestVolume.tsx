import React, { useState, useEffect } from "react";
import InfoTooltipIcon from "./MoreInformationIcon";
import CollapseExpandIcon from "./CollapseExpandIcon";
import { VolumeChartDataService } from "../../../../lib/data-services/VolumeChartDataService";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import SelectRegionPlaceholder from "../../../components/SelectRegionPlaceholder";

interface HighestVolumeProps {
  mapView?: __esri.MapView | null;
  sitesLayer?: FeatureLayer | null;
  countsLayer?: FeatureLayer | null;
  aadtTable?: FeatureLayer | null;
  dateRange: { startDate: Date; endDate: Date };
  showBicyclist?: boolean;
  showPedestrian?: boolean;
  selectedGeometry?: Polygon | null;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null) => void;
}

interface HighestVolumeSite {
  siteId: number;
  siteName: string;
  bikeAADV: number;
  pedAADV: number;
  totalAADV: number;
}

export default function HighestVolume({
  mapView,
  sitesLayer,
  countsLayer,
  aadtTable,
  dateRange,
  showBicyclist = true,
  showPedestrian = true,
  selectedGeometry,
  selectedSiteId,
  onSiteSelect
}: HighestVolumeProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sites, setSites] = useState<HighestVolumeSite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Fetch highest volume data
    useEffect(() => {
        if (!mapView || !sitesLayer || !aadtTable || !selectedGeometry) {
            setSites([]);
            return;
        }

        const fetchHighestVolumeData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const volumeService = new VolumeChartDataService(sitesLayer, countsLayer as FeatureLayer, aadtTable);
                const filters = {
                    showBicyclist,
                    showPedestrian,
                };
                
                const result = await volumeService.getHighestVolumeData(
                    mapView,
                    filters,
                    dateRange,
                    5, // limit to top 5
                    selectedGeometry
                );
                
                setSites(result.sites || []);
            } catch (err) {
                console.error('Error fetching highest volume data:', err);
                setError('Failed to load highest volume data');
                setSites([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHighestVolumeData();
    }, [mapView, sitesLayer, countsLayer, aadtTable, dateRange, showBicyclist, showPedestrian, selectedGeometry]);

  return (
    <div
      className="bg-white border border-gray-200 rounded-md p-4"
      id="highest-volume-container"
    >
      <div id="highest-volume-header" className={`transition-all duration-400 ease-in-out flex justify-between items-center ${!isCollapsed ? "mb-4" : ""}`}>
        <div id="highest-volume-title-container" className="flex items-center gap-1">
            <h3 id="highest-volume-title" className="text-lg font-medium text-gray-700">
              Highest Volume Areas
            </h3>
            <InfoTooltipIcon 
              text="Shows the areas with the highest pedestrian and cyclist volumes within your selected region, helping identify the most active locations for active transportation."
              yOffset="0.3rem"
              width="w-64"
              iconSize="w-4 h-4"
            />
        </div>
        <CollapseExpandIcon id="highest-volume-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="highest-volume-collapsible-content" data-testid="highest-volume-collapsible-content" className={`transition-all duration-400 ease-in-out overflow-y-hidden ${isCollapsed ? 'max-h-0' : 'max-h-96'}`}>
          {!selectedGeometry && (
            <SelectRegionPlaceholder id="highest-volume-no-selection" subtext="Use the polygon tool or click on a boundary to see highest volume areas for that region" />
          )}

          {selectedGeometry && isLoading && (
              <div id="highest-volume-loading" className="text-sm text-gray-500 text-center py-4">
                  Loading highest volume data...
              </div>
          )}
          {selectedGeometry && error && (
              <div id="highest-volume-error" className="text-sm text-red-600 text-center py-4">
                  {error}
              </div>
          )}
          {selectedGeometry && !isLoading && !error && sites.length === 0 && (
              <div id="highest-volume-no-data" className="text-sm text-gray-500 text-center py-4">
                  No volume data available for current view
              </div>
          )}
          {selectedGeometry && !isLoading && !error && sites.length > 0 && (
              <ul id="highest-volume-list" data-testid="highest-volume-list" className="space-y-2 text-sm">
                  {sites.map((site, index) => {
                      const isSelected = selectedSiteId === site.siteId.toString();
                      return (
                        <li
                          key={site.siteId}
                          id={`highest-volume-item-${index + 1}`}
                          className={`flex justify-between items-center rounded-md px-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'}`}
                          onClick={() => onSiteSelect?.(isSelected ? null : site.siteId.toString())}
                          aria-selected={isSelected}
                        >
                          <p id={`highest-volume-item-${index + 1}-name`} className={`text-gray-800 ${isSelected ? 'text-blue-800 font-medium' : ''}`}>
                              {index + 1}. {site.siteName}
                          </p>
                          <p id={`highest-volume-item-${index + 1}-value`} className="text-gray-800 font-medium">
                              {site.totalAADV.toLocaleString()}
                          </p>
                        </li>
                      );
                  })}
              </ul>
          )}
      </div>
    </div>
  );
}