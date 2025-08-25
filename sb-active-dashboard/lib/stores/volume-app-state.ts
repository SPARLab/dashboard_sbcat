import { create } from 'zustand';
import MapView from "@arcgis/core/views/MapView";

interface VolumeAppState {
  selectedCountSite: string | null; // Site ID as string
  highlightedBinSites: string[]; // Site names for bin highlighting
  mapView: MapView | null;
  setSelectedCountSite: (siteId: string | null) => void;
  setHighlightedBinSites: (siteNames: string[]) => void;
  setMapView: (mapView: MapView | null) => void;
}

export const useVolumeAppStore = create<VolumeAppState>((set) => ({
  selectedCountSite: null,
  highlightedBinSites: [],
  mapView: null,
  setSelectedCountSite: (siteId) => {
    set({
      selectedCountSite: siteId,
      highlightedBinSites: [],
    });
  },
  setHighlightedBinSites: (siteNames) => {
    set({
      highlightedBinSites: siteNames,
      selectedCountSite: null,
    });
  },
  setMapView: (mapView) => set({ mapView }),
}));
