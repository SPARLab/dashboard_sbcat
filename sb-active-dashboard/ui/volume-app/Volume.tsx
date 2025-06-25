import { Typography, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Switch, Slider, Box as MuiBox, Divider, List, ListItem, ListItemText } from "@mui/material";
import { useState } from "react";
import MenuPanel from "../dashboard/Menu/MenuPanel";
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
            <FormLabel component="legend" sx={{ mb: 1 }}>Select Timeframe</FormLabel>
            <Slider
              defaultValue={2019}
              min={2017}
              max={2022}
              step={1}
              marks={[{ value: 2017, label: '2017' }, { value: 2018, label: '2018' }, { value: 2019, label: '2019' }, { value: 2020, label: '2020' }, { value: 2021, label: '2021' }, { value: 2022, label: '2022' }]}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Show Electric Bike Count Sites"
              sx={{ mb: 2 }}
            />
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