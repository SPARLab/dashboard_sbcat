import { create } from 'zustand';
import MapView from "@arcgis/core/views/MapView";

interface VolumeAppState {
  selectedCountSite: string | null;
  highlightedBinSites: string[];
  mapView: MapView | null;
  setSelectedCountSite: (siteName: string | null) => void;
  setHighlightedBinSites: (siteNames: string[]) => void;
  setMapView: (mapView: MapView | null) => void;
}

export const useVolumeAppStore = create<VolumeAppState>((set) => ({
  selectedCountSite: null,
  highlightedBinSites: [],
  mapView: null,
  setSelectedCountSite: (siteName) => {
    set({
      selectedCountSite: siteName,
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
