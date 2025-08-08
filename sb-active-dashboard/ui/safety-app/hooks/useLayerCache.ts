import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useState } from "react";
import { SafetyFilters } from "../../../lib/safety-app/types";

export function useLayerCache() {
  // Cache for the weighted layer to avoid expensive recreation
  const [cachedWeightedLayer, setCachedWeightedLayer] = useState<FeatureLayer | null>(null);
  const [cachedExtentKey, setCachedExtentKey] = useState<string | null>(null);
  
  // Cache for raw incidents data to avoid re-querying on every zoom/pan
  const [cachedRawIncidentsData, setCachedRawIncidentsData] = useState<any[] | null>(null);
  const [cachedRawIncidentsLayer, setCachedRawIncidentsLayer] = useState<FeatureLayer | null>(null);
  const [rawDataFiltersKey, setRawDataFiltersKey] = useState<string | null>(null);

  // Generate a cache key based on filters only (not extent)
  const generateCacheKey = (extent: __esri.Extent, filters: Partial<SafetyFilters>): string => {
    const filtersKey = JSON.stringify({
      dateRange: filters.dateRange ? `${filters.dateRange.start.getTime()}-${filters.dateRange.end.getTime()}` : null,
      dataSource: filters.dataSource?.sort(),
      roadUser: filters.roadUser?.sort(),
      conflictType: filters.conflictType?.sort()
    });
    return filtersKey;
  };

  const clearRawIncidentsCache = (mapView?: __esri.MapView) => {

    setCachedRawIncidentsData(null);
    setCachedRawIncidentsLayer(null);
    setRawDataFiltersKey(null);
    
    // Remove cached layer from map if it exists
    if (cachedRawIncidentsLayer && mapView) {
      mapView.map.remove(cachedRawIncidentsLayer);
    }
  };

  const clearWeightedCache = (mapView?: __esri.MapView) => {

    if (cachedWeightedLayer) {
      cachedWeightedLayer.visible = false;
      if (mapView && mapView.map.layers.includes(cachedWeightedLayer)) {
        mapView.map.remove(cachedWeightedLayer);
      }
    }
    setCachedWeightedLayer(null);
    setCachedExtentKey(null);
  };

  return {
    // Weighted layer cache
    cachedWeightedLayer,
    setCachedWeightedLayer,
    cachedExtentKey,
    setCachedExtentKey,
    
    // Raw incidents cache
    cachedRawIncidentsData,
    setCachedRawIncidentsData,
    cachedRawIncidentsLayer,
    setCachedRawIncidentsLayer,
    rawDataFiltersKey,
    setRawDataFiltersKey,
    
    // Utilities
    generateCacheKey,
    clearRawIncidentsCache,
    clearWeightedCache
  };
}