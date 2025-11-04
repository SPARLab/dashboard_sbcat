import React, { useState, useRef, useEffect, ReactNode } from "react";
import ReactDOM from "react-dom";
const tooltipInfoIcon = "/icons/tooltip-info-icon.svg";

interface TooltipProps {
  text: string;
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TooltipContentProps {
  text: string;
  align: 'left' | 'center' | 'right';
  triggerRef: React.RefObject<HTMLDivElement | null>;
  width?: string;
}

const TooltipContent = ({ text, align, triggerRef, width = 'max-w-sm' }: TooltipContentProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    let left;

    switch (align) {
      case 'left':
        left = triggerRect.left;
        break;
      case 'right':
        left = triggerRect.right; 
        break;
      case 'center':
      default:
        left = triggerRect.left + triggerRect.width / 2;
        break;
    }

    setPosition({
      top: triggerRect.top - 16,
      left: left
    });
  }, [align, triggerRef]);

  const getTooltipPositioning = () => {
    switch (align) {
      case 'left':
        return {
          tooltip: `fixed px-3 py-2 bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded-lg shadow-lg ${width} z-[9999]`,
          arrow: "absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"
        };
      case 'right':
        return {
          tooltip: `fixed px-3 py-2 bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded-lg shadow-lg ${width} z-[9999]`,
          arrow: "absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"
        };
      case 'center':
      default:
        return {
          tooltip: `fixed px-3 py-2 bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded-lg shadow-lg ${width} z-[9999]`,
          arrow: "absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"
        };
    }
  };

  const positioning = getTooltipPositioning();
  let style: React.CSSProperties = { top: `${position.top}px`, left: `${position.left}px`, transform: 'translateY(-100%)' };
  if (align === 'center') {
    style.transform = 'translate(-50%, -100%)';
  }
  if (align === 'right') {
    style.transform = 'translate(-100%, -100%)';
  }

  return ReactDOM.createPortal(
    <div className={positioning.tooltip} style={style}>
      {text}
      <div className={positioning.arrow}></div>
    </div>,
    document.getElementById('tooltip-portal')!
  );
};

export default function Tooltip({ text, children, className = "", align = 'center', width }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div 
        ref={triggerRef}
        className={`cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children || (
          <div className="bg-[rgba(191,191,191,0.25)] border-[#4d4d4d] border-[0.714px] border-solid flex items-center justify-center p-0.5 relative rounded-[8.571px] size-4">
            <img 
              alt="More information" 
              className="block max-w-none size-4" 
              src={tooltipInfoIcon} 
            />
          </div>
        )}
      </div>
      {showTooltip && <TooltipContent text={text} align={align} triggerRef={triggerRef} width={width} />}
    </>
  );
} 