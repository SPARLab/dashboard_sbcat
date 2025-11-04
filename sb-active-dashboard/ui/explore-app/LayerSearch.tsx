"use client";
import React, { useEffect, useState } from "react";

// map context and types
import { useMapContext } from "@/lib/context/MapContext";
import {
  SafetyChecks,
  VolumeChecks,
  DemographicChecks,
  CountSiteChecks,
} from "@/lib/explore-app/types";

// arcgis js
import LayerList from "@arcgis/core/widgets/LayerList";

// mui accordion components
import Accordion from "@mui/material/Accordion";
import AccordionActions from "@mui/material/AccordionActions";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Button from "@mui/material/Button";

// mui checkbox components
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";

// mui radio components
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";

interface LayerSearchProps {
  safetyChecks: SafetyChecks;
  setSafetyChecks: React.Dispatch<React.SetStateAction<SafetyChecks>>;
  volumeChecks: VolumeChecks;
  setVolumeChecks: React.Dispatch<React.SetStateAction<VolumeChecks>>;
  demographicChecks: DemographicChecks;
  setDemographicChecks: React.Dispatch<React.SetStateAction<DemographicChecks>>;
}

export default function LayerSearch(props: LayerSearchProps) {
  const {
    mapRef,
    incidentGroupLayer,
    censusGroupLayer,
    countGroupLayer,
    AADTHexagonLayer,
    layerList,
  } = useMapContext();
  const {
    safetyChecks,
    setSafetyChecks,
    countSiteChecks,
    setCountSiteChecks,
    volumeChecks,
    setVolumeChecks,
    demographicChecks,
    setDemographicChecks,
  } = useMapContext();

  const [selectedSafetyType, setSelectedSafetyType] =
    useState<string>("All Incidents");

  const handleSafetyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) {
      setSafetyChecks({
        toggled: false,
        "All Incidents": true,
        "Biking Incidents": false,
        "Walking Incidents": false,
      });
      setSelectedSafetyType("All Incidents");
    } else {
      setSafetyChecks({
        ...safetyChecks,
        toggled: event.target.checked,
      });
    }
  };
  const handleSafetyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();

    Object.keys(safetyChecks).forEach((key) => {
      if (key === "toggled") return;
      let check = false;
      if (key === event.target.value) {
        check = true;
        setSelectedSafetyType(key);
      }
      setSafetyChecks({
        ...safetyChecks,
        [key]: check,
      });
    });
  };

  useEffect(() => {
    if (!mapRef || !incidentGroupLayer) return;

    const safetyGroup = mapRef.allLayers.find(
      (layer) => layer.title === "Safety"
    );

    if (safetyChecks["toggled"]) {
      // add the group layer if not already added
      if (!safetyGroup) {
        mapRef.add(incidentGroupLayer);
      }
      // countSites
      incidentGroupLayer.allLayers.forEach((sublayer) => {
        const title = sublayer.title;
        if (title === selectedSafetyType) {
          sublayer.visible = true;
          sublayer.listMode = "show";
        } else {
          sublayer.visible = false;
          sublayer.listMode = "hide";
        }
      });
    } else {
      if (safetyGroup) {
        mapRef?.remove(incidentGroupLayer);
      }
    }
  }, [selectedSafetyType, safetyChecks]);

  const [selectedCountSite, setSelectedCountSite] =
    useState<string>("All Sites");
  const handleCountSiteToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.checked) {
      setCountSiteChecks({
        toggled: false,
        "Biking Sites": false,
        "Walking Sites": false,
        "All Sites": true,
      });
      setSelectedCountSite("All Sites");
    } else {
      setCountSiteChecks({
        ...countSiteChecks,
        toggled: event.target.checked,
      });
    }
  };
  const handleCountSiteChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    // change the clicked radio to true and all others except toggled to false
    Object.keys(countSiteChecks).forEach((key) => {
      if (key === "toggled") return;
      let check = false;
      if (key === event.target.value) {
        check = true;
        setSelectedCountSite(key);
      }
      setCountSiteChecks({
        ...countSiteChecks,
        [key]: check,
      });
    });
  };

  useEffect(() => {
    if (!mapRef || !countGroupLayer) return;

    const countSiteGroup = mapRef.allLayers.find(
      (layer) => layer.title === "Count Sites"
    );

    if (countSiteChecks["toggled"]) {
      // add the group layer if not already added
      if (!countSiteGroup) {
        mapRef.add(countGroupLayer);
      }
      // countSites
      countGroupLayer.allLayers.forEach((sublayer) => {
        const title = sublayer.title;
        if (title === selectedCountSite) {
          sublayer.visible = true;
          sublayer.listMode = "show";
        } else {
          sublayer.visible = false;
          sublayer.listMode = "hide";
        }
      });
    } else {
      if (countSiteGroup) {
        mapRef?.remove(countGroupLayer);
      }
    }
  }, [selectedCountSite, countSiteChecks]);

  const [selectedVolumeType, setSelectedVolumeType] = useState<string>(
    "Modeled Biking Volumes"
  );
  const handleVolumeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) {
      setVolumeChecks({
        toggled: false,
        "Modeled Biking Volumes": true,
        "Modeled Walking Volumes": false,
      });
      setSelectedVolumeType("Modeled Biking Volumes");
    } else {
      setVolumeChecks({
        ...volumeChecks,
        toggled: event.target.checked,
      });
    }
  };
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    Object.keys(volumeChecks).forEach((key) => {
      if (key === "toggled") return;
      let check = false;
      if (key === event.target.value) {
        check = true;
        setSelectedVolumeType(key);
      }
      setVolumeChecks({
        ...volumeChecks,
        [key]: check,
      });
    });
  };

  useEffect(() => {
    if (!mapRef || !AADTHexagonLayer) return;
    console.log(selectedVolumeType);
    const volumeGroup = mapRef.allLayers.find(
      (layer) => layer.title === "Modeled Volumes"
    );
    if (volumeChecks.toggled) {
      if (!volumeGroup) {
        // load in hexagon layers first
        mapRef.add(AADTHexagonLayer);
      } else {
        // make sure hexagons stay above census group layer
        mapRef.reorder(AADTHexagonLayer, 1);
      }

      AADTHexagonLayer.allLayers.forEach((sublayer) => {
        const title = sublayer.title;
        if (title && title in volumeChecks) {
          const visible = volumeChecks[title as keyof typeof volumeChecks];
          sublayer.visible = visible;
          sublayer.listMode = visible ? "hide" : "show";
        }
      });
    } else {
      if (volumeGroup) {
        // load in hexagon layers first
        mapRef.remove(AADTHexagonLayer);
      }
    }
  }, [selectedVolumeType, volumeChecks]);

  const handleDemographicChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    setDemographicChecks({
      ...demographicChecks,
      [event.target.name]: event.target.checked,
    });
  };

  useEffect(() => {
    if (!mapRef || !censusGroupLayer) return;

    const censusGroup = mapRef.allLayers.find(
      (layer) => layer.title === "Demographics"
    );
    if (!censusGroup) {
      mapRef.add(censusGroupLayer);
    } else {
      // ensure that census layer is always at the bottom, if it isn't already
      mapRef.reorder(censusGroupLayer, 0);
    }

    censusGroupLayer.allLayers.forEach((sublayer) => {
      const title = sublayer.title;
      if (title && title in demographicChecks) {
        const visible =
          demographicChecks[title as keyof typeof demographicChecks];
        sublayer.visible = visible;
        sublayer.listMode = visible ? "hide" : "show";
      }
    });

    const allFalse = Object.values(demographicChecks).every(
      (value) => value === false
    );
    if (allFalse && censusGroupLayer) {
      mapRef?.remove(censusGroupLayer);
    }
  }, [demographicChecks]);

  // change map order of all layers once loaded in

  return (
    <div>
      {incidentGroupLayer && (
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="safety-content"
            id="safety-header"
          >
            <Typography component="span">Safety</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={safetyChecks["toggled"]}
                  onChange={handleSafetyToggle} // You'll create this handler
                  name="Incidents"
                />
              }
              label="Incidents"
            />

            {safetyChecks["toggled"] && (
              <RadioGroup
                value={selectedSafetyType} // Controlled value
                onChange={handleSafetyChange}
                sx={{ mx: 2 }}
              >
                <FormControlLabel
                  value="All Incidents"
                  control={<Radio />}
                  label="View All Reported Incidents"
                />
                <FormControlLabel
                  value="Biking Incidents"
                  control={<Radio />}
                  label="View Biking Incidents"
                />
                <FormControlLabel
                  value="Walking Incidents"
                  control={<Radio />}
                  label="View Walking Incidents"
                />
              </RadioGroup>
            )}

            {/* <FormGroup id={"incident-layers"}>
                            <FormControlLabel control={<Switch checked={safetyChecks['Biking Incidents']} onChange={handleSafetyChange} name="Biking Incidents" />} label="Biking Incidents" />
                            <FormControlLabel control={<Switch checked={safetyChecks['Walking Incidents']} onChange={handleSafetyChange} name="Walking Incidents" />} label="Walking Incidents" />
                        </FormGroup> */}
          </AccordionDetails>
        </Accordion>
      )}
      {countGroupLayer && (
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="volumes-content"
            id="volumes-header"
          >
            <Typography component="span">Volumes</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup id={"volume-layers"}>
              <FormControlLabel
                control={
                  <Switch
                    checked={countSiteChecks["toggled"]}
                    onChange={handleCountSiteToggle} // You'll create this handler
                    name="Count Sites"
                  />
                }
                label="Count Sites"
              />
              {countSiteChecks["toggled"] && ( // You'll control this state based on the switch
                <RadioGroup
                  value={selectedCountSite} // Controlled value
                  onChange={handleCountSiteChange}
                  sx={{ mx: 2 }}
                >
                  <FormControlLabel
                    value="Biking Sites"
                    control={<Radio />}
                    label="View Bike Site Volumes"
                  />
                  <FormControlLabel
                    value="Walking Sites"
                    control={<Radio />}
                    label="View Walk Site Volumes"
                  />
                  <FormControlLabel
                    value="All Sites"
                    control={<Radio />}
                    label="View All Sites"
                  />
                </RadioGroup>
              )}

              {/* Modeled Volumes */}
              <FormControlLabel
                control={
                  <Switch
                    checked={volumeChecks["toggled"]}
                    onChange={handleVolumeToggle} // You'll create this handler
                    name="Modeled Volumes"
                  />
                }
                label="Modeled Volumes"
              />
              {volumeChecks["toggled"] && (
                <RadioGroup
                  value={selectedVolumeType}
                  onChange={handleVolumeChange}
                  sx={{ mx: 2 }}
                >
                  <FormControlLabel
                    value="Modeled Biking Volumes"
                    control={<Radio />}
                    label="Biking Volumes"
                  />
                  <FormControlLabel
                    value="Modeled Walking Volumes"
                    control={<Radio />}
                    label="Walking Volumes"
                  />
                </RadioGroup>
              )}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      )}

      {censusGroupLayer && (
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="demographics-content"
            id="demographics-header"
          >
            <Typography component="span">Demographics</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup id={"demographic-layers"}>
              <FormControlLabel
                control={
                  <Switch
                    checked={demographicChecks["Income"]}
                    onChange={handleDemographicChange}
                    name="Income"
                  />
                }
                label="Income"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={demographicChecks["Race"]}
                    onChange={handleDemographicChange}
                    name="Race"
                  />
                }
                label="Race"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={demographicChecks["Education"]}
                    onChange={handleDemographicChange}
                    name="Education"
                  />
                }
                label="Education"
              />
            </FormGroup>
          </AccordionDetails>
          <AccordionActions></AccordionActions>
        </Accordion>
      )}
    </div>
  );
}
