import { SafetyFilters } from "../../../lib/safety-app/types";
import AnnualIncidentsComparison from "../components/right-sidebar/AnnualIncidentsComparison";
import ConflictTypeBreakdown from "../components/right-sidebar/ConflictTypeBreakdown";
import IncidentsVsTrafficRatios from "../components/right-sidebar/IncidentsVsTrafficRatios";
import MostDangerousAreas from "../components/right-sidebar/MostDangerousAreas";
import SeverityBreakdown from "../components/right-sidebar/SeverityBreakdown";
import SummaryStatistics from "../components/right-sidebar/SummaryStatistics";
import LocationIndicator from "../../components/LocationIndicator";

interface SafetyRightSidebarProps {
  mapView: __esri.MapView | null;
  filters: Partial<SafetyFilters>;
  selectedGeometry: __esri.Polygon | null;
  selectedAreaName?: string | null;
}

export default function SafetyRightSidebar({
  mapView,
  filters,
  selectedGeometry,
  selectedAreaName
}: SafetyRightSidebarProps) {
  return (
    <div id="safety-analysis-sidebar" className="w-[412px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Fixed Analysis Header */}
      <div id="safety-analysis-header" className="flex-shrink-0 px-4 py-4 bg-white">
        <h2 id="safety-analysis-title" className="text-xl font-semibold text-gray-900">Analysis of Current View</h2>
      </div>

      {/* Location Indicator */}
      <div className="flex-shrink-0">
        <LocationIndicator 
          selectedAreaName={selectedAreaName}
          horizontalMargins="mx-4"
          id="safety-location-indicator"
        />
      </div>

      {/* Scrollable Analysis Content */}
      <div id="safety-analysis-content" className="flex-1 overflow-y-auto no-scrollbar">
        <div id="safety-analysis-components" className="space-y-3 px-3.5 py-2">
          <SummaryStatistics 
            selectedGeometry={selectedGeometry}
            filters={filters}
          />
          <MostDangerousAreas 
            selectedGeometry={selectedGeometry}
            filters={filters}
            mapView={mapView}
          />
          <AnnualIncidentsComparison 
            selectedGeometry={selectedGeometry}
            filters={filters}
            mapView={mapView}
          />
          <IncidentsVsTrafficRatios 
            selectedGeometry={selectedGeometry}
            filters={filters}
            mapView={mapView}
          />
          <SeverityBreakdown 
            selectedGeometry={selectedGeometry}
            filters={filters}
            mapView={mapView}
          />
          <ConflictTypeBreakdown 
            selectedGeometry={selectedGeometry}
            filters={filters}
            mapView={mapView}
          />
        </div>
      </div>
    </div>
  );
}

 