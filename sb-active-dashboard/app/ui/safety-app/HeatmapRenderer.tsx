import React, {  useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import RenderOptionsForm from "../dashboard/LayerList/RenderOptionsForm";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

interface props {
    layer: FeatureLayer
}

function HeatmapRenderer(props: props) { 

    const { layer } = props

    // heatmap weights field
    let fields:any = layer.fields
    fields = fields.filter((field: any) => field.type === "double" || field.name === "oid")
    fields.push({
        "name": "",
        "alias": "No Weight"
    })
    const changeRenderField = (event) => {        
        layer.renderer['field'] = event.target.value
    }

    // ped vs bike safety


    return (

        // add a time field
        // add a field for selecting bikes vs peds
        
        <RenderOptionsForm fields={fields} changeRenderField={changeRenderField} />
    )
}


// create a panel to choose which field to visualize
export default function addHeatmapRenderPanel(item: any) {

    const container = document.createElement("div")
    const root = createRoot(container)
    root.render(<HeatmapRenderer layer={item.layer} />)

    // set panel layerlist panel
    item.panel = {
        content: container,
        icon: "sliders-horizontal",
        title: "Weight Fields",
    }
    
}