import React, { useState } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";

import { Toolbar, Box, Typography, Button, AppBar } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DisclaimerModal from "@/ui/components/DisclaimerModal";

interface AppInfo {
  name: string;
  link?: string;
  comingSoon?: boolean;
}

interface HeaderProps {
  apps: AppInfo[];
}

export default function Header({ apps }: HeaderProps) {
  const theme = useTheme();
  const location = useLocation();
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false);

  const handleComingSoonClick = () => {
    setComingSoonModalOpen(true);
  };

  return (
    <>
      <AppBar
        id="dashboard-header"
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.white.main,
          borderBottom: `1px solid ${theme.palette.lightgray.main}`,
          width: "100vw",
        }}
      >
        <Toolbar sx={{ maxHeight: "70px" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              width: "100vw",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" noWrap component="div" sx={{ color: theme.palette.navy.main }}>
              ACTIVE SB
            </Typography>

            <Box
              id="header-navigation"
              sx={{
                width: "50%",
                flexShrink: 1,
                textAlign: "end",
                display: "flex",
                gap: 2,
                flexDirection: "row",
                justifyContent: "end",
                alignItems: "center",
              }}
            >
              {apps?.map((appInfo, index) => {
                const isActive = appInfo.link ? location.pathname.startsWith(appInfo.link) : false;
                const isComingSoon = appInfo.comingSoon;

                if (isComingSoon) {
                  return (
                    <Button
                      id={`header-${appInfo.name.toLowerCase()}-button`}
                      key={index}
                      variant="text"
                      onClick={handleComingSoonClick}
                      sx={{
                        backgroundColor: "transparent",
                        color: "#9ca3af", // gray-400 - muted color for coming soon
                        fontWeight: "bold",
                        fontSize: "1rem",
                        textTransform: "none",
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        "&:hover": {
                          backgroundColor: "#f3f4f6", // gray-100 - subtle hover
                          color: "#6b7280", // gray-500
                        },
                        "&:focus": {
                          outline: "none",
                          boxShadow: "none",
                        },
                        "&:active": {
                          outline: "none",
                          boxShadow: "none",
                        },
                      }}
                    >
                      {appInfo.name}
                    </Button>
                  );
                }

                return (
                  <Button
                    id={`header-${appInfo.name.toLowerCase()}-button`}
                    key={index}
                    component={RouterLink}
                    to={appInfo.link!}
                    variant="text"
                    sx={{
                      backgroundColor: isActive
                        ? "#d1d5db" // gray-300 equivalent
                        : "transparent",
                      color: isActive
                        ? "#374151" // gray-700 equivalent
                        : theme.palette.lightgray.contrastText,
                      fontWeight: "bold",
                      fontSize: "1rem",
                      textTransform: "none",
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      "&:hover": {
                        backgroundColor: isActive
                          ? "#9ca3af" // gray-400 equivalent
                          : "#d1d5db", // gray-300 equivalent
                        color: isActive
                          ? "#1f2937" // gray-800 equivalent
                          : "#374151", // gray-700 equivalent
                      },
                      "&:focus": {
                        outline: "none",
                        boxShadow: "none",
                      },
                      "&:active": {
                        outline: "none",
                        boxShadow: "none",
                      },
                    }}
                  >
                    {appInfo.name}
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Coming Soon Modal */}
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
