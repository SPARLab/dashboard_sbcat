import React from "react";

interface SelectRegionPlaceholderProps {
  id?: string;
  subtext?: string;
}

export default function SelectRegionPlaceholder({
  id = "select-region-placeholder",
  subtext = "Use the polygon tool or click on a boundary to see data for that area",
}: SelectRegionPlaceholderProps) {
  return (
    <div
      id={id}
      className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center justify-center text-center mt-2 min-h-[120px]"
    >
      <div id={`${id}-icon`} className="mb-2 text-gray-400">
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </div>
      <p id={`${id}-primary-text`} className="text-sm text-gray-600 mb-1">
        Select a region on the map
      </p>
      <p id={`${id}-subtext`} className="text-xs text-gray-500">
        {subtext}
      </p>
    </div>
  );
}

