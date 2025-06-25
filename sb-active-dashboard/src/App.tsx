import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "@/ui/dashboard/DashboardLayout";
import LayerProvider from "@/lib/context/MapContext";
import HomePage from "./pages/home";
import ExplorePage from "./pages/dashboard/explore";
import SafetyPage from "./pages/dashboard/safety";
import VolumePage from "./pages/dashboard/volume";

import { ThemeProvider, CssBaseline, StyledEngineProvider } from "@mui/material";
import { appTheme } from "@/ui/theme";  // your existing theme file

function App() {
  return (
    // Emotion styles should be injected BEFORE any other <style> tags
    <StyledEngineProvider injectFirst> {/* MUI doc :contentReference[oaicite:4]{index=4} */}
      <ThemeProvider theme={appTheme}>
        <CssBaseline enableColorScheme />
        <BrowserRouter>
          <Routes>
            {/* route not using MapContext */}
            <Route path="/" element={<HomePage />} />

            {/* everything that needs useMapContext */}
            <Route
              path="/dashboard/*"
              element={
                <LayerProvider>
                  <DashboardLayout>
                    <Routes>
                      <Route path="explore" element={<ExplorePage />} />
                      <Route path="safety"  element={<SafetyPage  />} />
                      <Route path="volume"  element={<VolumePage  />} />
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
