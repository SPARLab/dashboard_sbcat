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
          <div id="header-branding" className="flex items-center gap-3">
            <a
              href="https://spatial.ucsb.edu"
              target="_blank"
              rel="noopener noreferrer"
              id="header-spatial-logo-link"
            >
              <img
                src="/icons/spatial-logo.png"
                alt="@Spatial UCSB - Center for Spatial Science"
                id="header-spatial-logo"
                className="h-10 w-auto"
              />
            </a>
            <div className="w-px h-8 bg-white/40" />
            <h1 id="dashboard-title" className="text-lg font-semibold text-white">
              ACTIVE SB
            </h1>
          </div>

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
                    className="text-base font-semibold transition-colors outline-none focus:outline-none"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.5)",
                      padding: "8px 16px",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
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
                  className="text-base font-semibold transition-colors outline-none focus:outline-none"
                  style={{
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isActive
                      ? "rgba(255, 255, 255, 0.35)"
                      : "rgba(255, 255, 255, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isActive
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(255, 255, 255, 0.15)";
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
