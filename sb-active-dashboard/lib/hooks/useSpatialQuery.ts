import { useState, useEffect } from 'react';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import { queryAADTWithinPolygon, queryVolumeCountSitesWithinPolygon, getSelectedAreaDescription } from '../utilities/spatialQueries';
import { SafetyIncidentsDataService } from '../data-services/SafetyIncidentsDataService';
import { SafetyFilters, SafetyAnalysisResult } from '../safety-app/types';

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
        console.debug('[useSafetySpatialQuery] Executing query id', myRequestId);
        try {
          const queryResult = await SafetyIncidentsDataService.getEnrichedSafetyData(
            selectedGeometry,
            filters
          );

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