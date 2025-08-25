import React from "react";
import MoreInformationIcon from "./MoreInformationIcon";

interface EnhancedDataNormalizationProps {
  horizontalMargins?: string;
}

export default function EnhancedDataNormalization({ 
  horizontalMargins = "mx-4" 
}: EnhancedDataNormalizationProps) {
  return (
    <div id="enhanced-data-normalization-card" className="p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="text-xs text-blue-900">
        <p className="mb-2">
          <strong>Enhanced Data Normalization:</strong> Volume data is normalized using a comprehensive approach:
        </p>
        <ul className="mt-1 text-xs ml-3 list-disc space-y-1">
          <li><strong>Hourly variations:</strong> NBPD factors normalize time-of-day fluctuations</li>
          <li><strong>Daily variations:</strong> Santa Cruz factors normalize day-of-week patterns</li>
          <li><strong>Monthly variations:</strong> Santa Cruz factors normalize seasonal patterns</li>
        </ul>
        <p className="mt-2">
          This multi-layered approach provides the best estimate of Average Annual Daily Volume (AADV) we can provide given the limited raw count data.
        </p>
      </div>
    </div>
  );
}
