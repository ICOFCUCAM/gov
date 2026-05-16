import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — CSS-variable driven so a scoped sovereign
        // theme (.sov) can repaint the whole command environment without
        // touching components. Light defaults in :root; dark sovereign
        // palette overrides under .sov.
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',
        link: 'rgb(var(--c-link) / <alpha-value>)',
        'link-hover': 'rgb(var(--c-link-hover) / <alpha-value>)',
        // Decision Class palette
        'class-a': '#4a6b8a',
        'class-b': '#2d6a4f',
        'class-c': '#b08400',
        'class-d': '#8a3a36',
        'class-e': '#5c3a8a',
        // Status (paired with text/icon, never color-only) — tokenised
        // so they stay legible on the dark sovereign palette.
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        alert: 'rgb(var(--c-alert) / <alpha-value>)',
        // NCCC wall (dark)
        'wall-bg': '#0d1117',
        'wall-panel': '#161b22',
        'wall-line': '#2d343d',
        'wall-ink': '#e8eaed',
        'wall-muted': '#8b95a3',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'Noto Sans', 'sans-serif'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        xs: '4px',
        sm: '8px',
        md: '14px',
        lg: '22px',
      },
      boxShadow: {
        // Elevation system — restrained, reads on light + dark sovereign.
        'elev-1': '0 1px 2px rgb(0 0 0 / 0.06), 0 1px 1px rgb(0 0 0 / 0.04)',
        'elev-2': '0 4px 12px -2px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'elev-3': '0 12px 28px -6px rgb(0 0 0 / 0.16), 0 6px 12px -6px rgb(0 0 0 / 0.10)',
        focus: '0 0 0 3px rgb(var(--c-link) / 0.45)',
      },
      transitionTimingFunction: {
        // Premium easing — calm, confident, never bouncy.
        sov: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'dash-flow': {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-44' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        diffuse: {
          '0%': { transform: 'scale(0.55)', opacity: '0.55' },
          '70%': { opacity: '0.12' },
          '100%': { transform: 'scale(1.65)', opacity: '0' },
        },
        breathe: {
          '0%,100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms cubic-bezier(0.22,1,0.36,1) both',
        rise: 'rise 260ms cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'dash-flow': 'dash-flow 1.2s linear infinite',
        radar: 'radar 7s linear infinite',
        diffuse: 'diffuse 3.2s ease-out infinite',
        breathe: 'breathe 3.4s ease-in-out infinite',
      },
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
      // Inclusion-floor breakpoints: usable on a small Android browser.
      screens: {
        xs: '360px',
        sm: '480px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};

export default config;
