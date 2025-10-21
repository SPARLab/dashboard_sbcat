import { useState, useCallback } from 'react';
import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';

interface SelectionData {
  geometry: Polygon | Polyline | null;
  areaName?: string | null;
  attributes?: any; // Include attributes for highway segments
}

export const useSelection = () => {
  const [selectedGeometry, setSelectedGeometry] = useState<(Polygon | Polyline) & { attributes?: any } | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState<string | null>(null);

  const handleSelectionChange = useCallback((data: SelectionData | Polygon | Polyline | null) => {
    // Handle both legacy Polygon-only calls and new SelectionData calls
    if (data === null) {
      setSelectedGeometry(null);
      setSelectedAreaName(null);
    } else if (data instanceof Polygon || data instanceof Polyline || 
               (data && ('rings' in data || 'paths' in data))) {
      // Legacy Polygon/Polyline-only call
      setSelectedGeometry(data as Polygon | Polyline);
      setSelectedAreaName(null);
    } else {
      // New SelectionData call with attributes
      const geometryWithAttrs = data.geometry as (Polygon | Polyline) & { attributes?: any };
      if (geometryWithAttrs && data.attributes) {
        geometryWithAttrs.attributes = data.attributes;
      }
      setSelectedGeometry(geometryWithAttrs);
      setSelectedAreaName(data.areaName || null);
    }
  }, []);

  return {
    selectedGeometry,
    selectedAreaName,
    onSelectionChange: handleSelectionChange,
  };
};
