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
          primary: '#050505',   // Deep OLED Black
          secondary: '#0A0A0A', // Slightly lighter black
          tertiary: '#111111',  // Card background
          elevated: '#1A1A1A',  // Hover states
        },
        text: {
          primary: '#EDEDED',   // High contrast white
          secondary: '#A1A1A1', // Neutral gray
          tertiary: '#525252',  // Subtle gray
          muted: '#262626',     // Very subtle
        },
        accent: {
          primary: '#00D8FF',   // Electric Cyan
          secondary: '#00F090', // Neon Green
          tertiary: '#7F00FF',  // Electric Violet
        },
        status: {
          success: '#00F090',   // Neon Green (Financial Up)
          warning: '#FFB020',   // Amber
          danger: '#FF2D55',    // Neon Red (Financial Down)
          info: '#2E95FF',      // Bright Blue
        },
        border: {
          DEFAULT: '#1F1F1F',
          subtle: '#141414',
          emphasis: '#333333',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'], // For financial data
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(0, 216, 255, 0.4)',
        'glow-green': '0 0 15px -3px rgba(0, 240, 144, 0.4)',
        'glow-red': '0 0 15px -3px rgba(255, 45, 85, 0.4)',
        'elevated': '0 20px 40px -20px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}
