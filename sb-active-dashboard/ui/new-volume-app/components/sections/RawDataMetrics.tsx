import React from "react";

export default function RawDataMetrics() {
  return (
    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
      <h3 className="text-base font-medium text-green-800 mb-2">Raw Data Metrics</h3>
      <div className="space-y-2 text-sm text-green-700">
        <div>• Data source quality indicators</div>
        <div>• Upload validation results</div>
        <div>• File processing status</div>
        <div>• Raw count statistics</div>
      </div>
    </div>
  );
} 