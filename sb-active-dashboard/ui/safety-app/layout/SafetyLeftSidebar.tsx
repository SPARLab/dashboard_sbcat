import React from "react";
import SafetyFilterPanel from "../components/left-sidebar/SafetyFilterPanel";

export default function SafetyLeftSidebar() {
  return (
    <div id="safety-filters-sidebar" className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Fixed Filter Data Header */}
      <div id="safety-filters-header" className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4">
        <h2 id="safety-filters-title" className="text-xl font-semibold text-gray-900">Filter Data</h2>
      </div>

      {/* Scrollable Filter Content */}
      <div id="safety-filters-content" className="flex-1 overflow-y-auto no-scrollbar">
        <SafetyFilterPanel />
      </div>
    </div>
  );
} 