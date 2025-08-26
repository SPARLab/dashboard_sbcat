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
          <div id="switrs-data">
            <strong className="text-gray-900">SWITRS (Police Reports):</strong> Official crash reports from 
            the Statewide Integrated Traffic Records System, maintained by the California Highway Patrol. 
            Includes incidents reported to law enforcement with formal documentation.
          </div>
          <div id="bikemaps-data">
            <strong className="text-gray-900">BikeMaps.org:</strong> Crowdsourced incident reports submitted 
            directly by cyclists and pedestrians. Includes near-misses, hazards, and incidents that may 
            not have been reported to police.
          </div>
        </div>
      </div>

      <div id="safety-limitations" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Data Limitations</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div id="underreporting">
            <strong className="text-gray-900">Underreporting:</strong> Many bicycle and pedestrian incidents 
            go unreported, especially minor injuries, near-misses, and incidents not involving motor vehicles. 
            This data represents only documented cases.
          </div>
          <div id="reporting-bias">
            <strong className="text-gray-900">Reporting Bias:</strong> SWITRS data may be biased toward 
            more severe incidents and those involving vehicles. BikeMaps.org data may be biased toward 
            tech-savvy users and certain geographic areas.
          </div>
          <div id="data-quality">
            <strong className="text-gray-900">Data Quality:</strong> Location accuracy, incident classification, 
            and severity assessments may vary between sources and individual reports. Some incidents may 
            be misclassified or contain incomplete information.
          </div>
          <div id="temporal-gaps">
            <strong className="text-gray-900">Temporal Coverage:</strong> Data availability varies by source 
            and location. Historical data may be incomplete, and there may be delays in official reporting.
          </div>
          <div id="incident-complexity">
            <strong className="text-gray-900">Incident Complexity:</strong> Multi-party incidents or complex 
            scenarios may be simplified in the data. Contributing factors like weather, lighting, or 
            infrastructure conditions may not be fully captured.
          </div>
        </div>
      </div>

      <div id="safety-usage-guidance" className="bg-red-50 border-l-4 border-red-400 p-4">
        <h4 className="text-base font-semibold text-red-800 mb-2">Important Notice</h4>
        <p className="text-sm text-red-700">
          This data should not be used as the sole basis for safety assessments or infrastructure decisions. 
          The absence of reported incidents does not indicate safety, and high incident areas may reflect 
          reporting patterns rather than actual risk levels. Always combine this data with field observations, 
          traffic studies, and community input for comprehensive safety analysis.
        </p>
      </div>
    </div>
  );
}
