/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          deep: '#0e0f11',
          DEFAULT: '#141518',
          surface: '#1a1b1e',
          card: '#222327',
          hover: '#2b2d31',
          active: '#313338',
        },
        brand: {
          DEFAULT: '#5865f2',
          hover: '#4752c4',
          light: '#7983f5',
          dark: '#3c45a5',
        },
        status: {
          online: '#23a55a',
          speaking: '#3ba55d',
          idle: '#f0b232',
          dnd: '#f23f43',
          offline: '#80848e',
        },
        discord: {
          red: '#ed4245',
          green: '#3ba55d',
          yellow: '#faa61a',
          text: '#dcddde',
          muted: '#949ba4',
          header: '#f2f3f5',
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 165, 93, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(59, 165, 93, 0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
