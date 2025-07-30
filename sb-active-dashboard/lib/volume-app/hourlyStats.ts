"use client";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";

export interface HourlyData {
  hour: number;
  bikeCount: number;
  pedCount: number;
}

export interface HourlyStats {
  hourlyData: HourlyData[];
  totalBikeCount: number;
  totalPedCount: number;
}

// Query hourly counts from the AADT Counts table
export async function queryHourlyCounts(
  mapView: MapView,
  showBicyclist: boolean,
  showPedestrian: boolean
): Promise<HourlyStats> {
  try {
    // Create a FeatureLayer for the Counts table
    const countsLayer = new FeatureLayer({
      url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1",
    });

    // First, get the count sites in the current view
    const sitesLayer = new FeatureLayer({
      url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0",
    });

    // Query sites in the current map extent
    const sitesQuery = await sitesLayer.queryFeatures({
      geometry: mapView.extent,
      spatialRelationship: "intersects",
      outFields: ["id"],
      returnGeometry: false,
    });

    if (sitesQuery.features.length === 0) {
      return getEmptyHourlyStats();
    }

    // Get site IDs from the query results
    const siteIds = sitesQuery.features.map(feature => feature.attributes.id);
    
    // Build the where clause for count types
    const countTypeConditions = [];
    if (showBicyclist) countTypeConditions.push("count_type = 'bike'");
    if (showPedestrian) countTypeConditions.push("count_type = 'ped'");
    
    if (countTypeConditions.length === 0) {
      return getEmptyHourlyStats();
    }

    const whereClause = `site_id IN (${siteIds.join(',')}) AND (${countTypeConditions.join(' OR ')})`;

    // Use server-side aggregation for hourly data (sum and count)
    const query = countsLayer.createQuery();
    query.where = whereClause;
    query.outStatistics = [
      {
        statisticType: "sum",
        onStatisticField: "counts",
        outStatisticFieldName: "total_counts"
      },
      {
        statisticType: "count",
        onStatisticField: "counts",
        outStatisticFieldName: "num_records"
      }
    ];
    query.groupByFieldsForStatistics = ["EXTRACT(HOUR FROM timestamp) as hour", "count_type"];
    query.orderByFields = ["hour ASC", "count_type ASC"];
    query.returnGeometry = false;

    const countsQuery = await countsLayer.queryFeatures(query);

    // Aggregate the data by hour (using average)
    return aggregateHourlyData(countsQuery.features);

  } catch (error) {
    console.error("Error querying hourly counts:", error);
    return getEmptyHourlyStats();
  }
}

// Aggregate hourly data from query results
function aggregateHourlyData(features: any[]): HourlyStats {
  // Initialize hourly data structure (0-23 hours)
  const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    bikeCount: 0,
    pedCount: 0,
  }));

  let totalBikeCount = 0;
  let totalPedCount = 0;

  // Process each feature and aggregate by hour
  features.forEach(feature => {
    const hour = feature.attributes.hour;
    const sum = feature.attributes.total_counts;
    const numRecords = feature.attributes.num_records;
    const avg = numRecords > 0 ? sum / numRecords : 0;
    const countType = feature.attributes.count_type;

    if (hour >= 0 && hour < 24) {
      if (countType === 'bike') {
        hourlyData[hour].bikeCount = avg;
        totalBikeCount += avg;
      } else if (countType === 'ped') {
        hourlyData[hour].pedCount = avg;
        totalPedCount += avg;
      }
    }
  });

  return {
    hourlyData,
    totalBikeCount,
    totalPedCount,
  };
}

// Return empty hourly stats when no data is available
function getEmptyHourlyStats(): HourlyStats {
  const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    bikeCount: 0,
    pedCount: 0,
  }));

  return {
    hourlyData,
    totalBikeCount: 0,
    totalPedCount: 0,
  };
} 