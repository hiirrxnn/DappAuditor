import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFFFFF', // White
          50: '#FFFFFF',
          100: '#F9F9F9',
          200: '#F0F0F0',
          300: '#E4E4E4',
          400: '#D1D1D1',
          500: '#BDBDBD',
          600: '#9E9E9E',
          700: '#757575',
          800: '#616161',
          900: '#424242',
        },
        // Secondary color as a darker gray
        secondary: {
          DEFAULT: '#9E9E9E', // Gray
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
        dark: {
          DEFAULT: '#000000', // Black
          50: '#1A1A1A',
          100: '#2A2A2A',
          200: '#3A3A3A',
          300: '#4A4A4A',
          400: '#5A5A5A',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
}

export default config