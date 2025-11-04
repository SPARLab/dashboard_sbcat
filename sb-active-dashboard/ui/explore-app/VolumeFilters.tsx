"use client";
import React, { useState, useEffect } from "react";

// map context and types
import { useMapContext } from "@/lib/context/MapContext";

// arcgis js
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import Query from "@arcgis/core/rest/support/Query";
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import TimeInterval from "@arcgis/core/time/TimeInterval";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";

// mui
import {
  FormControl,
  FormGroup,
  FormLabel,
  RadioGroup,
  Radio,
  InputLabel,
  MenuItem,
  Slider,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";

type Filters = {
  locality: string | null;
  countDays: string | null;
  countProgram: string | null;
};

type UniqueFieldsMap = Record<string, boolean>;

export default function VolumeFilters() {
  const { countGroupLayer, countSiteChecks, viewRef, mapRef } = useMapContext();

  const [filters, setFilters] = useState<Filters>({
    locality: null,
    countDays: null,
    countProgram: null,
  });

  const createFilter = async () => {
    const filterParams = Object.values(filters);
    const usableFilters = filterParams.filter((val) => val !== null);
    const filterStr = usableFilters.join(" AND ");

    // filter incidents by day of week
    if (countGroupLayer !== null && mapRef !== null && viewRef !== null) {
      const volumeGroup = mapRef.allLayers.find(
        (layer): layer is GroupLayer =>
          layer.title === "Count Sites" && layer.type === "group"
      );
      if (volumeGroup) {
        const groupIncidentView = (await viewRef?.whenLayerView(
          countGroupLayer
        )) as GroupLayerView;
        const countLayerViews = groupIncidentView.layerViews;
        countLayerViews.map((countView: FeatureLayerView) => {
          countView.filter = new FeatureFilter({
            where: filterStr,
          });
        });
      }
    }
  };

  // query count groups to get unique localities and programs
  const [localities, setLocalities] = useState<UniqueFieldsMap>({});

  const fetchLocalities = async () => {
    const newLocalities: UniqueFieldsMap = {};
    const localityResults = await Promise.all(
      countGroupLayer?.layers.map(async (layer) => {
        if (layer instanceof FeatureLayer) {
          const localityQuery = layer.createQuery();
          localityQuery.where = "1=1";
          (localityQuery.returnDistinctValues = true),
            (localityQuery.returnGeometry = false);
          localityQuery.outFields = ["locality"];

          const localityResults: FeatureSet =
            await layer.queryFeatures(localityQuery);
          const uniqueLocalities = localityResults.features.map(
            (f) => f.attributes.locality
          );
          uniqueLocalities.forEach((locale) => {
            newLocalities[locale] = false;
          });

          return uniqueLocalities;
        }
        return [];
      }) ?? []
    );
    setLocalities(newLocalities);
  };

  const handleLocaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalities({
      ...localities,
      [event.target.name]: event.target.checked,
    });
  };

  const filterLocalities = () => {
    const values = Object.values(localities);
    const mixedValues = values.includes(true) && values.includes(false);

    let localeFilter = null;
    if (mixedValues) {
      const includedLocalities = Object.entries(localities).filter(([_, val]) =>
        Boolean(val)
      );
      if (includedLocalities) {
        if (includedLocalities.length > 1) {
          const quotedLocalities = includedLocalities
            .map(([l, _]) => `'${l}'`)
            .join(", ");
          localeFilter = `locality IN (${quotedLocalities})`;
          console.log(localeFilter);
        } else {
          localeFilter = `locality = '${includedLocalities[0][0]}'`;
        }
      }
    }

    setFilters({
      ...filters,
      locality: localeFilter,
    });
  };

  useEffect(() => {
    filterLocalities();
  }, [localities]);

  // program filters
  const [programs, setPrograms] = useState<UniqueFieldsMap>({});

  const fetchPrograms = async () => {
    const newPrograms: UniqueFieldsMap = {};
    const programResults = await Promise.all(
      countGroupLayer?.layers.map(async (layer) => {
        if (layer instanceof FeatureLayer) {
          const programQuery = layer.createQuery();
          programQuery.where = "1=1";
          (programQuery.returnDistinctValues = true),
            (programQuery.returnGeometry = false);
          programQuery.outFields = ["source"];

          const programResults: FeatureSet =
            await layer.queryFeatures(programQuery);
          const uniquePrograms = programResults.features.map(
            (f) => f.attributes.source
          );
          uniquePrograms.forEach((program) => {
            newPrograms[program] = false;
          });

          return uniquePrograms;
        }
        return [];
      }) ?? []
    );
    setPrograms(newPrograms);
  };

  const [dowValue, setDowValue] = useState<string>("all_aadt");

  // day of week aadt ( changing visualization field, not an actual filter )
  const changeRenderField = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    const field = event.target.value;
    setDowValue(field);
    if (countGroupLayer !== null) {
      countGroupLayer.layers.map((layer) => {
        if (layer instanceof FeatureLayer) {
          if (layer.renderer instanceof SimpleRenderer) {
            const renderer = layer.renderer.clone();
            const colorVariables = renderer.visualVariables;
            if (colorVariables) {
              colorVariables[0].field = field;
              renderer.visualVariables = [colorVariables[0]];
              layer.renderer = renderer;
            }
          }
        }
      });
    }
  };

  const handleProgramChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrograms({
      ...programs,
      [event.target.name]: event.target.checked,
    });
  };

  const filterPrograms = () => {
    const values = Object.values(programs);
    const mixedValues = values.includes(true) && values.includes(false);

    let programFilter = null;
    if (mixedValues) {
      const includedPrograms = Object.entries(programs).filter(([_, val]) =>
        Boolean(val)
      );
      if (includedPrograms) {
        if (includedPrograms.length > 1) {
          const quotedLocalities = includedPrograms
            .map(([l, _]) => `'${l}'`)
            .join(", ");
          programFilter = `source IN (${quotedLocalities})`;
        } else {
          programFilter = `source = '${includedPrograms[0][0]}'`;
        }
      }
    }

    setFilters({
      ...filters,
      countProgram: programFilter,
    });
  };

  useEffect(() => {
    filterPrograms();
  }, [programs]);

  useEffect(() => {
    fetchLocalities();
    fetchPrograms();
  }, [countGroupLayer]);

  useEffect(() => {
    createFilter();
  }, [filters]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ width: "100%" }}>
        {!countSiteChecks["All Sites"] && (
          <div>
            <Typography
              variant="body1"
              align="left"
              my={1}
              sx={{ width: "100%" }}
            >
              Visualize counts by day of the week
            </Typography>
            <FormControl>
              <FormLabel id="count-dow-radio-buttons-group-label">
                Daily Traffic
              </FormLabel>
              <RadioGroup
                aria-labelledby="count-dow-radio-buttons-group-label"
                defaultValue="all_aadt"
                name="count-dow-radio-buttons-group"
                onChange={changeRenderField}
                value={dowValue}
              >
                <FormControlLabel
                  value="all_aadt"
                  control={<Radio />}
                  label="Everyday"
                />
                <FormControlLabel
                  value="weekday_addt"
                  control={<Radio />}
                  label="Weekday"
                />
                <FormControlLabel
                  value="weekend_aadt"
                  control={<Radio />}
                  label="Weekend"
                />
              </RadioGroup>
            </FormControl>
          </div>
        )}

        {/* Localities */}
        <Typography variant="body1" align="left" my={1} sx={{ width: "100%" }}>
          Filter by Jursidiction
        </Typography>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormGroup>
            {Object.entries(localities).map(([locale, value]) => (
              <FormControlLabel
                key={locale}
                control={
                  <Checkbox
                    checked={value}
                    onChange={handleLocaleChange}
                    name={locale}
                  />
                }
                label={locale}
              />
            ))}
            {/* <FormControlLabel control={<Checkbox checked={dataSources.SWITRS} onChange={handleSourceChange} name="SWITRS" />} label="SWITRS" />
                        <FormControlLabel control={<Checkbox checked={dataSources.BikeMaps} onChange={handleSourceChange} name="BikeMaps" />} label="BikeMaps" /> */}
          </FormGroup>
        </FormControl>

        {/* Count Program */}
        <Typography variant="body1" align="left" my={1} sx={{ width: "100%" }}>
          Filter by Count Program
        </Typography>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormGroup>
            {Object.entries(programs).map(([program, value]) => (
              <FormControlLabel
                key={program}
                control={
                  <Checkbox
                    checked={value}
                    onChange={handleProgramChange}
                    name={program}
                  />
                }
                label={program}
              />
            ))}
            {/* <FormControlLabel control={<Checkbox checked={dataSources.SWITRS} onChange={handleSourceChange} name="SWITRS" />} label="SWITRS" />
                        <FormControlLabel control={<Checkbox checked={dataSources.BikeMaps} onChange={handleSourceChange} name="BikeMaps" />} label="BikeMaps" /> */}
          </FormGroup>
        </FormControl>
      </Box>
    </Box>
  );
}
