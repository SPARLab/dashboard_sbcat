import { useState, useEffect } from 'react';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import { queryAADTWithinPolygon, getSelectedAreaDescription } from '../utilities/spatialQueries';

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