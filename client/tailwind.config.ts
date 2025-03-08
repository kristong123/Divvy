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
        gray100: "#f3f4f6", // Ensure light mode works
        gray900: "#111827", // Ensure dark mode works
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
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      borderWidth: {
        'divider': '2px',
      },
      borderColor: {
        'divider': '#E5E7EB',
      }
    }
  },
  darkMode: "class", // ✅ Ensure Tailwind detects dark mode properly
} satisfies Config;
