// src/ui/dashboard/DashboardLayout.tsx
import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box } from "@mui/material";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const apps = [
  { name: "Safety", link: "/dashboard/safety" },
  { name: "Volume", link: "/dashboard/volume" },
];

const HEADER_HEIGHT = 70;
const FOOTER_HEIGHT = 52;

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
          height: `calc(100vh - ${HEADER_HEIGHT}px - ${FOOTER_HEIGHT}px)`,
          width: "100vw",
          overflow: "auto",
        }}
      >
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
