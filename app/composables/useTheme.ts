export type ThemeMode = 'light' | 'dark' | 'system'
export type ColorPalette = 'corporate' | 'lava' | 'dracula' | 'ocean' | 'forest'

const THEME_KEY = 'neu-theme-mode'
const PALETTE_KEY = 'neu-color-palette'
const THEME_COOKIE = 'neu-theme'
const PALETTE_COOKIE = 'neu-palette'

export function useTheme() {
  const themeMode = useState<ThemeMode>('theme-mode', () => 'system')

  // Shared state for user context (using useState for SSR compatibility)
  const userContext = useState<{ userId: string; tenantSlug: string } | null>('theme-user-context', () => null)
  const colorPalette = useState<ColorPalette>('color-palette', () => 'corporate')
  const systemPrefersDark = useState<boolean>('system-prefers-dark', () => false)
  const isInitialized = useState<boolean>('theme-initialized', () => false)

  // Read cookies on both server and client
  const themeCookie = useCookie<ThemeMode>(THEME_COOKIE, { default: () => 'system' })
  const paletteCookie = useCookie<ColorPalette>(PALETTE_COOKIE, { default: () => 'corporate' })

  // Debounced save to prevent excessive API calls
  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  async function saveToDatabase(theme?: ThemeMode, palette?: ColorPalette) {
    if (!userContext.value || !import.meta.client) return

    const { userId, tenantSlug } = userContext.value
    if (!userId || !tenantSlug) return

    try {
      await $fetch(`/api/tenant/${tenantSlug}/user/preferences`, {
        method: 'POST',
        body: {
          userId,
          preferences: {
            ...(theme !== undefined && { theme }),
            ...(palette !== undefined && { colorPalette: palette })
          }
        }
      })
    } catch (error) {
      console.warn('Failed to save theme preferences to database:', error)
    }
  }

  function debouncedSave(theme?: ThemeMode, palette?: ColorPalette) {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveToDatabase(theme, palette), 500)
  }

  const effectiveTheme = computed(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return themeMode.value
  })

  const isDark = computed(() => effectiveTheme.value === 'dark')

  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode
    themeCookie.value = mode
    if (import.meta.client) {
      localStorage.setItem(THEME_KEY, mode)
      applyTheme()
      debouncedSave(mode, undefined)
    }
  }

  function setPalette(palette: ColorPalette) {
    colorPalette.value = palette
    paletteCookie.value = palette
    if (import.meta.client) {
      localStorage.setItem(PALETTE_KEY, palette)
      applyTheme()
      debouncedSave(undefined, palette)
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

    // Load saved preferences from localStorage (primary) or cookie (fallback)
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null
    const savedPalette = localStorage.getItem(PALETTE_KEY) as ColorPalette | null

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      themeMode.value = savedTheme
      themeCookie.value = savedTheme // Sync cookie
    } else if (themeCookie.value) {
      themeMode.value = themeCookie.value
      localStorage.setItem(THEME_KEY, themeCookie.value)
    }

    if (savedPalette && ['corporate', 'lava', 'dracula', 'ocean', 'forest'].includes(savedPalette)) {
      colorPalette.value = savedPalette
      paletteCookie.value = savedPalette // Sync cookie
    } else if (paletteCookie.value) {
      colorPalette.value = paletteCookie.value
      localStorage.setItem(PALETTE_KEY, paletteCookie.value)
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

  // Set user context for database persistence
  function setUserContext(userId: string, tenantSlug: string) {
    userContext.value = { userId, tenantSlug }
  }

  // Clear user context (on logout)
  function clearUserContext() {
    userContext.value = null
  }

  // Load preferences from database (call after user is authenticated)
  async function loadFromDatabase(userId: string, tenantSlug: string) {
    if (!import.meta.client) return

    setUserContext(userId, tenantSlug)

    try {
      const response = await $fetch<{
        success: boolean
        preferences: { theme: string | null; colorPalette: string | null }
      }>(`/api/tenant/${tenantSlug}/user/preferences`, {
        query: { userId }
      })

      if (response.success && response.preferences) {
        // Apply database preferences if they exist
        if (response.preferences.theme && ['light', 'dark', 'system'].includes(response.preferences.theme)) {
          themeMode.value = response.preferences.theme as ThemeMode
          themeCookie.value = response.preferences.theme as ThemeMode
          localStorage.setItem(THEME_KEY, response.preferences.theme)
        }
        if (response.preferences.colorPalette && ['corporate', 'lava', 'dracula', 'ocean', 'forest'].includes(response.preferences.colorPalette)) {
          colorPalette.value = response.preferences.colorPalette as ColorPalette
          paletteCookie.value = response.preferences.colorPalette as ColorPalette
          localStorage.setItem(PALETTE_KEY, response.preferences.colorPalette)
        }
        applyTheme()
      }
    } catch (error) {
      console.warn('Failed to load theme preferences from database:', error)
    }
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
    setUserContext,
    clearUserContext,
    loadFromDatabase,
    palettes: ['corporate', 'lava', 'dracula', 'ocean', 'forest'] as const,
    themeModes: ['light', 'dark', 'system'] as const
  }
}
