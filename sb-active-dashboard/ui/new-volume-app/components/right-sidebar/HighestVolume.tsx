import React from "react";

export default function HighestVolume() {
  return (
    <div
      className="bg-white border border-gray-200 rounded-md p-4"
      id="highest-volume-container"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-700" id="highest-volume-title">
          Highest Volume Areas
        </h3>
        <div className="size-3.5" id="highest-volume-icon-container">
          <img
            alt="Highest Volume Icon"
            className="block max-w-none size-full"
            src="http://localhost:3845/assets/f0c6a21ba81062faf8706ff83c8c7d9b15634d5a.svg"
          />
        </div>
      </div>
      <ul className="space-y-2 text-sm" id="highest-volume-list">
        <li className="flex justify-between items-center" id="highest-volume-item-1">
          <p className="text-gray-800" id="highest-volume-item-1-name">1. State Street</p>
          <p className="text-gray-800 font-medium" id="highest-volume-item-1-value">2,450</p>
        </li>
        <li className="flex justify-between items-center" id="highest-volume-item-2">
          <p className="text-gray-800" id="highest-volume-item-2-name">2. Cabrillo Blvd</p>
          <p className="text-gray-800 font-medium" id="highest-volume-item-2-value">1,870</p>
        </li>
        <li className="flex justify-between items-center" id="highest-volume-item-3">
          <p className="text-gray-800" id="highest-volume-item-3-name">3. Anacapa Street</p>
          <p className="text-gray-800 font-medium" id="highest-volume-item-3-value">1,230</p>
        </li>
        <li className="flex justify-between items-center" id="highest-volume-item-4">
          <p className="text-gray-800" id="highest-volume-item-4-name">4. De La Guerra St</p>
          <p className="text-gray-800 font-medium" id="highest-volume-item-4-value">980</p>
        </li>
        <li className="flex justify-between items-center" id="highest-volume-item-5">
          <p className="text-gray-800" id="highest-volume-item-5-name">5. Carrillo Street</p>
          <p className="text-gray-800 font-medium" id="highest-volume-item-5-value">740</p>
        </li>
      </ul>
    </div>
  );
} 