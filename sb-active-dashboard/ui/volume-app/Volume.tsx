import { Typography, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Switch, Slider, Box as MuiBox, Divider, List, ListItem, ListItemText, CircularProgress } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import { ArcgisMap } from "@arcgis/map-components-react";
// ArcGIS imports for TimeSlider
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import TimeInterval from "@arcgis/core/time/TimeInterval";

const Volume = () => {
  const [leftMenuOpen, setLeftMenuOpen] = useState(true);
  const leftMenuWidth = 400;
  const handleLeftMenu = () => setLeftMenuOpen((prev) => !prev);

  const [rightMenuOpen, setRightMenuOpen] = useState(true);
  const rightMenuWidth = 300;
  const handleRightMenu = () => setRightMenuOpen((prev) => !prev);

  const mapViewRef = useRef<any>(null);
  const [timeSliderLoaded, setTimeSliderLoaded] = useState(false);
  const [viewReady, setViewReady] = useState(false);

  // Handler to set map center/zoom when view is ready
  const handleArcgisViewReadyChange = (event: any) => {
    if (event?.target?.view) {
      event.target.view.goTo({
        center: [-120, 34.7],
        zoom: 9,
      });
      mapViewRef.current = event.target.view;
      setViewReady(true);
    }
  };

  // Instantiate placeholder TimeSlider when map view is ready
  useEffect(() => {
    if (viewReady && mapViewRef.current && document.getElementById("volume-time-slider-container")) {
      if (document.getElementById("volume-time-slider-container")?.children.length === 0) {
        const timeSlider = new TimeSlider({
          container: "volume-time-slider-container",
          view: mapViewRef.current,
          mode: "time-window",
          timeZone: "system",
          stops: {
            interval: new TimeInterval({ value: 1, unit: "years" })
          },
          fullTimeExtent: {
            start: new Date(2012, 1, 1),
            end: new Date(2025, 5, 25),
          },
          timeExtent: {
            start: new Date(2012, 1, 1),
            end: new Date(2025, 5, 25),
          },
        });
        setTimeSliderLoaded(true);
      }
    }
  }, [viewReady]);

  return (
    <MuiBox id="app-container" sx={{ position: "relative", height: "100%" }}>
      {/* Left Sidebar */}
      <MuiBox
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
        <MenuPanel drawerOpen={leftMenuOpen} drawerWidth={leftMenuWidth}>
          <MuiBox p={2}>
            <Typography mb={2} variant="h6" sx={{ fontWeight: "bold" }}>
              SORT DATA
            </Typography>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Select Road User</FormLabel>
              <RadioGroup defaultValue="bicyclist" name="user-type">
                <FormControlLabel value="bicyclist" control={<Radio />} label="Bicyclist" />
                <FormControlLabel value="pedestrian" control={<Radio />} label="Pedestrian" />
              </RadioGroup>
            </FormControl>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Model Counts By</FormLabel>
              <RadioGroup defaultValue="strava" name="model-counts">
                <FormControlLabel value="strava" control={<Radio />} label="Strava Bias Correction" />
                <FormControlLabel value="dillon" control={<Radio />} label="Dillon's ATP (name)" />
                <FormControlLabel value="aadt" control={<Radio />} label="Average Annual Daily Traffic (AADT)" />
              </RadioGroup>
            </FormControl>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Show Electric Bike Count Sites"
              sx={{ mb: 2 }}
            />
            {/* ArcGIS TimeSlider placeholder */}
            <div style={{ marginBottom: 24 }}>
              {!timeSliderLoaded && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minHeight: 80 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="textSecondary">
                    Loading ArcGIS TimeSlider...
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    This is where the ArcGIS TimeSlider widget will go after the map loads.
                  </Typography>
                </div>
              )}
              <div id="volume-time-slider-container" />
            </div>
          </MuiBox>
        </MenuPanel>{null}
      </MuiBox>

      {/* Main Content */}
      <MuiBox
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
      </MuiBox>

      {/* Right Sidebar */}
      <MuiBox
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
        <MenuPanel drawerOpen={rightMenuOpen} drawerWidth={rightMenuWidth}>
          <MuiBox p={2}>
            <Typography mb={2} variant="h6" sx={{ fontWeight: "bold" }}>
              STATISTICS
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              Hourly Trends
            </Typography>
            {/* Placeholder Bar Chart */}
            <div style={{ width: 220, height: 120, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <span>Bar Chart</span>
            </div>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              Highest Volume Areas
            </Typography>
            <List dense>
              <ListItem><ListItemText primary="1. State Street" /></ListItem>
              <ListItem><ListItemText primary="2. Castillo Street" /></ListItem>
              <ListItem><ListItemText primary="3. Etc" /></ListItem>
              <ListItem><ListItemText primary="4. etc" /></ListItem>
              <ListItem><ListItemText primary="5. etc" /></ListItem>
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              Mode Ratio
            </Typography>
            {/* Placeholder Pie Chart */}
            <div style={{ width: 220, height: 120, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>Pie Chart</span>
            </div>
          </MuiBox>
        </MenuPanel>{null}
      </MuiBox>
    </MuiBox>
  );
}

export default Volume; 