import { Typography, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Switch, Slider, Box as MuiBox, Divider, List, ListItem, ListItemText, CircularProgress } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import { ArcgisMap } from "@arcgis/map-components-react";
// ArcGIS imports for TimeSlider
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import TimeInterval from "@arcgis/core/time/TimeInterval";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import VolumeLeftSidebar from "./VolumeLeftSidebar";
import VolumeRightSidebar from "./VolumeRightSidebar";

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

  const [showBicyclist, setShowBicyclist] = useState(true);
  const [showPedestrian, setShowPedestrian] = useState(false);

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
        new TimeSlider({
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
      <VolumeLeftSidebar
        leftMenuOpen={leftMenuOpen}
        leftMenuWidth={leftMenuWidth}
        showBicyclist={showBicyclist}
        setShowBicyclist={setShowBicyclist}
        showPedestrian={showPedestrian}
        setShowPedestrian={setShowPedestrian}
        timeSliderLoaded={timeSliderLoaded}
      />
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
      <VolumeRightSidebar
        rightMenuOpen={rightMenuOpen}
        rightMenuWidth={rightMenuWidth}
      />
    </MuiBox>
  );
}

export default Volume; 