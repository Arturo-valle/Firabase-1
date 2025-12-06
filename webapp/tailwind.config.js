/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0E14',   // Deep dark blue/black
          secondary: '#151A23', // Slightly lighter
          tertiary: '#1E2430',  // Card background
          elevated: '#2A3241',  // Hover states
        },
        text: {
          primary: '#F3F4F6',
          secondary: '#9CA3AF',
          tertiary: '#6B7280',
        },
        accent: {
          primary: '#06B6D4',   // Cyan
          secondary: '#10B981', // Emerald
          tertiary: '#8B5CF6',  // Violet
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
        },
        border: {
          DEFAULT: '#1F2937',
          emphasis: '#374151',
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
        'elevated': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
    },
  },
  plugins: [],
}
