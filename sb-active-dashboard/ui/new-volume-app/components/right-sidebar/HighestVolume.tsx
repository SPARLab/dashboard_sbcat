import React, { useState } from "react";
import MoreInformationIconCostBenefitTool from "./MoreInformationIcon";
import CollapseExpandIcon from "./CollapseExpandIcon";

export default function HighestVolume() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

  return (
    <div
      className="bg-white border border-gray-200 rounded-md p-4"
      id="highest-volume-container"
    >
      <div id="highest-volume-header" className={`transition-all duration-300 ease-in-out flex justify-between items-center ${!isCollapsed ? "mb-4" : ""}`}>
        <div id="highest-volume-title-container" className="flex items-center gap-1">
            <h3 id="highest-volume-title" className="text-lg font-medium text-gray-700">
              Highest Volume Areas
            </h3>
            <MoreInformationIconCostBenefitTool />
        </div>
        <CollapseExpandIcon id="highest-volume-collapse-icon" isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
      <div id="highest-volume-collapsible-content" className={`transition-all duration-300 ease-in-out overflow-y-hidden ${isCollapsed ? 'max-h-0' : 'max-h-96'}`}>
          <ul id="highest-volume-list" className="space-y-2 text-sm">
              <li id="highest-volume-item-1" className="flex justify-between items-center">
                  <p id="highest-volume-item-1-name" className="text-gray-800">1. State Street</p>
                  <p id="highest-volume-item-1-value" className="text-gray-800 font-medium">2,450</p>
              </li>
              <li id="highest-volume-item-2" className="flex justify-between items-center">
                  <p id="highest-volume-item-2-name" className="text-gray-800">2. Cabrillo Blvd</p>
                  <p id="highest-volume-item-2-value" className="text-gray-800 font-medium">1,870</p>
              </li>
              <li id="highest-volume-item-3" className="flex justify-between items-center">
                  <p id="highest-volume-item-3-name" className="text-gray-800">3. Anacapa Street</p>
                  <p id="highest-volume-item-3-value" className="text-gray-800 font-medium">1,230</p>
              </li>
              <li id="highest-volume-item-4" className="flex justify-between items-center">
                  <p id="highest-volume-item-4-name" className="text-gray-800">4. De La Guerra St</p>
                  <p id="highest-volume-item-4-value" className="text-gray-800 font-medium">980</p>
              </li>
              <li id="highest-volume-item-5" className="flex justify-between items-center">
                  <p id="highest-volume-item-5-name" className="text-gray-800">5. Carrillo Street</p>
                  <p id="highest-volume-item-5-value" className="text-gray-800 font-medium">740</p>
              </li>
          </ul>
      </div>
    </div>
  );
} 