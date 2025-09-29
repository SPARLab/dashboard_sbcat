import React, { useState, useEffect, useRef } from 'react';
import { GeographicBoundariesService } from '../../lib/data-services/GeographicBoundariesService';
import OverlappingPolygonSelector from './OverlappingPolygonSelector';
import PolygonContextMenu from './PolygonContextMenu';

interface PolygonOption {
  id: string;
  name: string;
  area: number;
  graphic: __esri.Graphic;
}

interface EnhancedMapWithPolygonSelectorProps {
  /** The map view instance */
  mapView: __esri.MapView | null;
  /** Current geographic level */
  geographicLevel: 'city' | 'county' | 'census-tract' | 'hexagons' | 'custom' | 'city-service-area' | 'school-districts' | 'unincorporated-areas' | 'caltrans-highways';
  /** Callback when selection changes */
  onSelectionChange?: (data: { geometry: __esri.Polygon | __esri.Polyline | null; areaName?: string | null } | null) => void;
  /** Children components (typically the map component) */
  children: React.ReactNode;
}

/**
 * Enhanced map wrapper that provides overlapping polygon selection UI.
 * This component integrates with GeographicBoundariesService to show a selector
 * when multiple overlapping polygons are detected at the same location.
 */
export default function EnhancedMapWithPolygonSelector({
  mapView,
  geographicLevel,
  onSelectionChange,
  children
}: EnhancedMapWithPolygonSelectorProps) {
  const [overlappingPolygons, setOverlappingPolygons] = useState<PolygonOption[]>([]);
  const [selectorPosition, setSelectorPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  
  // Context menu state
  const [contextMenuPolygons, setContextMenuPolygons] = useState<PolygonOption[]>([]);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  
  const boundaryServiceRef = useRef<GeographicBoundariesService | null>(null);

  // Initialize boundary service when map view is ready
  useEffect(() => {
    if (!mapView) return;

    if (!boundaryServiceRef.current) {
      boundaryServiceRef.current = new GeographicBoundariesService();
    }

    const boundaryService = boundaryServiceRef.current;

    // Set up selection change callback
    boundaryService.setSelectionChangeCallback(onSelectionChange || null);

    // Set up overlapping polygon callback (for left-click popup)
    boundaryService.setOverlappingPolygonCallback((polygons, position) => {
      console.log('🎯 [Enhanced Map] Overlapping polygons detected:', polygons.length);
      
      setOverlappingPolygons(polygons);
      setSelectorPosition(position);
      setSelectorVisible(true);
      
      // Set the first (smallest) polygon as initially selected
      if (polygons.length > 0) {
        setSelectedPolygonId(polygons[0].id);
      }
    });

    // Set up right-click context menu callback
    boundaryService.setRightClickPolygonCallback((polygons, position) => {
      console.log('🎯 [Enhanced Map] Right-click context menu:', polygons.length);
      
      setContextMenuPolygons(polygons);
      setContextMenuPosition(position);
      setContextMenuVisible(true);
    });

    // Switch to the current geographic level
    boundaryService.switchGeographicLevel(geographicLevel, mapView);

    return () => {
      // Cleanup on unmount
      boundaryService.setOverlappingPolygonCallback(null);
      boundaryService.setRightClickPolygonCallback(null);
      boundaryService.cleanupInteractivity();
    };
  }, [mapView, onSelectionChange]);

  // Update geographic level when it changes
  useEffect(() => {
    if (mapView && boundaryServiceRef.current) {
      boundaryServiceRef.current.switchGeographicLevel(geographicLevel, mapView);
      // Close selector and context menu when switching levels
      setSelectorVisible(false);
      setOverlappingPolygons([]);
      setSelectorPosition(null);
      setSelectedPolygonId(null);
      
      setContextMenuVisible(false);
      setContextMenuPolygons([]);
      setContextMenuPosition(null);
    }
  }, [geographicLevel, mapView]);

  const handlePolygonSelect = (graphic: __esri.Graphic) => {
    if (boundaryServiceRef.current) {
      // Use the boundary service to handle the selection
      boundaryServiceRef.current.selectSpecificGraphic(graphic);
      
      // Update selected polygon ID for UI state
      const polygonId = `${graphic.attributes?.OBJECTID || graphic.attributes?.objectid || ''}`;
      setSelectedPolygonId(polygonId);
    }
  };

  const handleSelectorClose = () => {
    setSelectorVisible(false);
    setOverlappingPolygons([]);
    setSelectorPosition(null);
    setSelectedPolygonId(null);
  };

  const handleContextMenuClose = () => {
    setContextMenuVisible(false);
    setContextMenuPolygons([]);
    setContextMenuPosition(null);
  };

  return (
    <div className="relative w-full h-full">
      {children}
      
      {/* Overlapping Polygon Selector */}
      <OverlappingPolygonSelector
        polygonOptions={overlappingPolygons}
        selectedPolygonId={selectedPolygonId}
        onPolygonSelect={handlePolygonSelect}
        position={selectorPosition}
        visible={selectorVisible}
        onClose={handleSelectorClose}
      />
      
      {/* Right-click Context Menu */}
      <PolygonContextMenu
        polygonOptions={contextMenuPolygons}
        onPolygonSelect={handlePolygonSelect}
        position={contextMenuPosition}
        visible={contextMenuVisible}
        onClose={handleContextMenuClose}
      />
      
      {/* Visual indicator when overlapping polygons are detected */}
      {(selectorVisible || contextMenuVisible) && (overlappingPolygons.length > 1 || contextMenuPolygons.length > 1) && (
        <div className="absolute top-4 right-4 z-30 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium">
              {Math.max(overlappingPolygons.length, contextMenuPolygons.length)} overlapping areas detected
            </span>
          </div>
          <div className="text-xs mt-1 text-yellow-700">
            {selectorVisible ? 'Use the selector or arrow keys to choose' : 'Right-click to see all options'}
          </div>
        </div>
      )}
    </div>
  );
}
