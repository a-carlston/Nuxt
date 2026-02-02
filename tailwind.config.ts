import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neu: {
          bg: 'var(--neu-bg)',
          'bg-secondary': 'var(--neu-bg-secondary)',
          primary: 'var(--neu-primary)',
          text: 'var(--neu-text)',
          'text-muted': 'var(--neu-text-muted)'
        }
      },
      boxShadow: {
        'neu-flat': 'var(--neu-shadow-flat)',
        'neu-pressed': 'var(--neu-shadow-pressed)',
        'neu-convex': 'var(--neu-shadow-convex)',
        'neu-concave': 'var(--neu-shadow-concave)'
      }
    }
  },
  plugins: []
}
