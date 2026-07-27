import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hiragino Sans"', '"Noto Sans JP"', '"Yu Gothic"', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#2563eb',
          dark: '#3b82f6',
        },
      },
      lineHeight: {
        ja: '1.9',
      },
    },
  },
  plugins: [],
} satisfies Config;
