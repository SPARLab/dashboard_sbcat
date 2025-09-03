import React from 'react';

export default function SafetyDataDisclaimer() {
  return (
    <div id="safety-disclaimer-content" className="space-y-4">
      <div id="safety-disclaimer-intro" className="text-gray-700">
        <p className="text-base leading-relaxed">
          This dashboard displays bicycle and pedestrian safety incident data from multiple sources. 
          Please review the following important information about our data sources and limitations.
        </p>
      </div>

      <div id="safety-data-sources" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="mb-2">Our data comes from two main sources:</p>
          <div id="switrs-data">
            <strong className="text-gray-900">SWITRS (Police Reports):</strong> Official crash reports 
            maintained by the California Highway Patrol, which include incidents reported to law enforcement.
          </div>
          <div id="bikemaps-data">
            <strong className="text-gray-900">BikeMaps.org:</strong> Crowdsourced incident reports submitted 
            by cyclists and pedestrians, including near-misses and hazards.
          </div>
        </div>
      </div>

      <div id="safety-limitations" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Limitations</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="mb-2">Keep these limitations in mind when using the dashboard:</p>
          <div id="underreporting">
            <strong className="text-gray-900">Underreporting:</strong> Many incidents go unreported, 
            particularly minor ones and near-misses. This data only represents documented cases.
          </div>
          <div id="reporting-bias">
            <strong className="text-gray-900">Reporting Bias:</strong> Data may be biased toward 
            severe incidents (SWITRS) or tech-savvy users (BikeMaps.org).
          </div>
          <div id="data-quality">
            <strong className="text-gray-900">Data Quality:</strong> Location, classification, and severity 
            information can vary. Incidents may be misclassified or have incomplete details.
          </div>
          <div id="temporal-gaps">
            <strong className="text-gray-900">Temporal Coverage:</strong> Data availability varies by source 
            and can have reporting delays.
          </div>
          <div id="incident-complexity">
            <strong className="text-gray-900">Incident Complexity:</strong> Contributing factors like weather 
            or lighting may not be fully captured.
          </div>
        </div>
      </div>

      <div id="safety-usage-guidance" className="bg-red-50 border-l-4 border-red-400 p-4">
        <h4 className="text-base font-semibold text-red-800 mb-2">Important Notice</h4>
        <p className="text-sm text-red-700">
          Do not use this data alone for safety assessments or infrastructure decisions. The absence of 
          reported incidents doesn't mean an area is safe; high incident counts may just reflect higher 
          reporting. Always combine this data with on-site observations, traffic studies, and community 
          feedback for a complete safety analysis.
        </p>
      </div>
    </div>
  );
}
