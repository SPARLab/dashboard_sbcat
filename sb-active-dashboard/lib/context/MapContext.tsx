"use client";

import React, { ReactNode, createContext, useContext, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import LayerList from "@arcgis/core/widgets/LayerList";
import TimeSlider from "@arcgis/core/widgets/TimeSlider";

import {
  SafetyChecks,
  VolumeChecks,
  DemographicChecks,
  CountSiteChecks,
} from "@/lib/explore-app/types";

type MapContextType = {
  mapRef: Map | null;
  setMapRef: React.Dispatch<React.SetStateAction<Map | null>>;

  viewRef: MapView | null;
  setViewRef: React.Dispatch<React.SetStateAction<MapView | null>>;

  censusGroupLayer: GroupLayer | null;
  setCensusGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>;

  countGroupLayer: GroupLayer | null;
  setCountGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>;

  incidentGroupLayer: GroupLayer | null;
  setIncidentGroupLayer: React.Dispatch<
    React.SetStateAction<GroupLayer | null>
  >;

  AADTHexagonLayer: GroupLayer | null;
  setAADTHexagonLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>;

  layerList: LayerList | null;
  setLayerList: React.Dispatch<React.SetStateAction<LayerList | null>>;

  timeSlider: TimeSlider | null;
  setTimeSlider: React.Dispatch<React.SetStateAction<TimeSlider | null>>;

  safetyChecks: SafetyChecks;
  setSafetyChecks: React.Dispatch<React.SetStateAction<SafetyChecks>>;

  countSiteChecks: CountSiteChecks;
  setCountSiteChecks: React.Dispatch<React.SetStateAction<CountSiteChecks>>;

  volumeChecks: VolumeChecks;
  setVolumeChecks: React.Dispatch<React.SetStateAction<VolumeChecks>>;

  demographicChecks: DemographicChecks;
  setDemographicChecks: React.Dispatch<React.SetStateAction<DemographicChecks>>;
};
const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export default function LayerProvider({ children }: MapProviderProps) {
  // map components
  const [mapRef, setMapRef] = useState<Map | null>(null);
  const [viewRef, setViewRef] = useState<MapView | null>(null);
  const [layerList, setLayerList] = useState<LayerList | null>(null);
  const [timeSlider, setTimeSlider] = useState<TimeSlider | null>(null);

  // data layers
  const [censusGroupLayer, setCensusGroupLayer] = useState<GroupLayer | null>(
    null
  );
  const [countGroupLayer, setCountGroupLayer] = useState<GroupLayer | null>(
    null
  );
  const [incidentGroupLayer, setIncidentGroupLayer] =
    useState<GroupLayer | null>(null);
  const [AADTHexagonLayer, setAADTHexagonLayer] = useState<GroupLayer | null>(
    null
  );

  // tracking layers
  const [safetyChecks, setSafetyChecks] = useState({
    toggled: false,
    "All Incidents": true,
    "Biking Incidents": false,
    "Walking Incidents": false,
  });

  const [countSiteChecks, setCountSiteChecks] = useState({
    toggled: false,
    "All Sites": false,
    "Biking Sites": true,
    "Walking Sites": false,
  });

  const [volumeChecks, setVolumeChecks] = useState({
    toggled: false,
    "Modeled Biking Volumes": true,
    "Modeled Walking Volumes": false,
  });

  const [demographicChecks, setDemographicChecks] = useState({
    Income: false,
    Race: false,
    Education: false,
  });

  return (
    <MapContext.Provider
      value={{
        mapRef,
        setMapRef,
        viewRef,
        setViewRef,
        layerList,
        setLayerList,
        timeSlider,
        setTimeSlider,

        censusGroupLayer,
        setCensusGroupLayer,
        countGroupLayer,
        setCountGroupLayer,
        incidentGroupLayer,
        setIncidentGroupLayer,
        AADTHexagonLayer,
        setAADTHexagonLayer,

        safetyChecks,
        setSafetyChecks,
        countSiteChecks,
        setCountSiteChecks,
        volumeChecks,
        setVolumeChecks,
        demographicChecks,
        setDemographicChecks,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a LayerProvider");
  }

  return context;
};
