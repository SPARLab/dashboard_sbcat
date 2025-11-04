import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "@/ui/dashboard/DashboardLayout";
import LayerProvider from "@/lib/context/MapContext";
import HomePage from "./pages/home";
import SafetyPage from "./pages/dashboard/safety";
import VolumePage from "./pages/dashboard/volume";
import Test from "./pages/dashboard/test";
// import TestBoundariesPage from "./pages/dashboard/test-boundaries";

import { ThemeProvider, CssBaseline, StyledEngineProvider } from "@mui/material";
import { appTheme } from "@/ui/theme";

function App() {
  return (
    // Emotion styles should be injected BEFORE any other <style> tags
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={appTheme}>
        <CssBaseline enableColorScheme />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to safety dashboard */}
            <Route path="/" element={<Navigate to="/dashboard/safety" replace />} />

            {/* everything that needs useMapContext */}
            <Route
              path="/dashboard/*"
              element={
                <LayerProvider>
                  <DashboardLayout>
                    <Routes>
                      <Route path="safety" element={<SafetyPage />} />
                      <Route path="volume" element={<VolumePage />} />
                      <Route path="test" element={<Test />} />
                      {/* <Route path="test-boundaries" element={<TestBoundariesPage />} /> */}
                    </Routes>
                  </DashboardLayout>
                </LayerProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
