/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dent-primary': '#0B5FFF',
        'dent-green-dark': '#0747C2',
        'dent-green-light': '#E8F0FF',
        'dent-green-border': '#3B82F6',
        'dent-sidebar': '#07111F',
        'dent-card-head': '#0F1C2E',
        'dent-page-bg': '#F2F5FA',
        'dent-text': '#334155',
        'dent-label': '#94A3B8',
        'dent-error': '#E11D48',
        'dent-warning': '#D97706',
        brand: {
          DEFAULT: '#0B5FFF',
          dark: '#0747C2',
          light: '#E8F0FF',
          muted: '#3B82F6',
        },
        'brand-dark': '#0747C2',
        'brand-light': '#E8F0FF',
        accent: '#FF6B2C',
        'accent-dark': '#E04E12',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--ink-subtle) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Outfit"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(10 22 40 / 0.04), 0 8px 24px rgb(10 22 40 / 0.05)',
        lift: '0 12px 32px rgb(11 95 255 / 0.12)',
        glow: '0 0 0 3px rgb(11 95 255 / 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      transitionDuration: {
        120: '120ms',
        180: '180ms',
        250: '250ms',
        320: '320ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(16px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'toast-out': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(12px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out both',
        'fade-up': 'fade-up 320ms ease-out both',
        'scale-in': 'scale-in 200ms ease-out both',
        'slide-in-right': 'slide-in-right 250ms ease-out both',
        'slide-in-left': 'slide-in-left 250ms ease-out both',
        'toast-in': 'toast-in 250ms ease-out both',
        'toast-out': 'toast-out 180ms ease-in both',
        shake: 'shake 400ms ease-in-out',
        shimmer: 'shimmer 1.4s infinite',
        float: 'float 6s ease-in-out infinite',
        'progress-indeterminate': 'progress-indeterminate 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
