import { useState, useCallback } from 'react';
import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';

interface SelectionData {
  geometry: Polygon | Polyline | null;
  areaName?: string | null;
  attributes?: any; // Include attributes for highway segments
}

// Extended geometry type that includes attributes
export type GeometryWithAttributes = (Polygon | Polyline) & { attributes?: any };

export const useSelection = () => {
  const [selectedGeometry, setSelectedGeometry] = useState<GeometryWithAttributes | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<any>(null);

  const handleSelectionChange = useCallback((data: SelectionData | Polygon | Polyline | null) => {
    // Handle both legacy Polygon-only calls and new SelectionData calls
    if (data === null) {
      setSelectedGeometry(null);
      setSelectedAreaName(null);
      setSelectedAttributes(null);
    } else if (data instanceof Polygon || data instanceof Polyline || 
               (data && ('rings' in data || 'paths' in data))) {
      // Legacy Polygon/Polyline-only call
      setSelectedGeometry(data as Polygon | Polyline);
      setSelectedAreaName(null);
      setSelectedAttributes(null);
    } else {
      // New SelectionData call with attributes
      // Create a custom object with geometry and attributes
      const geomWithAttrs = Object.create(data.geometry);
      geomWithAttrs.attributes = data.attributes;
      
      setSelectedGeometry(geomWithAttrs);
      setSelectedAreaName(data.areaName || null);
      setSelectedAttributes(data.attributes || null);
    }
  }, []);

  return {
    selectedGeometry,
    selectedAreaName,
    selectedAttributes,
    onSelectionChange: handleSelectionChange,
  };
};
