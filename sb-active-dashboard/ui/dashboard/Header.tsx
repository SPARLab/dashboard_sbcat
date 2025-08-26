import React from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";

import { Toolbar, Box, Typography, Button, AppBar } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function Header(props: any) {
  const { apps } = props;
  const theme = useTheme();
  const location = useLocation();
  return (
    <AppBar
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
            {apps?.map((appInfo: any, index: any) => {
              const isActive = location.pathname.startsWith(appInfo.link);
              return (
                <Button
                  key={index}
                  component={RouterLink}
                  to={appInfo.link}
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
                  {appInfo["name"]}
                </Button>
              );
            })}
          </Box>
        </Box>
      </Toolbar>
      {/* render second toolbar to make AppBar fixed positioning to not cover Map content  */}
      {/* <Toolbar />  */}
    </AppBar>
  );
}
