import { SafetyFilters } from "../../../lib/safety-app/types";
import AnnualIncidentsComparison from "../components/right-sidebar/AnnualIncidentsComparison";
import ConflictTypeBreakdown from "../components/right-sidebar/ConflictTypeBreakdown";
import IncidentsVsTrafficRatios from "../components/right-sidebar/IncidentsVsTrafficRatios";
import MostDangerousAreas from "../components/right-sidebar/MostDangerousAreas";
import SeverityBreakdown from "../components/right-sidebar/SeverityBreakdown";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";

interface SafetyRightSidebarProps {
  mapView: __esri.MapView | null;
  incidentsLayer: __esri.FeatureLayer | null;
  jitteredIncidentsLayer: __esri.FeatureLayer | null;
  filters: Partial<SafetyFilters>;
  selectedGeometry: __esri.Polygon | null;
  selectedAreaName?: string | null;
}

export default function SafetyRightSidebar({
  mapView,
  incidentsLayer,
  jitteredIncidentsLayer,
  filters,
  selectedGeometry,
  selectedAreaName
}: SafetyRightSidebarProps) {
  return (
    <div id="safety-analysis-sidebar" className="w-[412px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Location Indicator Header */}
      <div id="safety-location-indicator" className="flex-shrink-0 px-4 py-[1.04rem] bg-white">
        <div className="flex items-center space-x-2">
          <svg 
            className="w-6 h-6 text-gray-500 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {selectedAreaName ? (
            <p className="text-lg font-medium text-gray-900 truncate">
              {selectedAreaName}
            </p>
          ) : (
            <p className="text-lg text-gray-500 italic">
              Please select a region on the map
            </p>
          )}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="w-full h-[1px] bg-gray-200 flex-shrink-0"></div>

      {/* Scrollable Analysis Content */}
      <div id="safety-analysis-content" className="flex-1 overflow-y-auto no-scrollbar">
        <div id="safety-analysis-components" className="space-y-3 px-3.5 pt-4 pb-2">
          <SummaryStatistics 
            mapView={mapView}
            incidentsLayer={incidentsLayer}
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
          <MostDangerousAreas 
            mapView={mapView}
            incidentsLayer={incidentsLayer}
            jitteredIncidentsLayer={jitteredIncidentsLayer}
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
          <AnnualIncidentsComparison 
            mapView={mapView}
            incidentsLayer={incidentsLayer}
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
          <IncidentsVsTrafficRatios 
            mapView={mapView}
            incidentsLayer={incidentsLayer}
            jitteredIncidentsLayer={jitteredIncidentsLayer}
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
          <SeverityBreakdown 
            mapView={mapView}
            incidentsLayer={incidentsLayer}
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
          <ConflictTypeBreakdown 
            mapView={mapView}
            incidentsLayer={incidentsLayer}
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
        </div>
      </div>
    </div>
  );
}

 