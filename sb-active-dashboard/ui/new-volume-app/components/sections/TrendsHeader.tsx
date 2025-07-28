import React from "react";

interface TrendsHeaderProps {
  activeTab: string;
  horizontalMargins: string;
}

export default function TrendsHeader({ activeTab, horizontalMargins }: TrendsHeaderProps) {
  const getHeaderText = () => {
    switch (activeTab) {
      case 'modeled-data':
        return 'Trends Derived From Modeled Data';
      case 'raw-data':
        return 'Raw Data Analytics';
      case 'data-completeness':
        return 'Data Completeness Metrics';
      default:
        return 'Data Analysis';
    }
  };

  return (
    <div className={horizontalMargins}>
      <h2 id="trends-header" className="text-xl font-semibold text-gray-900 mb-0">
        {getHeaderText()}
      </h2>
    </div>
  );
} 