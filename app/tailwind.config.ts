import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Surface
        bg: '#f7f5f1',
        surface: '#ffffff',
        'surface-2': '#f1eee8',
        // Ink
        ink: '#1a1d23',
        'ink-soft': '#475061',
        'ink-muted': '#6c7588',
        // Lines
        line: '#d9d4c8',
        'line-soft': '#ece8de',
        // Link
        link: '#1f5fad',
        'link-hover': '#133f78',
        // Decision Class palette
        'class-a': '#4a6b8a',
        'class-b': '#2d6a4f',
        'class-c': '#b08400',
        'class-d': '#8a3a36',
        'class-e': '#5c3a8a',
        // Status (paired with text/icon, never color-only)
        ok: '#2d6a4f',
        warn: '#b08400',
        alert: '#8a3a36',
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
