import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        ring: 'var(--ring)',
        destructive: 'var(--destructive)',
        sidebar: 'var(--sidebar)',
        ink: 'var(--foreground)',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 18px 40px -28px rgba(46, 34, 92, 0.45)',
        card: '0 22px 45px -32px rgba(46, 34, 92, 0.5)',
        glow: '0 0 0 6px var(--glow)',
        sidebar: '10px 0 40px -30px rgba(46, 34, 92, 0.6)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        drift: {
          '0%': { transform: 'translateX(-8%)' },
          '100%': { transform: 'translateX(110%)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        drift: 'drift 48s linear infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        'pop-in': 'pop-in 220ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
