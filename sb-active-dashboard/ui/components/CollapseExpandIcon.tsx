import React from "react";

interface CollapseExpandIconProps {
  isCollapsed: boolean;
  onClick: () => void;
  id?: string;
}

export default function CollapseExpandIcon({ isCollapsed, onClick, id }: CollapseExpandIconProps) {
  return (
    <button id={id} onClick={onClick} className="bg-transparent border-0 p-0 focus:outline-none">
      <img
        id={id ? `${id}-image` : undefined}
        alt={isCollapsed ? "Expand" : "Collapse"}
        className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
        src="/icons/collapse-expand-icon.svg"
      />
    </button>
  );
} 