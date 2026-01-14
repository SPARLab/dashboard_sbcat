import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import DisclaimerModal from "@/ui/components/DisclaimerModal";
import HeaderThemeSelector from "./HeaderThemeSelector";
import {
  DEFAULT_THEME_ID,
  HEADER_THEME_STORAGE_KEY,
  getThemeById,
  getGradientStyle,
} from "@/ui/theme/headerThemes";

interface AppInfo {
  name: string;
  link?: string;
  comingSoon?: boolean;
}

interface HeaderProps {
  apps: AppInfo[];
}

export default function Header({ apps }: HeaderProps) {
  const location = useLocation();
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false);
  const [themeId, setThemeId] = useState(() => {
    const stored = localStorage.getItem(HEADER_THEME_STORAGE_KEY);
    return stored ?? DEFAULT_THEME_ID;
  });

  const currentTheme = getThemeById(themeId);

  useEffect(() => {
    localStorage.setItem(HEADER_THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  return (
    <>
      <header
        id="dashboard-header"
        className="sticky top-0 z-40 w-full"
        style={{ background: getGradientStyle(currentTheme) }}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <h1 id="dashboard-title" className="text-lg font-semibold text-white">
            ACTIVE SB
          </h1>

          <nav id="header-navigation" className="flex items-center gap-2">
            <HeaderThemeSelector
              selectedThemeId={themeId}
              onThemeChange={setThemeId}
            />

            <div className="w-px h-5 bg-white/30 mx-2" />

            {apps?.map((appInfo, index) => {
              const isActive = appInfo.link
                ? location.pathname.startsWith(appInfo.link)
                : false;
              const isComingSoon = appInfo.comingSoon;

              if (isComingSoon) {
                return (
                  <button
                    id={`header-${appInfo.name.toLowerCase()}-button`}
                    key={index}
                    type="button"
                    onClick={() => setComingSoonModalOpen(true)}
                    className="text-base font-bold rounded-lg transition-colors outline-none focus:outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#9ca3af",
                      padding: "8px 16px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                      e.currentTarget.style.color = "#6b7280";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.color = "#9ca3af";
                    }}
                  >
                    {appInfo.name}
                  </button>
                );
              }

              return (
                <Link
                  id={`header-${appInfo.name.toLowerCase()}-button`}
                  key={index}
                  to={appInfo.link!}
                  className="text-base font-bold rounded-lg transition-colors outline-none focus:outline-none"
                  style={{
                    backgroundColor: "#ffffff",
                    color: isActive ? "#374151" : "#4b5563",
                    padding: "8px 16px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  {appInfo.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <DisclaimerModal
        id="coming-soon-modal"
        isOpen={comingSoonModalOpen}
        onClose={() => setComingSoonModalOpen(false)}
        title="Coming Soon!"
      >
        <p id="coming-soon-modal-description" className="text-gray-600">
          Stay tuned for upcoming features.
        </p>
      </DisclaimerModal>
    </>
  );
}
