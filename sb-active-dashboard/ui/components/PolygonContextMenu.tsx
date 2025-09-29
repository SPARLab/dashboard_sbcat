import React from 'react';

interface PolygonOption {
  id: string;
  name: string;
  area: number;
  graphic: __esri.Graphic;
}

interface PolygonContextMenuProps {
  /** Array of overlapping polygon options */
  polygonOptions: PolygonOption[];
  /** Callback when user selects a polygon */
  onPolygonSelect: (graphic: __esri.Graphic) => void;
  /** Position for the context menu */
  position: { x: number; y: number } | null;
  /** Whether the menu is visible */
  visible: boolean;
  /** Callback to close the menu */
  onClose: () => void;
}

/**
 * Right-click context menu for selecting between overlapping polygons.
 * Provides a clean list of all available polygons at the clicked location.
 */
export default function PolygonContextMenu({
  polygonOptions,
  onPolygonSelect,
  position,
  visible,
  onClose
}: PolygonContextMenuProps) {
  if (!visible || polygonOptions.length <= 1 || !position) {
    return null;
  }

  const handlePolygonClick = (graphic: __esri.Graphic) => {
    onPolygonSelect(graphic);
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div 
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      
      {/* Context menu */}
      <div
        className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[220px] max-w-[300px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <div className="text-xs font-medium text-gray-600">
            Select Area ({polygonOptions.length} overlapping)
          </div>
        </div>

        {/* Polygon options */}
        <div className="max-h-60 overflow-y-auto">
          {polygonOptions.map((polygon, index) => (
            <button
              key={polygon.id}
              onClick={() => handlePolygonClick(polygon.graphic)}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="text-sm font-medium text-gray-900 truncate">
                {polygon.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Area: {polygon.area.toFixed(0)} sq units
                {index === 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    Smallest
                  </span>
                )}
                {index === polygonOptions.length - 1 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                    Largest
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            Right-click elsewhere to close
          </div>
        </div>
      </div>
    </>
  );
}

