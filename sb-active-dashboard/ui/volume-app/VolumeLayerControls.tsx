import { useEffect } from "react";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";

interface VolumeLayerControlsProps {
  aadtLayer: FeatureLayer | null;
  hexagonLayer: GroupLayer | null;
  showBicyclist: boolean;
  showPedestrian: boolean;
}

const VolumeLayerControls = ({
  aadtLayer,
  hexagonLayer,
  showBicyclist,
  showPedestrian,
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

  // Control hexagon layer visibility based on switches
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

  // Control AADT layer visibility
  useEffect(() => {
    if (aadtLayer) {
      // Show AADT layer if either bicyclist or pedestrian is selected
      aadtLayer.visible = showBicyclist || showPedestrian;
      console.log("AADT layer visibility set to:", showBicyclist || showPedestrian);
    }
  }, [aadtLayer, showBicyclist, showPedestrian]);

  // This component doesn't render anything visible
  // It just controls the layers based on the props
  return null;
};

export default VolumeLayerControls; 