import { useState, useEffect } from 'react';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import { queryAADTWithinPolygon, queryVolumeCountSitesWithinPolygon, getSelectedAreaDescription } from '../utilities/spatialQueries';

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