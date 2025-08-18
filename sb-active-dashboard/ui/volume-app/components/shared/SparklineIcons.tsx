import React from "react";

/**
 * Shared loading spinner for sparkline components
 */
export function LoadingSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <div className={`${className} flex-shrink-0`}>
      <div className="animate-spin rounded-full w-full h-full border-b-2 border-blue-500"></div>
    </div>
  );
}

/**
 * Shared warning icon for low confidence states
 */
export function WarningIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <div className={`${className} flex-shrink-0`}>
      <svg 
        viewBox="0 0 16 16" 
        className="w-full h-full text-red-600"
      >
        <path
          fill="currentColor"
          d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.439-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
        />
      </svg>
    </div>
  );
}

/**
 * Map selection icon for no-selection states
 */
export function MapSelectionIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <div className={`${className} flex-shrink-0`}>
      <svg viewBox="0 0 24 24" className="w-full h-full text-gray-500" fill="none" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    </div>
  );
}
