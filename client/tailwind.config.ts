import type { Config } from 'tailwindcss'

export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        dark1: '#68D8D6',
        dark2: '#39bfbd',
        light1: '#ABEBDF',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        default: '0 5px 5px rgba(0, 0, 0, 0.3)',
        'lg': '0 7px 7px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        default: '15px',
      },
      textShadow: {
        default: '0px 4px 4px rgba(0, 0, 0, 0.3)',
      },
      transition: {
        default: 'all duration-300 ease-out'
      },
    }
  },
} satisfies Config