import React, { useState, useEffect } from 'react';
import { ExpandLess as ChevronUpIcon, ExpandMore as ChevronDownIcon } from '@mui/icons-material';

interface PolygonOption {
  id: string;
  name: string;
  area: number;
  graphic: __esri.Graphic;
}

interface OverlappingPolygonSelectorProps {
  /** Array of overlapping polygon options */
  polygonOptions: PolygonOption[];
  /** Currently selected polygon ID */
  selectedPolygonId: string | null;
  /** Callback when user selects a different polygon */
  onPolygonSelect: (graphic: __esri.Graphic) => void;
  /** Position for the selector popup */
  position: { x: number; y: number } | null;
  /** Whether the selector is visible */
  visible: boolean;
  /** Callback to close the selector */
  onClose: () => void;
}

/**
 * UI component for selecting between overlapping polygons.
 * Shows when multiple polygons are detected at the same location.
 */
export default function OverlappingPolygonSelector({
  polygonOptions,
  selectedPolygonId,
  onPolygonSelect,
  position,
  visible,
  onClose
}: OverlappingPolygonSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update current index when selected polygon changes
  useEffect(() => {
    if (selectedPolygonId) {
      const index = polygonOptions.findIndex(option => option.id === selectedPolygonId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [selectedPolygonId, polygonOptions]);

  // Reset index when options change
  useEffect(() => {
    setCurrentIndex(0);
  }, [polygonOptions]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          cyclePrevious();
          break;
        case 'ArrowDown':
          event.preventDefault();
          cycleNext();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'Enter':
          event.preventDefault();
          selectCurrent();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentIndex, polygonOptions]);

  const cyclePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : polygonOptions.length - 1;
    setCurrentIndex(newIndex);
    onPolygonSelect(polygonOptions[newIndex].graphic);
  };

  const cycleNext = () => {
    const newIndex = currentIndex < polygonOptions.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onPolygonSelect(polygonOptions[newIndex].graphic);
  };

  const selectCurrent = () => {
    if (polygonOptions[currentIndex]) {
      onPolygonSelect(polygonOptions[currentIndex].graphic);
      onClose();
    }
  };

  if (!visible || polygonOptions.length <= 1 || !position) {
    return null;
  }

  const currentPolygon = polygonOptions[currentIndex];

  return (
    <>
      {/* Backdrop to close selector */}
      <div 
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />
      
      {/* Selector popup */}
      <div
        className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px]"
        style={{
          left: `${position.x + 10}px`,
          top: `${position.y - 10}px`,
          transform: 'translateY(-100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            Overlapping Areas ({polygonOptions.length})
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xs"
            aria-label="Close selector"
          >
            ✕
          </button>
        </div>

        {/* Current selection */}
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
          <div className="text-sm font-medium text-blue-900 truncate" title={currentPolygon.name}>
            {currentPolygon.name}
          </div>
          <div className="text-xs text-blue-600">
            Area: {currentPolygon.area.toFixed(0)} sq units
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Click to select this area
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={cyclePrevious}
            className="flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            disabled={polygonOptions.length <= 1}
          >
            <ChevronUpIcon className="w-3 h-3 mr-1" />
            Previous
          </button>
          
          <span className="text-xs text-gray-500">
            {currentIndex + 1} of {polygonOptions.length}
          </span>
          
          <button
            onClick={cycleNext}
            className="flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            disabled={polygonOptions.length <= 1}
          >
            Next
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </button>
        </div>

        {/* Select button */}
        <button
          onClick={selectCurrent}
          className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          Select "{currentPolygon.name}"
        </button>

        {/* Keyboard hints */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Use ↑↓ arrows to cycle, Enter to select, Esc to close
          </div>
        </div>
      </div>
    </>
  );
}
