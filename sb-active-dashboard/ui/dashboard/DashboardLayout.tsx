// src/ui/dashboard/DashboardLayout.tsx
import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box } from "@mui/material";
import { featureFlags } from "@/src/config/featureFlags";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const allApps = [
  { name: "Safety", link: "/dashboard/safety" },
  { name: "Volume", link: "/dashboard/volume" },
];

const apps = featureFlags.showVolumePage
  ? allApps
  : allApps.filter((app) => app.name !== "Volume");

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Box
      id="dashboard-layout"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
      }}
    >
      <Header apps={apps} />

      {/* Main content fills the space between header and footer */}
      <Box
        id="dashboard-main-content"
        sx={{
          flex: 1,
          minHeight: 0, // Allow flex child to shrink below content size
          width: "100vw",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
