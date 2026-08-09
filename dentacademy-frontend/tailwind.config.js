/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dent-primary': '#1B6B2F',
        'dent-green-dark': '#145224',
        'dent-green-light': '#E8F5ED',
        'dent-green-border': '#2A8A42',
        'dent-sidebar': '#1A1A1A',
        'dent-card-head': '#2D2D2D',
        'dent-page-bg': '#F8F8F8',
        'dent-text': '#4A4A4A',
        'dent-label': '#9E9E9E',
        'dent-error': '#B91C1C',
        'dent-warning': '#B35C00',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
