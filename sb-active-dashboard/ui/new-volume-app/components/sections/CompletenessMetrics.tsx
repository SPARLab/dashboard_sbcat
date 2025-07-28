import React from "react";

interface CompletenessMetricsProps {
  horizontalMargins: string;
}

export default function CompletenessMetrics({ horizontalMargins }: CompletenessMetricsProps) {
  return (
    <div className={`mt-6 py-4 bg-purple-50 border border-purple-200 rounded px-4 ${horizontalMargins}`}>
      <h3 className="text-base font-medium text-purple-800 mb-2">Data Completeness Analysis</h3>
      <div className="space-y-2 text-sm text-purple-700">
        <div>• Geographic coverage gaps</div>
        <div>• Temporal data availability</div>
        <div>• Quality assessment scores</div>
        <div>• Missing data patterns</div>
      </div>
    </div>
  );
} 