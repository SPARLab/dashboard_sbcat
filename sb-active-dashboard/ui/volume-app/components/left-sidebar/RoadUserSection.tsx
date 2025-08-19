import React from "react";

interface RoadUserSectionProps {
  activeTab: string;
  showBicyclist: boolean;
  setShowBicyclist: (show: boolean) => void;
  showPedestrian: boolean;
  setShowPedestrian: (show: boolean) => void;
  selectedMode: 'bike' | 'ped';
  onModeChange: (mode: 'bike' | 'ped') => void;
}

export default function RoadUserSection({
  activeTab,
  showBicyclist,
  setShowBicyclist,
  showPedestrian,
  setShowPedestrian,
  selectedMode,
  onModeChange
}: RoadUserSectionProps) {
  return (
    <div className="p-4">
      <div id="road-user-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Select Road User</h3>
        {activeTab === 'modeled-data' ? (
          // Radio buttons for Modeled Data (single selection)
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="bicyclist-radio"
                type="radio"
                name="road-user"
                value="bike"
                checked={selectedMode === 'bike'}
                onChange={(e) => onModeChange(e.target.value as 'bike' | 'ped')}
                className="sr-only"
              />
              <label htmlFor="bicyclist-radio" className="flex items-center cursor-pointer">
                <div className={`relative w-4 h-4 rounded-full border-2 ${
                  selectedMode === 'bike'
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-400 bg-white'
                }`}>
                  {selectedMode === 'bike' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className="ml-3 text-[14px] font-normal leading-6 text-gray-700">
                  🚴 Bicyclist
                </span>
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="pedestrian-radio"
                type="radio"
                name="road-user"
                value="ped"
                checked={selectedMode === 'ped'}
                onChange={(e) => onModeChange(e.target.value as 'bike' | 'ped')}
                className="sr-only"
              />
              <label htmlFor="pedestrian-radio" className="flex items-center cursor-pointer">
                <div className={`relative w-4 h-4 rounded-full border-2 ${
                  selectedMode === 'ped'
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-400 bg-white'
                }`}>
                  {selectedMode === 'ped' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className="ml-3 text-[14px] font-normal leading-6 text-gray-700">
                  🚶 Pedestrian
                </span>
              </label>
            </div>
          </div>
        ) : (
          // Checkboxes for Raw Data and Data Completeness (dual selection)
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="pedestrian-checkbox"
                type="checkbox"
                checked={showPedestrian}
                onChange={(e) => setShowPedestrian(e.target.checked)}
                className="sr-only"
              />
              <label htmlFor="pedestrian-checkbox" className="flex items-center cursor-pointer">
                <div className={`relative size-3.5 rounded ${
                  showPedestrian 
                    ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                    : 'bg-transparent border border-gray-700'
                }`}>
                  {showPedestrian && (
                    <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="ml-2.5 text-[14px] font-normal leading-6 text-gray-700">🚶 Pedestrian</span>
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="bicyclist-checkbox"
                type="checkbox"
                checked={showBicyclist}
                onChange={(e) => setShowBicyclist(e.target.checked)}
                className="sr-only"
              />
              <label htmlFor="bicyclist-checkbox" className="flex items-center cursor-pointer">
                <div className={`relative size-3.5 rounded ${
                  showBicyclist 
                    ? 'bg-blue-500 border-[0.5px] border-blue-500' 
                    : 'bg-transparent border border-gray-700'
                }`}>
                  {showBicyclist && (
                     <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="ml-2.5 text-[14px] font-normal leading-6 text-gray-700">🚴 Bicyclist</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 