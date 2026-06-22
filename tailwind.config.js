/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        rose: {
          gold: '#B76E79',
          goldLight: '#D4949C',
          goldDark: '#8E4F59',
          gold50: '#FFF0F2',
          gold100: '#FFE0E4',
          gold200: '#FFC6CD',
        },
        warm: {
          50: '#FFF8F6',
          100: '#FFF0EE',
          200: '#F5E6E3',
          300: '#EAD5D0',
          400: '#D4B5AE',
          500: '#B8908A',
          600: '#9C706A',
          700: '#7A524C',
          800: '#5C3A36',
          900: '#2D2D2D',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(183, 110, 121, 0.08)',
        'card-hover': '0 4px 20px rgba(183, 110, 121, 0.15)',
        'float': '0 4px 24px rgba(183, 110, 121, 0.25)',
      },
    },
  },
  plugins: [],
};
