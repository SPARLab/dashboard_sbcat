import React from "react";

import { Toolbar, Box, Typography, Button, AppBar } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function Header(props: any) {
  const { apps } = props;
  const theme = useTheme();
  return (
    <AppBar
      position="sticky"
      style={{ backgroundColor: theme.palette.navy.main, width: "100vw" }}
    >
      <Toolbar sx={{ height: "70px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100vw",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" noWrap component="div">
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
            {apps?.map((appInfo: any, index: any) => (
              <Button
                key={index}
                href={appInfo["link"]}
                variant="text"
                sx={{
                  backgroundColor: "#fff",
                  color: theme.palette.navy.main,
                  fontWeight: "bold",
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  borderRadius: 2,
                  px: 2,
                  '&:hover': {
                    backgroundColor: theme.palette.mist.main,
                  },
                }}
              >
                {appInfo["name"]}
              </Button>
            ))}
          </Box>
        </Box>
      </Toolbar>
      {/* render second toolbar to make AppBar fixed positioning to not cover Map content  */}
      {/* <Toolbar />  */}
    </AppBar>
  );
}
