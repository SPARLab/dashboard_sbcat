import React, { Suspense, lazy } from "react";
import LoadingSpinner from "../../../ui/components/LoadingSpinner";

// Lazy-load the SafetyApp component  
const SafetyApp = lazy(() => import("../../../ui/safety-app/SafetyApp"));

function SafetyLoadingFallback() {
  return (
    <div id="safety-loading-container" className="flex flex-col h-[calc(100vh-70px)] bg-white">
      <div id="safety-loading-content" className="flex-1 flex items-center justify-center">
        <LoadingSpinner 
          message="Loading safety dashboard..." 
          size="large"
          className="flex-col"
        />
      </div>
      {/* Footer matching SafetyApp */}
      <div id="safety-loading-footer" className="bg-gray-50 border-t border-gray-200 py-4">
        <div id="safety-loading-footer-content" className="max-w-none px-6">
          <p id="safety-loading-footer-copyright" className="text-sm text-gray-600 text-center">
            © 2025 Active SB Dashboard. Safety data and analysis information.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Safety() {
  return (
    <Suspense fallback={<SafetyLoadingFallback />}>
      <SafetyApp />
    </Suspense>
  );
}
