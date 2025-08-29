import { useState, useEffect } from 'react';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import Polygon from "@arcgis/core/geometry/Polygon";
import { queryAADTWithinPolygon, queryVolumeCountSitesWithinPolygon, getSelectedAreaDescription } from '../utilities/spatialQueries';
import { SafetyIncidentsDataService } from '../data-services/SafetyIncidentsDataService';
import { SafetySpatialQueryService } from '../data-services/SafetySpatialQueryService';
import { SafetyFilters, SafetyAnalysisResult, SafetySummaryData, EnrichedSafetyIncident } from '../safety-app/types';
import { CountSiteProcessingService } from '../utilities/volume-utils/count-site-processing';

interface SpatialQueryResult {
  aadtFeatures: Array<{
    objectId: number;
    name: string;
    locality: string;
    all_aadt: number;
    weekday_aadt: number;
    weekend_aadt: number;
  }>;
  totalCount: number;
  averageAADT: number;
  totalAADT: number;
  medianPedestrianWeekdayAADT?: number;
  medianPedestrianWeekendAADT?: number;
  medianBikeWeekdayAADT?: number;
  medianBikeWeekendAADT?: number;
}

interface UseSpatialQueryResult {
  result: SpatialQueryResult | null;
  isLoading: boolean;
  error: string | null;
  areaDescription: string | null;
}

export const useSpatialQuery = (
  aadtLayer: FeatureLayer | null,
  selectedGeometry: Polygon | null
): UseSpatialQueryResult => {
  const [result, setResult] = useState<SpatialQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areaDescription, setAreaDescription] = useState<string | null>(null);

  useEffect(() => {
    const performQuery = async () => {
      if (!aadtLayer || !selectedGeometry) {
        setResult(null);
        setAreaDescription(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const queryResult = await queryAADTWithinPolygon(aadtLayer, selectedGeometry);
        setResult(queryResult);
        
        const description = getSelectedAreaDescription(selectedGeometry, queryResult);
        setAreaDescription(description);
      } catch (err) {
        console.error('Spatial query failed:', err);
        setError('Failed to query features within selected area');
        setResult(null);
        setAreaDescription(null);
      } finally {
        setIsLoading(false);
      }
    };

    performQuery();
  }, [aadtLayer, selectedGeometry]);

  return {
    result,
    isLoading,
    error,
    areaDescription,
  };
};

/**
 * Hook for volume app spatial queries with median calculations
 * Works with the three-table structure: Sites + AADT table
 */
export const useVolumeSpatialQuery = (
  sitesLayer: FeatureLayer | null,
  aadtTable: FeatureLayer | null,
  selectedGeometry: Polygon | null
): UseSpatialQueryResult => {
  const [result, setResult] = useState<SpatialQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areaDescription, setAreaDescription] = useState<string | null>(null);

  useEffect(() => {
    const performQuery = async () => {
      if (!sitesLayer || !aadtTable || !selectedGeometry) {
        setResult(null);
        setAreaDescription(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const queryResult = await queryVolumeCountSitesWithinPolygon(
          sitesLayer, 
          aadtTable, 
          selectedGeometry
        );

        setResult(queryResult);
        
        const description = getSelectedAreaDescription(selectedGeometry, queryResult);
        setAreaDescription(description);
      } catch (err) {
        console.error('Volume spatial query failed:', err);
        setError('Failed to query count sites within selected area');
        setResult(null);
        setAreaDescription(null);
      } finally {
        setIsLoading(false);
      }
    };

    performQuery();
  }, [sitesLayer, aadtTable, selectedGeometry]);

  return {
    result,
    isLoading,
    error,
    areaDescription,
  };
};

/**
 * Hook for safety app spatial queries
 * Queries safety incidents within a selected polygon with applied filters
 */
