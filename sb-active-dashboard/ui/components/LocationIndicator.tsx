import React from "react";

interface LocationIndicatorProps {
  selectedAreaName?: string | null;
  horizontalMargins?: string;
  id?: string;
}

export default function LocationIndicator({ 
  selectedAreaName, 
  horizontalMargins = "mx-4",
  id = "location-indicator"
}: LocationIndicatorProps) {
  return (
    <>
      {/* Top divider */}
      <div className="w-full h-[1px] bg-gray-200"></div>
      
      {/* Location indicator box */}
      <div id={id} className={`py-3 ${horizontalMargins} bg-white`}>
        <div className="flex items-center space-x-2">
          {/* Location pin icon */}
          <div className="flex-shrink-0">
            <svg 
              className="w-4 h-4 text-gray-500" 
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
          </div>
          
          {/* Location text */}
          <div className="flex-1 min-w-0">
            {selectedAreaName ? (
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedAreaName}
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Please select a region on the map
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom divider */}
      <div className="w-full h-[1px] bg-gray-200"></div>
    </>
  );
}

