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
    'bg-safety-no-injury',
    'bg-safety-near-miss',
    'bg-safety-unknown',
    'text-safety-fatality',
    'text-safety-severe-injury',
    'text-safety-injury',
    'text-safety-no-injury', 
    'text-safety-near-miss',
    'text-safety-unknown',
    // Conflict colors (8 distinct Okabe-Ito colors)
    'bg-conflict-type-1',
    'bg-conflict-type-2',
    'bg-conflict-type-3',
    'bg-conflict-type-4',
    'bg-conflict-type-5',
    'bg-conflict-type-6',
    'bg-conflict-type-7',
    'bg-conflict-type-8',
    'text-conflict-type-1',
    'text-conflict-type-2',
    'text-conflict-type-3',
    'text-conflict-type-4',
    'text-conflict-type-5',
    'text-conflict-type-6',
    'text-conflict-type-7',
    'text-conflict-type-8',
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
          'no-injury': '#56B4E9',   // Sky Blue - No Injury (collision with no injury)
          'near-miss': '#0072B2',   // Blue - Near Miss (crowd-sourced close call)
          unknown: '#999999',       // Gray - Unknown
        },
        conflict: {
          // Complete Okabe-Ito colorblind-friendly palette (8 distinct colors)
          'type-1': '#D55E00',    // Vermillion - Most dangerous vehicle conflicts
          'type-2': '#CC79A7',    // Reddish purple - High-risk conflicts
          'type-3': '#009E73',    // Bluish green - Medium-risk active transport
          'type-4': '#56B4E9',    // Sky blue - Mixed-mode conflicts
          'type-5': '#F0E442',    // Yellow - Infrastructure/warning conflicts
          'type-6': '#0072B2',    // Blue - Secondary vehicle conflicts
          'type-7': '#E69F00',    // Orange - Pedestrian conflicts
          'type-8': '#000000',    // Black - Other/misc conflicts
        },
      },
    },
  },
  plugins: [],
}; 