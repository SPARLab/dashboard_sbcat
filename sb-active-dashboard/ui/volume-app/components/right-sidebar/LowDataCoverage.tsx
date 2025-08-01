import React from "react";

interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface LowDataCoverageProps {
  confidence?: ConfidenceLevel;
  contributingSites?: number;
  totalSites?: number;
  hasData?: boolean;
}

export default function LowDataCoverage({ 
  confidence, 
  contributingSites = 0, 
  totalSites = 0, 
  hasData = true 
}: LowDataCoverageProps) {
  // Don't render anything if there's no confidence data (no selected region)
  if (!confidence) {
    return null;
  }

  // Show "no data" message if there are no sites with data
  if (!hasData || totalSites === 0) {
    return (
      <div
        className="bg-gray-50 box-border flex flex-row gap-2.5 items-start justify-start p-[13px] relative rounded-md"
        id="low-data-coverage-warning-container"
      >
        <div className="absolute border border-solid border-gray-200 inset-0 pointer-events-none rounded-md" />
        <div
          className="basis-0 bg-[rgba(0,0,0,0)] box-border flex flex-row gap-3 grow items-start justify-start min-h-px min-w-px p-0 relative shrink-0"
          id="icon-text-container"
        >
          <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
          <div
            className="bg-[rgba(0,0,0,0)] h-6 relative shrink-0 w-4"
            id="warning-icon-container"
          >
            <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
            <div
              className="absolute box-border flex flex-row items-center justify-center left-0 overflow-clip p-0 size-4 top-1"
              id="warning-icon-frame"
            >
              <div
                className="relative shrink-0 size-4"
                id="warning-icon-inner-frame"
              >
                {confidence.icon}
              </div>
            </div>
          </div>
          <div
            className="basis-0 bg-[rgba(0,0,0,0)] box-border flex flex-col gap-[5px] grow items-start justify-start min-h-px min-w-px p-0 relative shrink-0"
            id="warning-text-container"
          >
            <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
            <div
              className="font-['Inter:Medium',_sans-serif] font-medium leading-[0] not-italic relative shrink-0 text-[14px] text-left text-nowrap text-gray-800"
              id="low-data-coverage-title"
            >
              <p className="block leading-[20px] whitespace-pre">
                No Data Available
              </p>
            </div>
            <div
              className="bg-[rgba(0,0,0,0)] box-border flex flex-row gap-2.5 items-center justify-start p-0 relative shrink-0 w-full"
              id="low-data-explanation-container"
            >
              <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
              <div
                className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[12px] text-left text-gray-700"
                id="low-data-explanation-text"
              >
                <p className="block leading-[16px]">
                  No count site data available for the selected region.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only show warning for low or medium confidence
  if (confidence.level === 'high') {
    return null;
  }

  const coveragePercent = totalSites > 0 ? Math.round((contributingSites / totalSites) * 100) : 0;
  
  const getCoverageTitle = (level: string) => {
    switch (level) {
      case 'medium':
        return 'Medium Data Coverage';
      case 'low':
        return 'Low Data Coverage';
      default:
        return 'Data Coverage';
    }
  };

  const getCoverageMessage = (level: string, percent: number) => {
    switch (level) {
      case 'medium':
        return `Selected area has ${percent}% data coverage. Results should be interpreted with some caution.`;
      case 'low':
        return `Selected area has only ${percent}% data coverage. Results may not be representative.`;
      default:
        return `Selected area has ${percent}% data coverage.`;
    }
  };

  return (
    <div
      className={`${confidence.bgColor} box-border flex flex-row gap-2.5 items-start justify-start p-[13px] relative rounded-md`}
      id="low-data-coverage-warning-container"
    >
      <div className={`absolute border border-solid ${confidence.borderColor} inset-0 pointer-events-none rounded-md`} />
      <div
        className="basis-0 bg-[rgba(0,0,0,0)] box-border flex flex-row gap-3 grow items-start justify-start min-h-px min-w-px p-0 relative shrink-0"
        id="icon-text-container"
      >
        <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
        <div
          className="bg-[rgba(0,0,0,0)] h-6 relative shrink-0 w-4"
          id="warning-icon-container"
        >
          <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
          <div
            className="absolute box-border flex flex-row items-center justify-center left-0 overflow-clip p-0 size-4 top-1"
            id="warning-icon-frame"
          >
            <div
              className="relative shrink-0 size-4"
              id="warning-icon-inner-frame"
            >
              {confidence.icon}
            </div>
          </div>
        </div>
        <div
          className="basis-0 bg-[rgba(0,0,0,0)] box-border flex flex-col gap-[5px] grow items-start justify-start min-h-px min-w-px p-0 relative shrink-0"
          id="warning-text-container"
        >
          <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
          <div
            className={`font-['Inter:Medium',_sans-serif] font-medium leading-[0] not-italic relative shrink-0 text-[14px] text-left text-nowrap ${confidence.color}`}
            id="low-data-coverage-title"
          >
            <p className="block leading-[20px] whitespace-pre">
              {getCoverageTitle(confidence.level)}
            </p>
          </div>
          <div
            className="bg-[rgba(0,0,0,0)] box-border flex flex-row gap-2.5 items-center justify-start p-0 relative shrink-0 w-full"
            id="low-data-explanation-container"
          >
            <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
            <div
              className={`basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[12px] text-left ${confidence.color}`}
              id="low-data-explanation-text"
            >
              <p className="block leading-[16px]">
                {getCoverageMessage(confidence.level, coveragePercent)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 