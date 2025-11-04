import React, { useRef, useState } from "react";

// import global state variables
import { useMapContext } from "@/lib/context/MapContext";

import { List, Typography, Box, IconButton } from "@mui/material";
import { CalciteIcon } from "@esri/calcite-components-react";
import { styled } from "@mui/material/styles";
import { Grid } from "@mui/material";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import LayerSearch from "./LayerSearch";
import FilterTabs from "./FilterTabs";
import StatsView from "./StatsView";

interface ToggleButtonProps {
  open: boolean;
  menuWidth: number;
}

const ToggleButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "menuWidth",
})<ToggleButtonProps>(({ theme, open, menuWidth }) => ({
  position: "absolute",
  top: "50%",
  left: open ? `${menuWidth - 21}px` : "5px",
  transform: "translateY(-50%)",
  zIndex: 4000,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[3],
  transition: "left 0.5s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.background.paper, // same as normal
    opacity: 1, // optional: ensures no fade
    boxShadow: theme.shadows[4], // optionally stronger shadow on hover
  },
}));

export default function ExploreMenu(props: any) {
  const { drawerOpen, handleDrawer, menuWidth } = props;

  return (
    <Box
      sx={{
        height: "100%",
        width: drawerOpen ? menuWidth : "1px",
        transition: "width 0.5s ease-in-out",
        zIndex: 3000,
        position: "absolute",
        top: 0,
        left: 0,
        // overflow: 'hidden',
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MenuPanel drawerOpen={drawerOpen} drawerWidth={menuWidth}>
        <Box p={2}>
          <Typography mb={2} variant="h6" sx={{ fontWeight: "bold" }}>
            Explore
          </Typography>
          <Typography mb={2} variant="body2">
            Use this page to explore and access data, or check out our curated
            dashboards about volumes, safety, infrastructure, and equity.
          </Typography>

          <Typography mb={2} variant="body2">
            <strong>Step 1:</strong> Add datasets to the map.
          </Typography>
          <LayerSearch />

          <Grid justifyContent="center" className="esri-widget">
            <Grid size={12} my={2}>
              <Typography
                align="center"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                Legend
              </Typography>
            </Grid>
            <div id="legend-container"></div>
          </Grid>
        </Box>
      </MenuPanel>

      <ToggleButton
        onClick={handleDrawer}
        open={drawerOpen}
        menuWidth={menuWidth}
      >
        <CalciteIcon icon={drawerOpen ? "chevron-left" : "chevron-right"} />
      </ToggleButton>
    </Box>
  );
}