export const useSafetySpatialQuery = (
  selectedGeometry: Polygon | null,
  filters?: Partial<SafetyFilters>,
  debounceMs: number = 350
): {
  result: SafetyAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
} => {
  const [result, setResult] = useState<SafetyAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = { current: 0 } as { current: number }; // simple ref without importing useRef

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleQuery = () => {
      if (!selectedGeometry) {
        console.debug('[useSafetySpatialQuery] No geometry; clearing state.');
        setResult(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setError(null);
      console.debug('[useSafetySpatialQuery] Scheduling query in', debounceMs, 'ms', {
        filters: filters ? JSON.parse(JSON.stringify(filters)) : undefined,
      });

      timer = setTimeout(async () => {
        if (cancelled) return;
        const myRequestId = ++requestIdRef.current;
        setIsLoading(true);
        
        // 🔍 DEBUG: Log detailed geometry information before query
        console.group('🔍 [SAFETY DEBUG] useSafetySpatialQuery - Starting Query');
        console.log('Query ID:', myRequestId);
        console.log('Selected geometry:', selectedGeometry);
        
        if (selectedGeometry) {
          console.log('Geometry details:');
          console.log('  Type:', selectedGeometry.type);
          console.log('  Spatial Reference WKID:', selectedGeometry.spatialReference?.wkid);
          console.log('  Number of rings:', selectedGeometry.rings?.length);
          console.log('  Extent:', {
            xmin: selectedGeometry.extent?.xmin,
            ymin: selectedGeometry.extent?.ymin,
            xmax: selectedGeometry.extent?.xmax,
            ymax: selectedGeometry.extent?.ymax
          });
          
          if (selectedGeometry.rings && selectedGeometry.rings.length > 0) {
            console.log('  First ring sample coordinates (first 3 points):');
            selectedGeometry.rings[0].slice(0, 3).forEach((point, index) => {
              console.log(`    Point ${index}: [${point[0]}, ${point[1]}]`);
            });
          }
        }
        
        console.log('Applied filters:', filters ? JSON.parse(JSON.stringify(filters)) : 'none');
        console.groupEnd();
        
        console.debug('[useSafetySpatialQuery] Executing query id', myRequestId);
        try {
          const queryResult = await SafetyIncidentsDataService.getEnrichedSafetyData(
            selectedGeometry,
            filters
          );

          // 🔍 DEBUG: Log query results
          console.group('🔍 [SAFETY DEBUG] useSafetySpatialQuery - Query Results');
          console.log('Query ID:', myRequestId);
          console.log('Result summary:', queryResult?.summary);
          console.log('Total incidents found:', queryResult?.data?.length || 0);
          console.log('Is loading:', queryResult?.isLoading);
          console.log('Error:', queryResult?.error);
          console.groupEnd();

          if (!cancelled && myRequestId === requestIdRef.current) {
            setResult(queryResult);
            console.debug('[useSafetySpatialQuery] Query id', myRequestId, 'completed');
          }
        } catch (err) {
          console.error('Safety spatial query failed:', err);
          if (!cancelled && myRequestId === requestIdRef.current) {
            setError('Failed to query safety incidents within selected area');
            setResult(null);
          }
        } finally {
          if (!cancelled && myRequestId === requestIdRef.current) {
            setIsLoading(false);
          }
        }
      }, Math.max(0, debounceMs));
    };

    scheduleQuery();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      console.debug('[useSafetySpatialQuery] Cancelled pending timer');
    };
  }, [selectedGeometry, JSON.stringify(filters), debounceMs]); // Stringify filters to ensure proper dependency tracking

  return {
    result,
    isLoading,
    error,
  };
};

/**
 * NEW: Hook for safety spatial queries using rendered layer view (FAST!)
 * This queries the already-rendered features on the map instead of making server requests
 */
export const useSafetyLayerViewSpatialQuery = (
  mapView: MapView | null,
  incidentsLayer: FeatureLayer | null,
  selectedGeometry: Polygon | null,
  filters?: Partial<SafetyFilters>,
  debounceMs: number = 300
): {
  result: { incidents: EnrichedSafetyIncident[]; summary: SafetySummaryData } | null;
  isLoading: boolean;
  error: string | null;
} => {
  const [result, setResult] = useState<{ incidents: EnrichedSafetyIncident[]; summary: SafetySummaryData } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapView || !incidentsLayer || !selectedGeometry) {
      setResult(null);
      setError(null);
      return;
    }

    console.log('🔍 [useSafetyLayerViewSpatialQuery] Starting layer view query');
    console.log('MapView:', !!mapView);
    console.log('IncidentsLayer:', !!incidentsLayer);
    console.log('Selected geometry:', selectedGeometry);

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const queryResult = await SafetySpatialQueryService.queryIncidentsWithinPolygon(
          mapView,
          incidentsLayer,
          selectedGeometry,
          filters
        );

        if (!cancelled) {
          if (queryResult.error) {
            setError(queryResult.error);
            setResult(null);
          } else {
            setResult({
              incidents: queryResult.incidents,
              summary: queryResult.summary
            });
            console.log('🔍 [useSafetyLayerViewSpatialQuery] Success:', queryResult.summary.totalIncidents, 'incidents found');
          }
        }
      } catch (err) {
        console.error('Safety layer view spatial query failed:', err);
        if (!cancelled) {
          setError('Failed to query safety incidents within selected area');
          setResult(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mapView, incidentsLayer, selectedGeometry, filters, debounceMs]);

  return {
    result,
    isLoading,
    error,
  };
};

/**
 * Hook for enhanced AADV summary statistics using the new calculation method
 * Used by: SummaryStatistics component (updated version)
 */
export const useEnhancedAADVSummaryQuery = (
  sitesLayer: FeatureLayer | null,
  selectedGeometry: Polygon | null,
  dateRange: { startDate: Date; endDate: Date },
  filters: { showBicyclist: boolean; showPedestrian: boolean }
): {
  result: {
    totalCount: number;
    medianPedestrianWeekdayAADV?: number;
    medianPedestrianWeekendAADV?: number;
    medianBikeWeekdayAADV?: number;
    medianBikeWeekendAADV?: number;
  } | null;
  isLoading: boolean;
  error: string | null;
} => {
  const [result, setResult] = useState<{
    totalCount: number;
    medianPedestrianWeekdayAADV?: number;
    medianPedestrianWeekendAADV?: number;
    medianBikeWeekdayAADV?: number;
    medianBikeWeekendAADV?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performQuery = async () => {
      if (!sitesLayer || !selectedGeometry) {
        setResult(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const queryResult = await CountSiteProcessingService.getEnhancedAADVSummaryStatistics(
          sitesLayer,
          selectedGeometry,
          dateRange,
          filters
        );

        setResult(queryResult);
      } catch (err) {
        console.error('Enhanced AADV summary query failed:', err);
        setError('Failed to calculate enhanced AADV summary statistics');
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    };

    performQuery();
  }, [sitesLayer, selectedGeometry, dateRange, filters.showBicyclist, filters.showPedestrian]);

  return {
    result,
    isLoading,
    error,
  };
};