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
      },
    },
  },
  plugins: [],
}; 