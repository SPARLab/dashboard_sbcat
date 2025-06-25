import { useEffect } from "react";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";

interface VolumeLayerControlsProps {
  aadtLayer: FeatureLayer | null;
  hexagonLayer: GroupLayer | null;
  showBicyclist: boolean;
  showPedestrian: boolean;
  modelCountsBy: string; // "strava", "dillon", "aadt"
}

const VolumeLayerControls = ({
  aadtLayer,
  hexagonLayer,
  showBicyclist,
  showPedestrian,
  modelCountsBy,
}: VolumeLayerControlsProps) => {
  // Log layer information when hexagon layer is loaded
  useEffect(() => {
    if (hexagonLayer) {
      console.log("Hexagon Group Layer loaded:", hexagonLayer);
      console.log("Hexagon layers:", hexagonLayer.layers);
      
      hexagonLayer.layers.forEach((layer, index) => {
        console.log(`Layer ${index}:`, {
          title: layer.title,
          type: layer.type,
          visible: layer.visible,
          opacity: layer.opacity,
          // Try to access style information if it's a VectorTileLayer
          style: (layer as any).style,
        });
      });
    }
  }, [hexagonLayer]);

  // Control layers based on model counts selection
  useEffect(() => {
    if (aadtLayer && hexagonLayer) {
      console.log("Model counts selection changed to:", modelCountsBy);
      
      switch (modelCountsBy) {
        case "strava":
          // Hide both layers for now (placeholder)
          aadtLayer.visible = false;
          hexagonLayer.visible = false;
          console.log("Strava selected - hiding all layers (placeholder)");
          break;
          
        case "dillon":
          // Show hexagon layers (ModeledVolumes)
          aadtLayer.visible = false;
          hexagonLayer.visible = true;
          console.log("Dillon's ATP selected - showing hexagon layers");
          break;
          
        case "aadt":
          // Show AADT point layers
          aadtLayer.visible = true;
          hexagonLayer.visible = false;
          console.log("AADT selected - showing point layers");
          break;
          
        default:
          console.log("Unknown model selection:", modelCountsBy);
      }
    }
  }, [modelCountsBy, aadtLayer, hexagonLayer]);

  // Control hexagon layer visibility based on switches (only when hexagon layer is visible)
  useEffect(() => {
    if (hexagonLayer) {
      const bikeLayer = hexagonLayer.layers.find(layer => layer.title === "Modeled Biking Volumes");
      const pedLayer = hexagonLayer.layers.find(layer => layer.title === "Modeled Walking Volumes");
      
      console.log("Bike layer found:", bikeLayer);
      console.log("Ped layer found:", pedLayer);
      
      if (bikeLayer) {
        bikeLayer.visible = showBicyclist;
        console.log("Bike layer visibility set to:", showBicyclist);
      }
      if (pedLayer) {
        pedLayer.visible = showPedestrian;
        console.log("Ped layer visibility set to:", showPedestrian);
      }
    }
  }, [hexagonLayer, showBicyclist, showPedestrian]);

  // Control AADT layer visibility based on switches (only when AADT layer is visible)
  useEffect(() => {
    if (aadtLayer && aadtLayer.visible) {
      // For AADT layer, we need to filter by count_type instead of just showing/hiding
      // This would require more complex logic to filter the layer
      console.log("AADT layer is visible - would need filtering logic for bike/ped");
    }
  }, [aadtLayer, showBicyclist, showPedestrian]);

  // This component doesn't render anything visible
  // It just controls the layers based on the props
  return null;
};

export default VolumeLayerControls; 