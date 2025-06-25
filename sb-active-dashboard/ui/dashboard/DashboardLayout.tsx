// src/ui/dashboard/DashboardLayout.tsx
import React from "react";
import Header from "./Header";
import { Box } from "@mui/material";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const apps = [
  { name: "Explore", link: "/dashboard/explore" },
  { name: "Safety", link: "/dashboard/safety" },
  { name: "Volume", link: "/dashboard/volume" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <Header apps={apps} />

      {/* Main content fills the rest of the screen under the header */}
      <Box
        sx={{
          height: "calc(100vh - 70px)", // assuming header is 70px tall
          width: "100vw",
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </>
  );
}
