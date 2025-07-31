import { useState, useCallback } from 'react';
import Polygon from '@arcgis/core/geometry/Polygon';

export const useSelection = () => {
  const [selectedGeometry, setSelectedGeometry] = useState<Polygon | null>(null);

  const handleSelectionChange = useCallback((geometry: Polygon | null) => {
    setSelectedGeometry(geometry);
  }, []);

  return {
    selectedGeometry,
    onSelectionChange: handleSelectionChange,
  };
};
