import React from "react";

interface VolumeSubHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function VolumeSubHeader({ activeTab, onTabChange }: VolumeSubHeaderProps) {
  const tabs = [
    { id: 'raw-data', label: 'Raw Data' },
    { id: 'modeled-data', label: 'Modeled Data' },
    { id: 'data-completeness', label: 'Data Completeness' }
  ];

  return (
    <div id="volume-sub-navigation" className="flex justify-center items-center bg-gray-50 border-b border-gray-200 h-[3rem]">
      <div className="flex justify-center items-center h-[38px] px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${tab.id}-tab`}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-8 py-2 text-[14px] font-medium bg-transparent cursor-pointer transition-all duration-200 hover:scale-105 ${
              activeTab === tab.id ? 'text-blue-500' : 'text-gray-500 hover:text-gray-800'
            }`}
            // Inline styling required here to remove ugly default browser styling for the active state when you click on the tab.
            style={{
              border: 'none',
              outline: 'none',
              borderRadius: 0,
              boxShadow: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 