import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0A0F',
        onyx: '#13131A',
        charcoal: '#1E1E2A',
        mist: '#F8F5F0',
        parchment: '#F2EDE6',
        champagne: {
          DEFAULT: '#D4AF7A',
          light: '#E8D4A8',
          dark: '#B8924A',
        },
        blush: '#E8C4B8',
        sage: '#8BA888',
        lavender: '#B8A8D4',
        'text-primary': '#F0EDE8',
        'text-secondary': '#9A9490',
        'text-muted': '#6A6560',
        'text-tertiary': '#6A6560',
        'border-luxury': '#2A2A38',
        'border-light': '#3A3A4A',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        luxury: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'luxury-lg': '0 8px 40px rgba(0, 0, 0, 0.5)',
        champagne: '0 0 20px rgba(212, 175, 122, 0.15)',
        'champagne-sm': '0 0 10px rgba(212, 175, 122, 0.12)',
        'inner-luxury': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
      },
      transitionTimingFunction: {
        luxury: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backgroundImage: {
        'champagne-gradient':
          'linear-gradient(135deg, #D4AF7A 0%, #E8D4A8 50%, #D4AF7A 100%)',
        'obsidian-gradient':
          'linear-gradient(180deg, #13131A 0%, #0A0A0F 100%)',
        'blush-gradient':
          'linear-gradient(135deg, #E8C4B8 0%, #D4AF7A 100%)',
        'dark-gradient':
          'linear-gradient(135deg, #1E1E2A 0%, #13131A 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
