"use client";

import React, { useState, useEffect } from "react";

// map context and types
import {
  DemographicChecks,
  SafetyChecks,
  VolumeChecks,
  CountSiteChecks,
} from "@/lib/explore-app/types";
import { useMapContext } from "@/lib/context/MapContext";

// custom components
import SafetyFilters from "./SafetyFilters";
import VolumeFilters from "./VolumeFilters";
import DemographicFilters from "./DemographicFilters";

// mui
import { styled } from "@mui/material/styles";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface StyledTabProps {
  label: string;
}

const StyledTab = styled((props: StyledTabProps) => (
  <Tab disableRipple {...props} />
))(({ theme }) => ({
  textTransform: "none",
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.pxToRem(15),
}));

export default function FilterTabs() {
  const { safetyChecks, countSiteChecks, demographicChecks } = useMapContext();

  const [safetyFalse, setSafetyFalse] = useState(false);
  // const [ volumeFalse, setVolumeFalse ] = useState(false)
  const [demographicsFalse, setDemographicsFalse] = useState(false);

  useEffect(() => {
    if (safetyChecks !== null) {
      setSafetyFalse(
        Object.values(safetyChecks).every((value) => value === false)
      );
    }
  }, [safetyChecks]);

  useEffect(() => {
    if (demographicChecks !== null) {
      setDemographicsFalse(
        Object.values(demographicChecks).every((value) => value === false)
      );
    }
  });

  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Time slider */}
      <Typography
        variant="body2"
        align="left"
        my={2}
        sx={{ width: "100%", px: "20px" }}
      >
        Select a time range.
      </Typography>
      <div id="explore-time-slider-container"></div>

      {/* Individual filter panels */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="filtering options"
        >
          <StyledTab label="Safety" {...a11yProps(0)} />
          <StyledTab label="Count Sites" {...a11yProps(1)} />
          <StyledTab label="Demographics" {...a11yProps(2)} />
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        {safetyFalse ? (
          <Typography variant="body2">
            Add Safety data to the map <strong>(Step 1)</strong>
          </Typography>
        ) : (
          <SafetyFilters />
        )}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        {countSiteChecks.toggled ? (
          <VolumeFilters />
        ) : (
          <Typography variant="body2">
            Add Volume data to the map <strong>(Step 1)</strong>
          </Typography>
        )}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        {/* <TimeFilterPanel /> */}
        {demographicsFalse ? (
          <Typography variant="body2">
            Add Demographic data to the map <strong>(Step 1)</strong>
          </Typography>
        ) : (
          <DemographicFilters demographicChecks={demographicChecks} />
        )}
      </CustomTabPanel>
    </Box>
  );
}
