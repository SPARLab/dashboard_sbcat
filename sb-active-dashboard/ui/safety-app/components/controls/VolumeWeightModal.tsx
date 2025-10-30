interface VolumeWeightModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VolumeWeightModal({ open, onClose }: VolumeWeightModalProps) {
  if (!open) return null;

  return (
    <div 
      id="volume-weight-explanation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Understanding Volume-Weighted Incidents
          </h2>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          
          {/* Overview */}
          <div>
            <p className="text-sm text-gray-700">
              This visualization adjusts how incidents appear based on the expected traffic volume in that area.
            </p>
          </div>

          <hr className="border-gray-200" />

          {/* How It Works */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              How It Works
            </h3>
            
            <div className="space-y-3">
              {/* Low Volume */}
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Low-Volume Areas (weighted higher)
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Incidents on quiet streets appear more prominent because they may indicate unexpected safety issues.
                  </p>
                </div>
              </div>

              {/* Medium Volume */}
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Medium-Volume Areas (baseline)
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Standard weighting - incidents shown at their base level.
                  </p>
                </div>
              </div>

              {/* High Volume */}
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    High-Volume Areas (weighted lower)
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Incidents on busy roads appear less prominent because some level of incidents is expected with high traffic.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Why This Matters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Why This Matters
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              💡 <strong>Example:</strong> Five incidents on a quiet residential street may be more concerning than five incidents on a major highway that sees thousands of cyclists daily.
            </p>
            <p className="text-xs text-gray-600">
              This view helps identify areas where incidents are disproportionate to expected traffic patterns.
            </p>
          </div>

          <hr className="border-gray-200" />

          {/* Customization */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              🎚️ Adjust the Weights
            </h3>
            <p className="text-xs text-gray-700">
              Use the weight controls to explore different perspectives on relative risk. You can even set weights to zero to filter out specific volume categories entirely.
            </p>
          </div>

          {/* Note */}
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <p className="text-xs text-gray-700">
              <strong>⚠️ Note:</strong> Volume levels are modeled estimates. Weight adjustments should be validated by local safety experts familiar with the area's traffic patterns. Default values represent a starting hypothesis that can be refined through analysis.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            id="volume-weight-modal-close-button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
