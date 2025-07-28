/** @type {import('tailwindcss').Config} */
const safelist = require('tailwind-safelist-generator');

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './ui/**/*.{js,ts,jsx,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: safelist({
    pattern: /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900)$/,
    variants: ['hover', 'ui-selected'],
  }),
  theme: {
    extend: {},
  },
  plugins: [],
}; 