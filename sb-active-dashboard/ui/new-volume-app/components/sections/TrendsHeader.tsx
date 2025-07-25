import React from "react";

interface TrendsHeaderProps {
  activeTab: string;
}

export default function TrendsHeader({ activeTab }: TrendsHeaderProps) {
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
    <h2 id="trends-header" className="text-xl font-semibold text-gray-900 mb-6">
      {getHeaderText()}
    </h2>
  );
} 