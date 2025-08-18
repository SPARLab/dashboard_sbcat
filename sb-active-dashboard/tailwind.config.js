/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './ui/**/*.{js,ts,jsx,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // Safety colors - manually specified
    'bg-safety-fatality',
    'bg-safety-severe-injury', 
    'bg-safety-injury',
    'bg-safety-near-miss',
    'bg-safety-unknown',
    'text-safety-fatality',
    'text-safety-severe-injury',
    'text-safety-injury', 
    'text-safety-near-miss',
    'text-safety-unknown',
    // Conflict colors
    'bg-conflict-bike-vehicle',
    'bg-conflict-ped-vehicle',
    'bg-conflict-bike-bike',
    'bg-conflict-bike-ped',
    'bg-conflict-bike-infra',
    'bg-conflict-bike-other',
    'bg-conflict-ped-ped',
    'bg-conflict-ped-other',
    'bg-conflict-other',
    'bg-conflict-unknown',
    // Common utility classes that might be used dynamically
    'bg-black', 'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500',
    'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700',
    'bg-red-500', 'bg-orange-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500'
  ],
  theme: {
    extend: {
      colors: {
        safety: {
          fatality: '#000000',      // Black - Fatality
          'severe-injury': '#D55E00', // Vermilion - Severe Injury  
          injury: '#E69F00',        // Orange - Injury
          'near-miss': '#0072B2',   // Blue - Near Miss (No Injury)
          unknown: '#999999',       // Gray - Unknown
        },
        conflict: {
          // Using Okabe-Ito colorblind-friendly palette - each conflict type gets distinct color
          'bike-vehicle': '#D55E00',    // Vermilion - Most dangerous (Bike vs Vehicle) 
          'ped-vehicle': '#CC79A7',     // Reddish purple - Very dangerous (Pedestrian vs Vehicle)
          'bike-bike': '#009E73',       // Bluish green - Bike vs Bike
          'bike-ped': '#56B4E9',        // Sky blue - Bike vs Pedestrian  
          'bike-infra': '#F0E442',      // Yellow - Infrastructure conflicts
          'bike-other': '#0072B2',      // Blue - Bike vs Other
          'ped-ped': '#E69F00',         // Orange - Pedestrian vs Pedestrian
          'ped-other': '#000000',       // Black - Pedestrian vs Other
          'other': '#999999',           // Gray - Miscellaneous
          'unknown': '#999999',         // Gray - Unknown conflicts
        },
      },
    },
  },
  plugins: [],
}; 