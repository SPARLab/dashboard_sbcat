import React, { useState } from "react";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import { Box } from "@mui/material";
import { ArcgisMap } from "@arcgis/map-components-react";

const Volume = () => {
  const [leftMenuOpen, setLeftMenuOpen] = useState(true);
  const leftMenuWidth = 260;
  const handleLeftMenu = () => setLeftMenuOpen((prev) => !prev);

  const [rightMenuOpen, setRightMenuOpen] = useState(true);
  const rightMenuWidth = 300;
  const handleRightMenu = () => setRightMenuOpen((prev) => !prev);

  // Handler to set map center/zoom when view is ready
  const handleArcgisViewReadyChange = (event: any) => {
    if (event?.target?.view) {
      event.target.view.goTo({
        center: [-120, 34.7],
        zoom: 9,
      });
    }
  };

  return (
      <Box id="app-container" sx={{ position: "relative", height: "100%" }}>
        {/* Left Sidebar */}
        <Box
            sx={{
            height: "100%",
            width: leftMenuOpen ? leftMenuWidth : "1px",
            transition: "width 0.5s ease-in-out",
            zIndex: 3000,
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            flexDirection: "column",
            }}
        >
          <MenuPanel drawerOpen={leftMenuOpen} drawerWidth={leftMenuWidth}>{null}</MenuPanel>
        </Box>

        {/* Main Content */}
        <Box
            component="main"
            sx={{
            position: "block",
            zIndex: 1100,
            height: "100%",
            width: `calc(100vw - ${leftMenuOpen ? leftMenuWidth : 0}px - ${rightMenuOpen ? rightMenuWidth : 0}px )`,
            transition: "width 0.5s ease-in-out, margin 0.5s ease-in-out",
            marginRight: rightMenuOpen ? `${rightMenuWidth}px` : "0px",
            marginLeft: leftMenuOpen ? `${leftMenuWidth}px` : "0px",
            background: "#fff",
          }}
        >
          <ArcgisMap
            basemap="topo-vector"
            onArcgisViewReadyChange={handleArcgisViewReadyChange}
          />
        </Box>

        {/* Right Sidebar */}
        <Box
          sx={{
            height: "100%",
            width: rightMenuOpen ? rightMenuWidth : "1px",
            transition: "width 0.5s ease-in-out",
            zIndex: 3000,
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <MenuPanel drawerOpen={rightMenuOpen} drawerWidth={rightMenuWidth}>{null}</MenuPanel>
        </Box>
      </Box>
  );
};

export default Volume; 