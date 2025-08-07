import React, { useState } from "react";
import CollapseExpandIcon from "../../../components/CollapseExpandIcon";

export default function MostDangerousAreas() {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed

  return (
    <div id="safety-most-dangerous-areas" className="bg-white border border-gray-200 rounded-md p-4">
      <div id="safety-dangerous-areas-header" className="flex items-center justify-between">
        <h3 id="safety-dangerous-areas-title" className="text-base font-medium text-gray-700">Most Dangerous Areas</h3>
        <CollapseExpandIcon isCollapsed={isCollapsed} onClick={() => setIsCollapsed(!isCollapsed)} />
      </div>
      
      {!isCollapsed && (
        <div id="safety-dangerous-areas-content" className="flex justify-center items-center px-1 py-4 text-sm text-gray-500">
          <span id="safety-dangerous-areas-coming-soon">Coming soon</span>
        </div>
      )}
    </div>
  );
} 