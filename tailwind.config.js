/** @type {import('tailwindcss').Config} */ 
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './main.js', './chatbot.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },
      colors: {
        primary: '#00F2FE',
        secondary: '#9D4EDD',
        accent: '#4ADE80',
        darkBg: '#030305',
        glassBg: 'rgba(10, 12, 18, 0.4)',
        glassBorder: 'rgba(249, 250, 251, 0.05)'
      },
      boxShadow: {
        'glass': '0 30px 60px rgba(3, 3, 5, 0.5)',
        'glass-hover': '0 40px 80px rgba(0, 242, 254, 0.15)',
        'neon-primary': '0 0 20px rgba(0, 242, 254, 0.5)',
        'neon-secondary': '0 0 20px rgba(157, 78, 221, 0.5)'
      },
      animation: {
        'spin-slow': 'spin 15s linear infinite',
        'spin-reverse': 'spin 20s linear infinite reverse',
        'pulse-glow': 'pulseGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: 0.7, filter: 'brightness(1.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    }
  },
  plugins: []
};
 
