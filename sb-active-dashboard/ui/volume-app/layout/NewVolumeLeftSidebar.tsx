import DateRangeSection from "../../components/filters/DateRangeSection";
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
  modelCountsBy: string;
  setModelCountsBy: (type: string) => void;
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (dateRange: DateRangeValue) => void;
}

export default function NewVolumeLeftSidebar({ 
  activeTab,
  showBicyclist,
  setShowBicyclist,
  showPedestrian,
  setShowPedestrian,
  modelCountsBy,
  setModelCountsBy,
  geographicLevel,
  onGeographicLevelChange,
  dateRange,
  onDateRangeChange,
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
        showBicyclist={showBicyclist}
        setShowBicyclist={setShowBicyclist}
        showPedestrian={showPedestrian}
        setShowPedestrian={setShowPedestrian}
      />
      <hr className="border-gray-200" />
      <DateRangeSection 
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />
      <hr className="border-gray-200" />
      <div
  id="custom-draw-tool-activation"
  className={`p-4 cursor-pointer ${
    geographicLevel === 'custom'
      ? 'bg-blue-100 border-l-4 border-blue-500'
      : 'hover:bg-gray-50'
  }`}
  onClick={() => onGeographicLevelChange(geographicLevel === 'custom' ? '' : 'custom')}
>
  <h3 className="text-base font-medium text-gray-900">Custom Draw Tool</h3>
  <p className="text-sm text-gray-600 mt-1">
    {geographicLevel === 'custom'
      ? 'Exit drawing mode and clear custom polygons.'
      : 'Click to draw a custom area on the map.'}
  </p>
</div>
<hr className="border-gray-200" />
<GeographicLevelSection 
  geographicLevel={geographicLevel}
  onGeographicLevelChange={onGeographicLevelChange}
/>
    </div>
  );
}
