import React, { Suspense, lazy } from "react";
import LoadingSpinner from "../../../ui/components/LoadingSpinner";

// Lazy-load the NewVolumeApp component
const NewVolumeApp = lazy(() => import('../../../ui/volume-app/NewVolumeApp'));

function VolumeLoadingFallback() {
  return (
    <div id="volume-loading-container" className="flex flex-col h-[calc(100vh-70px)] bg-white">
      <div id="volume-loading-content" className="flex-1 flex items-center justify-center">
        <LoadingSpinner 
          message="Loading volume dashboard..." 
          size="large"
          className="flex-col"
        />
      </div>
      {/* Footer matching NewVolumeApp */}
      <div id="volume-loading-footer" className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="max-w-none px-6">
          <p id="volume-loading-footer-copyright" className="text-sm text-gray-600 text-center">
            © 2025 Active SB Dashboard. Data completeness and modeling information.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Volume() {
  return (
    <Suspense fallback={<VolumeLoadingFallback />}>
      <NewVolumeApp />
    </Suspense>
  );
} 