import DateRangeSection from "../../components/filters/DateRangeSection";
import YearSelector from "../../components/filters/YearSelector";
import GeographicLevelSection from "../../components/filters/GeographicLevelSection";
import ModelCountTypeSection from "../components/left-sidebar/ModelCountTypeSection";
import RoadUserSection from "../components/left-sidebar/RoadUserSection";
import SortDataSection from "../components/left-sidebar/SortDataSection";

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface NewVolumeLeftSidebarProps {
  activeTab: string;
  showBicyclist: boolean;
  setShowBicyclist: (show: boolean) => void;
  showPedestrian: boolean;
  setShowPedestrian: (show: boolean) => void;
  selectedMode: 'bike' | 'ped';
  onModeChange: (mode: 'bike' | 'ped') => void;
  modelCountsBy: string;
  setModelCountsBy: (type: string) => void;
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (dateRange: DateRangeValue) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export default function NewVolumeLeftSidebar({ 
  activeTab,
  showBicyclist,
  setShowBicyclist,
  showPedestrian,
  setShowPedestrian,
  selectedMode,
  onModeChange,
  modelCountsBy,
  setModelCountsBy,
  geographicLevel,
  onGeographicLevelChange,
  dateRange,
  onDateRangeChange,
  selectedYear,
  onYearChange,
}: NewVolumeLeftSidebarProps) {
  return (
    <div id="volume-filters-sidebar" className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <SortDataSection />
      <hr className="border-gray-200" />
      {activeTab === 'modeled-data' && (
        <>
          <ModelCountTypeSection 
            modelCountsBy={modelCountsBy}
            setModelCountsBy={setModelCountsBy}
          />
          <hr className="border-gray-200" />
        </>
      )}
      <RoadUserSection 
        activeTab={activeTab}
        showBicyclist={showBicyclist}
        setShowBicyclist={setShowBicyclist}
        showPedestrian={showPedestrian}
        setShowPedestrian={setShowPedestrian}
        selectedMode={selectedMode}
        onModeChange={onModeChange}
      />
      <hr className="border-gray-200" />
      {activeTab === 'modeled-data' ? (
        <YearSelector 
          selectedYear={selectedYear}
          onYearChange={onYearChange}
          modelType={modelCountsBy}
        />
      ) : (
        <DateRangeSection 
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
      )}
      <GeographicLevelSection 
        geographicLevel={geographicLevel}
        onGeographicLevelChange={onGeographicLevelChange}
      />
      {geographicLevel === 'custom' && (
        <>
          <hr className="border-gray-200" />
          <div
            id="custom-draw-tool-instructions"
            className="p-4 bg-blue-100 border-l-4 border-blue-500"
          >
            <h3 className="text-base font-medium text-gray-900">Custom Draw Tool</h3>
            <p className="text-sm text-gray-600 mt-1">
              Click on the map to draw a custom area. Click the first point again to complete the polygon.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
