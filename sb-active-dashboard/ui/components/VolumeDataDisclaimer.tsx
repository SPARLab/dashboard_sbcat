import React from 'react';

export default function VolumeDataDisclaimer() {
  return (
    <div id="volume-disclaimer-content" className="space-y-4">
      <div id="volume-disclaimer-intro" className="text-gray-700">
        <p className="text-base leading-relaxed">
          This dashboard presents bicycle and pedestrian volume data. It's important to understand the data sources and their limitations to interpret the information correctly.
        </p>
      </div>

      <div id="volume-data-sources" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="mb-2">Our data comes from two main sources:</p>
          <div id="raw-count-data">
            <strong className="text-gray-900">Raw Count Data:</strong> Collected from permanent and temporary stations across Santa Barbara County using pneumatic tubes, infrared sensors, and manual counts.
          </div>
          <div id="modeled-data">
            <strong className="text-gray-900">Modeled Data:</strong> Generated using statistical models based on land use and demographics, and Strava activity data adjusted for biases.
          </div>
        </div>
      </div>

      <div id="volume-limitations" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Limitations</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="mb-2">Keep these limitations in mind when using the dashboard:</p>
          <div id="temporal-spatial-gaps">
            <strong className="text-gray-900">Temporal and Spatial Gaps:</strong> Data collection isn't continuous or uniform. Most sites have intermittent data, and rural areas may lack coverage.
          </div>
          <div id="external-factors">
            <strong className="text-gray-900">External Factors:</strong> Data can be influenced by weather, special events, construction, or equipment issues that are not always accounted for.
          </div>
          <div id="modeled-uncertainty">
            <strong className="text-gray-900">Modeled Data Uncertainty:</strong> Modeled volumes are predictions and may not accurately reflect actual usage, especially in areas with limited direct counts.
          </div>
        </div>
      </div>
    </div>
  );
}
