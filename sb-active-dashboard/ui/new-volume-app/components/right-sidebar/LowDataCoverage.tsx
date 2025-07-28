import React from "react";

export default function LowDataCoverage() {
  return (
    <div
      className="bg-yellow-50 box-border flex flex-row gap-2.5 items-start justify-start p-[13px] relative rounded-md"
      id="low-data-coverage-warning-container"
    >
      <div className="absolute border border-solid border-yellow-200 inset-0 pointer-events-none rounded-md" />
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
              <img alt="Warning Icon" className="block max-w-none size-full" src="http://localhost:3845/assets/51b3df231f4a48e01a66e96063310b784abae433.svg" />
            </div>
          </div>
        </div>
        <div
          className="basis-0 bg-[rgba(0,0,0,0)] box-border flex flex-col gap-[5px] grow items-start justify-start min-h-px min-w-px p-0 relative shrink-0"
          id="warning-text-container"
        >
          <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
          <div
            className="font-['Inter:Medium',_sans-serif] font-medium leading-[0] not-italic relative shrink-0 text-[14px] text-left text-nowrap text-yellow-800"
            id="low-data-coverage-title"
          >
            <p className="block leading-[20px] whitespace-pre">
              Low Data Coverage
            </p>
          </div>
          <div
            className="bg-[rgba(0,0,0,0)] box-border flex flex-row gap-2.5 items-center justify-start p-0 relative shrink-0 w-full"
            id="low-data-explanation-container"
          >
            <div className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
            <div
              className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow h-[31.834px] leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[12px] text-left text-yellow-700"
              id="low-data-explanation-text"
            >
              <p className="block leading-[16px]">
                Selected area has only 42% data coverage. Results may not be
                representative.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 