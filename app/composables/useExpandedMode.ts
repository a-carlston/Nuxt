/**
 * Composable for managing expanded mode state with persistence.
 *
 * Expanded mode controls whether the layout uses full-width or constrained content.
 * State is persisted across:
 * - Page navigation (via useState)
 * - Page refreshes (via localStorage + cookies)
 * - Optionally to database (for cross-device sync)
 */

const STORAGE_KEY = 'neu-expanded-mode'
const COOKIE_KEY = 'neu-expanded'

export function useExpandedMode() {
  // Global state using useState for SSR compatibility and cross-page persistence
  const isExpanded = useState<boolean>('expanded-mode', () => false)
  const isInitialized = useState<boolean>('expanded-mode-initialized', () => false)

  // User context for optional database persistence
  const userContext = useState<{ userId: string; tenantSlug: string } | null>(
    'expanded-mode-user-context',
    () => null
  )

  // Cookie for server-side hydration (prevents flash on page load)
  const expandedCookie = useCookie<boolean>(COOKIE_KEY, { default: () => false })

  // Debounced save to prevent excessive API calls
  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Save preference to database (optional, for cross-device sync)
   */
  async function saveToDatabase(expanded: boolean) {
    if (!userContext.value || !import.meta.client) return

    const { userId, tenantSlug } = userContext.value
    if (!userId || !tenantSlug) return

    try {
      await $fetch(`/api/tenant/${tenantSlug}/user/preferences`, {
        method: 'POST',
        body: {
          userId,
          preferences: {
            expandedMode: expanded
          }
        }
      })
    } catch (error) {
      console.warn('Failed to save expanded mode preference to database:', error)
    }
  }

  function debouncedSave(expanded: boolean) {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveToDatabase(expanded), 500)
  }

  /**
   * Toggle expanded mode on/off
   */
  function toggle() {
    setExpanded(!isExpanded.value)
  }

  /**
   * Set expanded mode to a specific value
   */
  function setExpanded(value: boolean) {
    isExpanded.value = value
    expandedCookie.value = value

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      debouncedSave(value)
    }
  }

  /**
   * Initialize expanded mode from persisted storage.
   * Call this once in the layout's onMounted.
   */
  function init() {
    if (!import.meta.client || isInitialized.value) return

    // Priority: localStorage > cookie > default (false)
    const savedValue = localStorage.getItem(STORAGE_KEY)

    if (savedValue !== null) {
      try {
        const parsed = JSON.parse(savedValue)
        if (typeof parsed === 'boolean') {
          isExpanded.value = parsed
          expandedCookie.value = parsed // Sync cookie
        }
      } catch {
        // Invalid JSON, ignore
      }
    } else if (expandedCookie.value !== undefined) {
      // Fall back to cookie value
      isExpanded.value = expandedCookie.value
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedCookie.value))
    }

    isInitialized.value = true
  }

  /**
   * Set user context for database persistence
   */
  function setUserContext(userId: string, tenantSlug: string) {
    userContext.value = { userId, tenantSlug }
  }

  /**
   * Clear user context (on logout)
   */
  function clearUserContext() {
    userContext.value = null
  }

  /**
   * Load preference from database (call after user is authenticated)
   */
  async function loadFromDatabase(userId: string, tenantSlug: string) {
    if (!import.meta.client) return

    setUserContext(userId, tenantSlug)

    try {
      const response = await $fetch<{
        success: boolean
        preferences: { expandedMode?: boolean }
      }>(`/api/tenant/${tenantSlug}/user/preferences`, {
        query: { userId }
      })

      if (response.success && response.preferences?.expandedMode !== undefined) {
        const dbValue = response.preferences.expandedMode
        isExpanded.value = dbValue
        expandedCookie.value = dbValue
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbValue))
      }
    } catch (error) {
      console.warn('Failed to load expanded mode preference from database:', error)
    }
  }

  return {
    /** Current expanded state (reactive) */
    isExpanded: readonly(isExpanded),
    /** Whether the composable has been initialized */
    isInitialized: readonly(isInitialized),
    /** Toggle expanded mode */
    toggle,
    /** Set expanded mode to a specific value */
    setExpanded,
    /** Initialize from storage (call once in layout onMounted) */
    init,
    /** Set user context for database persistence */
    setUserContext,
    /** Clear user context */
    clearUserContext,
    /** Load preference from database */
    loadFromDatabase
  }
}
