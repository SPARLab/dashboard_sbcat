import { Typography, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Switch, CircularProgress, Box as MuiBox } from "@mui/material";
import MenuPanel from "../dashboard/Menu/MenuPanel";

type Props = {
  leftMenuOpen: boolean;
  leftMenuWidth: number;
  showBicyclist: boolean;
  setShowBicyclist: (checked: boolean) => void;
  showPedestrian: boolean;
  setShowPedestrian: (checked: boolean) => void;
  timeSliderLoaded: boolean;
  modelCountsBy: string;
  setModelCountsBy: (value: string) => void;
};

const VolumeLeftSidebar = ({
  leftMenuOpen,
  leftMenuWidth,
  showBicyclist,
  setShowBicyclist,
  showPedestrian,
  setShowPedestrian,
  timeSliderLoaded,
  modelCountsBy,
  setModelCountsBy,
}: Props) => (
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
          <FormLabel component="legend" sx={{ fontWeight: "bold" }}>
            Select Road User
          </FormLabel>
          <FormControlLabel
            control={
              <Switch
                checked={showBicyclist}
                onChange={(_, checked) => setShowBicyclist(checked)}
                color="primary"
              />
            }
            label="Bicyclist"
            sx={{ mb: 0, mt: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showPedestrian}
                onChange={(_, checked) => setShowPedestrian(checked)}
                color="primary"
              />
            }
            label="Pedestrian"
            sx={{ mb: 0, mt: 0 }}
          />
        </FormControl>
        <FormControl component="fieldset" sx={{ mb: 0 }}>
          <FormLabel component="legend" sx={{ fontWeight: "bold", mt: 2 }}>
            Model Counts By
          </FormLabel>
          <RadioGroup defaultValue="strava" name="model-counts" value={modelCountsBy} onChange={(e) => setModelCountsBy(e.target.value)}>
            <FormControlLabel value="dillon" control={<Radio />} label="Dillon's ATP (name)" />
            <FormControlLabel value="aadt" control={<Radio />} label="Average Annual Daily Traffic (AADT)" />
            <FormControlLabel value="strava" control={<Radio />} label="Strava Bias Correction" />
          </RadioGroup>
        </FormControl>
        {/* ArcGIS TimeSlider placeholder */}
        <FormLabel component="legend" sx={{ fontWeight: "bold", mt: 2, mb: 1 }}>
          Select Timeframe
        </FormLabel>
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
        <FormControlLabel
          control={<Switch color="primary" size="medium" defaultChecked />}
          label="Show Electric Bike Count Sites"
          sx={{ mb: 2 }}
        />
      </MuiBox>
    </MenuPanel>
  </MuiBox>
);

export default VolumeLeftSidebar; 