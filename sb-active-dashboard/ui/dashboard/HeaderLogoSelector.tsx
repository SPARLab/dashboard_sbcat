import React, { useState, useRef, useEffect } from "react";
import { HEADER_LOGOS, HeaderLogo } from "@/ui/theme/headerLogos";

interface HeaderLogoSelectorProps {
  selectedLogoId: string;
  onLogoChange: (logoId: string) => void;
}

export default function HeaderLogoSelector({
  selectedLogoId,
  onLogoChange,
}: HeaderLogoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLogo = HEADER_LOGOS.find((logo) => logo.id === selectedLogoId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (logoId: string) => {
    onLogoChange(logoId);
    setIsOpen(false);
  };

  return (
    <div id="header-logo-selector" className="relative" ref={dropdownRef}>
      {/* Transparent trigger button */}
      <button
        id="header-logo-selector-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all outline-none focus:outline-none"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          color: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
        }}
      >
        <LogoPreview logo={selectedLogo!} size={18} />
        <span>Logo</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          id="header-logo-selector-menu"
          className="absolute top-full mt-2 left-0 z-50 rounded-xl overflow-hidden min-w-[180px]"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            colorScheme: "light",
          }}
        >
          <div className="py-2">
            {HEADER_LOGOS.map((logo) => {
              const isSelected = logo.id === selectedLogoId;
              return (
                <button
                  key={logo.id}
                  id={`header-logo-option-${logo.id}`}
                  type="button"
                  onClick={() => handleSelect(logo.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none focus:outline-none"
                  style={{
                    backgroundColor: isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    color: isSelected ? "#1e40af" : "#374151",
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: "14px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent";
                  }}
                >
                  <LogoPreview logo={logo} size={24} />
                  <span>{logo.name}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LogoPreview({ logo, size }: { logo: HeaderLogo; size: number }) {
  return (
    <div
      className="rounded flex-shrink-0 flex items-center justify-center bg-white/80"
      style={{
        width: size * 2,
        height: size,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
      }}
    >
      <img
        src={logo.path}
        alt={logo.name}
        style={{
          width: "auto",
          height: size * 0.8,
          objectFit: "contain",
        }}
      />
    </div>
  );
}
