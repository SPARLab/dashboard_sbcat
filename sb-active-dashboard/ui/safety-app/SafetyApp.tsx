import React, { useState } from "react";
import SafetyLeftSidebar from "./components/SafetyLeftSidebar";
import SafetyMapArea from "./components/SafetyMapArea";
import SafetyRightSidebar from "./components/SafetyRightSidebar";

export default function SafetyApp() {
  return (
    <div id="safety-app-container" className="flex flex-col h-[calc(100vh-70px)] bg-white">
      <div id="safety-main-content" className="flex flex-1 overflow-hidden">
        <SafetyLeftSidebar />
        <SafetyMapArea />
        <SafetyRightSidebar />
      </div>
      {/* Footer */}
      <div id="safety-footer" className="bg-gray-50 border-t border-gray-200 py-4">
        <div id="safety-footer-content" className="max-w-none px-6">
          <p id="safety-footer-copyright" className="text-sm text-gray-600 text-center">
            © 2025 Active SB Dashboard. Safety data and analysis information.
          </p>
        </div>
      </div>
    </div>
  );
} 