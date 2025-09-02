"use client";

import React, { useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import {
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
} from "@mui/material";

interface props {
  sublayer: any;
}

function CountRenderer(props: props) {
  const { sublayer } = props;

  let fields = sublayer.layer.fields;
  console.log(fields);
  fields = fields.filter((field: any) => field.name.includes("_aadt"));

  const changeRenderField = async (event: any) => {
    event.stopPropagation();
    // event.preventDefault()
    const field = event.target.value;

    const renderer = sublayer.layer.renderer.clone();
    const colorVariable = renderer.visualVariables[0];

    colorVariable.field = field;
    renderer.visualVariables = [colorVariable];

    sublayer.layer.renderer = renderer;
  };

  return (
    <FormControl>
      <FormLabel id="counts-render-button-group">
        Average Annual Daily Traffic (AADV)
      </FormLabel>
      <RadioGroup
        aria-labelledby="counts-render-button-group"
        defaultValue={fields[0].name}
        name="radio-buttons-group"
      >
        {fields.map((attribute: any) => (
          <FormControlLabel
            key={attribute.name}
            value={attribute.name}
            control={<Radio onClick={changeRenderField} />}
            label={attribute.alias}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

export default function addCountRenderPanel(sublayer: any) {
  const container = document.createElement("div");
  const root = createRoot(container);
  root.render(<CountRenderer sublayer={sublayer} />);

  sublayer.panel = {
    content: container,
    icon: "sliders-horizontal",
    title: "Visualization Fields",
  };
}
