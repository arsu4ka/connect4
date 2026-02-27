import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Manrope', 'sans-serif']
      },
      boxShadow: {
        neon: '0 20px 60px rgba(27, 146, 255, 0.25)',
        soft: '0 14px 45px rgba(4, 33, 66, 0.22)'
      },
      colors: {
        board: '#0c4a8a',
        p1: '#ff3b4f',
        p2: '#ffd44a'
      }
    }
  },
  plugins: []
} satisfies Config;
