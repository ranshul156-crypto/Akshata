/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f8fafc'
        },
        text: {
          DEFAULT: '#0f172a',
          muted: '#475569'
        },
        border: {
          DEFAULT: '#e2e8f0'
        },
        focus: {
          DEFAULT: '#0284c7'
        },
        menstrual: {
          logged: '#be123c',
          predicted: '#fecdd3'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.1)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
