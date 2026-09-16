/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          50: '#F2F9F3',
          100: '#E2F3E5',
          200: '#C5E6CB',
          300: '#97D2A2',
          400: '#63B773',
          500: '#3D9B50',
          600: '#2E7D3F',
          700: '#276334',
          800: '#234F2C',
          900: '#1E4126',
          950: '#06280F',
        },
        harvest: {
          50: '#FFFDF5',
          100: '#FEF9E3',
          200: '#FCF0B9',
          300: '#F9E383',
          400: '#F4D047',
          500: '#EAB317',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        sand: {
          50: '#FAF8F5',
          100: '#F4EFEA',
          200: '#E8DFD5',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Work Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(6, 40, 15, 0.06), 0 2px 6px -1px rgba(6, 40, 15, 0.04)',
        'premium': '0 10px 30px -5px rgba(6, 40, 15, 0.12), 0 4px 10px -2px rgba(6, 40, 15, 0.05)',
      }
    },
  },
  plugins: [],
}
