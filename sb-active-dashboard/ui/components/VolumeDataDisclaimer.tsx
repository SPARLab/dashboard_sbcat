import React from 'react';

export default function VolumeDataDisclaimer() {
  return (
    <div id="volume-disclaimer-content" className="space-y-4">
      <div id="volume-disclaimer-intro" className="text-gray-700">
        <p className="text-base leading-relaxed">
          This dashboard displays bicycle and pedestrian volume data collected through various methods. 
          Please review the following important information about our data sources and limitations.
        </p>
      </div>

      <div id="volume-data-sources" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div id="raw-count-data">
            <strong className="text-gray-900">Raw Count Data:</strong> Collected from permanent and temporary 
            counting stations throughout Santa Barbara County using pneumatic tubes, infrared sensors, 
            and manual counting methods.
          </div>
          <div id="modeled-data">
            <strong className="text-gray-900">Modeled Data:</strong> Generated using two approaches:
            <ul className="ml-4 mt-1 space-y-1">
              <li>• <strong>Cost-Benefit Tool:</strong> Statistical models based on land use, demographics, and infrastructure</li>
              <li>• <strong>Strava Bias-Corrected:</strong> Strava activity data adjusted for demographic and usage biases</li>
            </ul>
          </div>
        </div>
      </div>

      <div id="volume-limitations" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Limitations</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div id="temporal-coverage">
            <strong className="text-gray-900">Temporal Coverage:</strong> Count data availability varies significantly by location. 
            Most sites have sparse, intermittent data collection periods rather than continuous monitoring.
          </div>
          <div id="spatial-coverage">
            <strong className="text-gray-900">Spatial Coverage:</strong> Count sites are not uniformly distributed. 
            Rural areas and some neighborhoods may have limited or no direct count data.
          </div>
          <div id="weather-events">
            <strong className="text-gray-900">Weather & Events:</strong> Data may be affected by weather conditions, 
            special events, construction, or equipment malfunctions that are not always filtered out.
          </div>
          <div id="modeled-uncertainty">
            <strong className="text-gray-900">Modeled Data Uncertainty:</strong> Estimated volumes are predictions 
            based on available data and may not reflect actual usage, especially in areas with limited ground-truth data.
          </div>
        </div>
      </div>

      <div id="volume-usage-guidance" className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <h4 className="text-base font-semibold text-yellow-800 mb-2">Usage Guidance</h4>
        <p className="text-sm text-yellow-700">
          This data is intended for planning and analysis purposes. For critical infrastructure decisions, 
          consider supplementing with additional site-specific counts or studies. Always verify data 
          currency and relevance for your specific use case.
        </p>
      </div>
    </div>
  );
}
