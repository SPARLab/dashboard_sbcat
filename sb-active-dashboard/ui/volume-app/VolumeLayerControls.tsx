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
  // Control layers based on model counts selection
  useEffect(() => {
    if (aadtLayer && hexagonLayer) {
      switch (modelCountsBy) {
        case "strava":
          // Hide both layers for now (placeholder)
          aadtLayer.visible = false;
          hexagonLayer.visible = false;
          break;
          
        case "dillon":
          // Show hexagon layers (ModeledVolumes)
          aadtLayer.visible = false;
          hexagonLayer.visible = true;
          break;
          
        case "aadt":
          // Show AADT point layers
          aadtLayer.visible = true;
          hexagonLayer.visible = false;
          break;
          
        default:
          break;
      }
    }
  }, [modelCountsBy, aadtLayer, hexagonLayer]);

  // Control hexagon layer visibility based on switches
  useEffect(() => {
    if (hexagonLayer) {
      const bikeLayer = hexagonLayer.layers.find(layer => layer.title === "Modeled Biking Volumes");
      const pedLayer = hexagonLayer.layers.find(layer => layer.title === "Modeled Walking Volumes");
      
      if (bikeLayer) {
        bikeLayer.visible = showBicyclist;
      }
      if (pedLayer) {
        pedLayer.visible = showPedestrian;
      }
    }
  }, [hexagonLayer, showBicyclist, showPedestrian]);

  // Control AADT layer visibility based on switches (only when AADT layer is visible)
  useEffect(() => {
    if (aadtLayer && aadtLayer.visible) {
      // For AADT layer, we need to filter by count_type instead of just showing/hiding
      // This would require more complex logic to filter the layer
    }
  }, [aadtLayer, showBicyclist, showPedestrian]);

  // This component doesn't render anything visible
  // It just controls the layers based on the props
  return null;
};

export default VolumeLayerControls; 