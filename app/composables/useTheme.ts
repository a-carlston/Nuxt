export type ThemeMode = 'light' | 'dark' | 'system'
export type ColorPalette = 'corporate' | 'lava' | 'dracula' | 'ocean' | 'forest'

const THEME_KEY = 'neu-theme-mode'
const PALETTE_KEY = 'neu-color-palette'

export function useTheme() {
  const themeMode = useState<ThemeMode>('theme-mode', () => 'system')
  const colorPalette = useState<ColorPalette>('color-palette', () => 'corporate')
  const systemPrefersDark = useState<boolean>('system-prefers-dark', () => false)
  const isInitialized = useState<boolean>('theme-initialized', () => false)

  const effectiveTheme = computed(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return themeMode.value
  })

  const isDark = computed(() => effectiveTheme.value === 'dark')

  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode
    if (import.meta.client) {
      localStorage.setItem(THEME_KEY, mode)
      applyTheme()
    }
  }

  function setPalette(palette: ColorPalette) {
    colorPalette.value = palette
    if (import.meta.client) {
      localStorage.setItem(PALETTE_KEY, palette)
      applyTheme()
    }
  }

  function toggleTheme() {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = modes.indexOf(themeMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    setThemeMode(modes[nextIndex])
  }

  function applyTheme() {
    if (!import.meta.client) return

    const html = document.documentElement
    html.setAttribute('data-theme', effectiveTheme.value)
    html.setAttribute('data-palette', colorPalette.value)

    if (effectiveTheme.value === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  function initTheme() {
    if (!import.meta.client || isInitialized.value) return

    // Load saved preferences
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null
    const savedPalette = localStorage.getItem(PALETTE_KEY) as ColorPalette | null

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      themeMode.value = savedTheme
    }

    if (savedPalette && ['corporate', 'lava', 'dracula', 'ocean', 'forest'].includes(savedPalette)) {
      colorPalette.value = savedPalette
    }

    // Watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches

    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
      applyTheme()
    })

    // Apply initial theme
    applyTheme()
    isInitialized.value = true
  }

  // Watch for changes and apply on client
  if (import.meta.client) {
    watch([effectiveTheme, colorPalette], () => {
      applyTheme()
    })
  }

  return {
    themeMode: readonly(themeMode),
    colorPalette: readonly(colorPalette),
    effectiveTheme,
    isDark,
    systemPrefersDark: readonly(systemPrefersDark),
    setThemeMode,
    setPalette,
    toggleTheme,
    initTheme,
    palettes: ['corporate', 'lava', 'dracula', 'ocean', 'forest'] as const,
    themeModes: ['light', 'dark', 'system'] as const
  }
}
