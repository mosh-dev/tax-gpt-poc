/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976d2',
          hover: '#1565c0',
        },
        success: {
          DEFAULT: '#4caf50',
          hover: '#45a049',
        },
        warning: {
          DEFAULT: '#ff9800',
          hover: '#f57c00',
        },
      },
    },
  },
  plugins: [],
}
