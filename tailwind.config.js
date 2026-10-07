/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#111111',
          dark: '#171717',
          charcoal: '#1C1C1C',
          surface: '#242424',
          border: '#333333',
          orange: '#F97316',
          orangeHover: '#EA580C',
          orangeDark: '#C2410C',
          orangeLight: '#FFF7ED',
          orangeMuted: '#FFEDD5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
