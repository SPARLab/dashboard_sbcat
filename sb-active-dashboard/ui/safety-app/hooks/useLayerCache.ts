import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useState } from "react";
import { SafetyFilters } from "../../../lib/safety-app/types";
import { VolumeWeightConfig } from "../../../lib/safety-app/utils/incidentRiskMatrix";

// Type for the three volume category layers
export interface VolumeCategoryLayers {
  low: FeatureLayer | null;
  medium: FeatureLayer | null;
  high: FeatureLayer | null;
}

export function useLayerCache() {
  // Cache for the weighted layer to avoid expensive recreation (deprecated - keeping for backwards compatibility)
  const [cachedWeightedLayer, setCachedWeightedLayer] = useState<FeatureLayer | null>(null);
  const [cachedExtentKey, setCachedExtentKey] = useState<string | null>(null);
  
  // NEW: Cache for the three volume category layers
  const [cachedVolumeLayers, setCachedVolumeLayers] = useState<VolumeCategoryLayers>({
    low: null,
    medium: null,
    high: null
  });
  const [volumeLayersCacheKey, setVolumeLayersCacheKey] = useState<string | null>(null);
  
  // Cache for raw incidents data to avoid re-querying on every zoom/pan
  const [cachedRawIncidentsData, setCachedRawIncidentsData] = useState<any[] | null>(null);
  const [cachedRawIncidentsLayer, setCachedRawIncidentsLayer] = useState<FeatureLayer | null>(null);
  const [rawDataFiltersKey, setRawDataFiltersKey] = useState<string | null>(null);

  // Generate a cache key based on filters only (not extent)
  const generateCacheKey = (extent: __esri.Extent, filters: Partial<SafetyFilters>, weights?: VolumeWeightConfig): string => {
    const filtersKey = JSON.stringify({
      dateRange: filters.dateRange ? `${filters.dateRange.start.getTime()}-${filters.dateRange.end.getTime()}` : null,
      dataSource: filters.dataSource?.sort(),
      roadUser: filters.roadUser?.sort(),
      conflictType: filters.conflictType?.sort(),
      weights: weights ? `${weights.low}-${weights.medium}-${weights.high}` : null
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

  const clearVolumeCategoriesCache = (mapView?: __esri.MapView) => {
    // Remove all three volume category layers from the map
    if (mapView) {
      if (cachedVolumeLayers.low && mapView.map.layers.includes(cachedVolumeLayers.low)) {
        mapView.map.remove(cachedVolumeLayers.low);
      }
      if (cachedVolumeLayers.medium && mapView.map.layers.includes(cachedVolumeLayers.medium)) {
        mapView.map.remove(cachedVolumeLayers.medium);
      }
      if (cachedVolumeLayers.high && mapView.map.layers.includes(cachedVolumeLayers.high)) {
        mapView.map.remove(cachedVolumeLayers.high);
      }
    }
    
    setCachedVolumeLayers({
      low: null,
      medium: null,
      high: null
    });
    setVolumeLayersCacheKey(null);
  };

  return {
    // Weighted layer cache (deprecated - keeping for backwards compatibility)
    cachedWeightedLayer,
    setCachedWeightedLayer,
    cachedExtentKey,
    setCachedExtentKey,
    
    // Volume categories cache (NEW)
    cachedVolumeLayers,
    setCachedVolumeLayers,
    volumeLayersCacheKey,
    setVolumeLayersCacheKey,
    
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
    clearWeightedCache,
    clearVolumeCategoriesCache
  };
}