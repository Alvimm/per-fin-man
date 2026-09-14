/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        income: '#10b981',
        expense: '#ef4444',
        primary: {
          50: '#eef2ff',
          500: '#4f46e5',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
  plugins: [],
}