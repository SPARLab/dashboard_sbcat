export interface HeaderLogo {
  id: string;
  name: string;
  path: string;
}

export const HEADER_LOGOS: HeaderLogo[] = [
  {
    id: "light-blue",
    name: "Light Blue",
    path: "/icons/spatial-logo-light-blue.png",
  },
  {
    id: "light-gray-blue",
    name: "Light Gray Blue",
    path: "/icons/spatial-logo-light-gray-blue.png",
  },
  {
    id: "medium-blue-2",
    name: "Medium Blue",
    path: "/icons/spatial-logo-medium-blue-2.png",
  },
  {
    id: "navy",
    name: "Navy",
    path: "/icons/spatial-logo-all-navy.png",
  },
  {
    id: "standard",
    name: "Standard",
    path: "/icons/spatial-logo.png",
  },
  {
    id: "white",
    name: "White",
    path: "/icons/spatial-logo-white.png",
  },
];

export const DEFAULT_LOGO_ID = "light-blue";
export const HEADER_LOGO_STORAGE_KEY = "activesb-header-logo";

export function getLogoById(id: string): HeaderLogo {
  return HEADER_LOGOS.find((logo) => logo.id === id) || HEADER_LOGOS[0];
}
