import { useState, useCallback } from 'react';
import Polygon from '@arcgis/core/geometry/Polygon';

interface SelectionData {
  geometry: Polygon | null;
  areaName?: string | null;
}

export const useSelection = () => {
  const [selectedGeometry, setSelectedGeometry] = useState<Polygon | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState<string | null>(null);

  const handleSelectionChange = useCallback((data: SelectionData | Polygon | null) => {
    // Handle both legacy Polygon-only calls and new SelectionData calls
    if (data === null) {
      setSelectedGeometry(null);
      setSelectedAreaName(null);
    } else if (data instanceof Polygon || (data && 'rings' in data)) {
      // Legacy Polygon-only call
      setSelectedGeometry(data as Polygon);
      setSelectedAreaName(null);
    } else {
      // New SelectionData call
      setSelectedGeometry(data.geometry);
      setSelectedAreaName(data.areaName || null);
    }
  }, []);

  return {
    selectedGeometry,
    selectedAreaName,
    onSelectionChange: handleSelectionChange,
  };
};
