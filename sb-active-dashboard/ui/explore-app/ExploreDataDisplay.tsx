import React, { useRef, useState } from "react";

import { useMapContext } from "@/lib/context/MapContext";

import { List, Typography, Box, IconButton } from "@mui/material";
import { styled } from "@mui/material";

import { CalciteIcon } from "@esri/calcite-components-react";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import LayerSearch from "./LayerSearch";
import FilterTabs from "./FilterTabs";
import StatsView from "./StatsView";

import Grid from "@mui/material/Grid"

export default function ExploreDataDisplay(props: any) {
  const { drawerOpen, handleDrawer, drawerWidth } = props;

  interface ToggleButtonProps {
    open: boolean;
    menuWidth: number;
  }

  const ToggleButton = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== "open" && prop !== "menuWidth",
  })<ToggleButtonProps>(({ theme, open, menuWidth }) => ({
    position: "absolute",
    top: "50%",
    right: open ? menuWidth - 21 : 5, // position near edge of menu when open, near edge of screen when closed
    transform: "translateY(-50%)",
    zIndex: 4000,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[3],
    transition: theme.transitions.create("right", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.standard,
    }),
    "&:hover": {
      backgroundColor: theme.palette.background.paper, // same as normal
      opacity: 1, // optional: ensures no fade
      boxShadow: theme.shadows[4], // optionally stronger shadow on hover
    },
  }));
  return (
    <Box
      sx={{
        height: "100%",
        width: drawerOpen ? drawerWidth : "1px",
        transition: "width 0.5s ease-in-out",
        zIndex: 3000,
        position: "absolute",
        top: 0,
        right: 0,
        // overflow: 'hidden',
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MenuPanel drawerOpen={drawerOpen} drawerWidth={drawerWidth}>
        <Box p={2}>
          <StatsView />

          <Typography my={2} variant="body2">
            <strong>Step 2:</strong> Apply filters.
          </Typography>

          <FilterTabs />
        </Box>
      </MenuPanel>

      <ToggleButton
        onClick={handleDrawer}
        open={drawerOpen}
        menuWidth={drawerWidth}
      >
        <CalciteIcon icon={drawerOpen ? "chevron-right" : "chevron-left"} />
      </ToggleButton>
    </Box>
  );
}
