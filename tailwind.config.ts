import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:         'var(--cream)',
        'cream-2':     'var(--cream-2)',
        panel:         'var(--panel)',
        ink:           'var(--ink)',
        'ink-soft':    'var(--ink-soft)',
        'ink-faint':   'var(--ink-faint)',
        line:          'var(--line)',
        'line-soft':   'var(--line-soft)',
        violet:        'var(--violet)',
        'violet-soft': 'var(--violet-soft)',
        red:           'var(--red)',
        'red-soft':    'var(--red-soft)',
        green:         'var(--green)',
        'green-soft':  'var(--green-soft)',
        blue:          'var(--blue)',
        orange:        'var(--orange)',
        pink:          'var(--pink)',
        yellow:        'var(--yellow)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
