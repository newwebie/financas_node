/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#0d0d14',
          800: '#12121f',
          700: '#1a1a2e',
          600: '#222240',
          500: '#2a2a4a',
        },
        su: {
          50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8',
          300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777',
        },
        pi: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb',
        },
        mint: { 400: '#6ee7b7', 500: '#34d399' },
        peach: { 400: '#fdba74', 500: '#fb923c' },
        lavender: { 400: '#c4b5fd', 500: '#a78bfa' },
        coral: { 400: '#fca5a5', 500: '#f87171' },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}
