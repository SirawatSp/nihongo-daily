import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', '"Yu Mincho"', 'serif'],
        sans: ['"Hiragino Sans"', '"Noto Sans JP"', '"Yu Gothic"', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#a63e2c',
          dark: '#c04b35',
        },
      },
      lineHeight: {
        ja: '1.9',
      },
    },
  },
  plugins: [],
} satisfies Config;
