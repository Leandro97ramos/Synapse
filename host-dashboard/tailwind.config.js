/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
        cinema: {
          bg: 'var(--cinema-bg)',
        },
        neon: {
          DEFAULT: 'var(--neon-color)',
        }
      },
      boxShadow: {
        'neon': 'var(--neon-glow)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
