import { ref, watch, computed } from 'vue'

/**
 * Column preferences structure stored in API/localStorage
 */
export interface ColumnPreferences {
  visible: string[]
  order: string[]
}

/**
 * API response structure for GET /api/tenant/[slug]/user/preferences
 */
interface PreferencesResponse {
  success: boolean
  preferences: {
    [tableKey: string]: ColumnPreferences
  }
}

/**
 * Configuration options for the composable
 */
export interface UseColumnPreferencesConfig {
  /** Tenant slug for API endpoint */
  tenantSlug: string
  /** User ID for the preferences (optional for anonymous users) */
  userId?: string
  /** Debounce delay in milliseconds for saving (default: 300) */
  debounceMs?: number
}

// Debounce helper
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Composable for managing column visibility and order persistence.
 *
 * Features:
 * - Loads preferences from API on init
 * - Saves preferences with debounce (300ms default)
 * - Falls back to localStorage for anonymous users or API failures
 * - Returns reactive `visible` and `order` arrays
 * - Auto-saves when either array changes
 *
 * @param tableKey - Unique key for the table (e.g., 'directoryColumns')
 * @param defaultColumns - Default column configuration
 * @param config - Configuration options including tenantSlug and userId
 *
 * @example
 * ```ts
 * const { visible, order, loading, save } = useColumnPreferences(
 *   'directoryColumns',
 *   { visible: ['id', 'name', 'email'], order: ['id', 'name', 'email'] },
 *   { tenantSlug: 'acme', userId: 'user-123' }
 * )
 * ```
 */
export function useColumnPreferences(
  tableKey: string,
  defaultColumns: ColumnPreferences,
  config: UseColumnPreferencesConfig
) {
  // Store config values as refs to support reactive updates
  const tenantSlugRef = ref(config.tenantSlug)
  const userIdRef = ref(config.userId)
  const debounceMs = config.debounceMs ?? 300


  // State
  const visible = ref<string[]>([...defaultColumns.visible])
  const order = ref<string[]>([...defaultColumns.order])
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<Error | null>(null)

  // Track if we're currently in the load process to prevent save during load
  const isLoading = ref(false)

  // localStorage key for fallback storage
  const localStorageKey = computed(() => `columnPrefs:${tenantSlugRef.value}:${tableKey}`)

  /**
   * Load preferences from localStorage (fallback)
   */
  function loadFromLocalStorage(): ColumnPreferences | null {
    if (!import.meta.client) return null

    try {
      const stored = localStorage.getItem(localStorageKey.value)
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnPreferences
        if (Array.isArray(parsed.visible) && Array.isArray(parsed.order)) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load column preferences from localStorage:', e)
    }
    return null
  }

  /**
   * Save preferences to localStorage (fallback)
   */
  function saveToLocalStorage(): void {
    if (!import.meta.client) return

    try {
      const data: ColumnPreferences = {
        visible: visible.value,
        order: order.value
      }
      localStorage.setItem(localStorageKey.value, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save column preferences to localStorage:', e)
    }
  }

  /**
   * Load preferences from API
   */
  async function loadFromApi(): Promise<ColumnPreferences | null> {
    const userId = userIdRef.value
    const tenantSlug = tenantSlugRef.value


    if (!userId || !tenantSlug) {
      return null
    }

    try {
      const response = await $fetch<PreferencesResponse>(
        `/api/tenant/${tenantSlug}/user/preferences`,
        {
          query: { userId }
        }
      )


      if (response.success && response.preferences?.[tableKey]) {
        const prefs = response.preferences[tableKey]
        if (Array.isArray(prefs.visible) && Array.isArray(prefs.order)) {
          return prefs
        }
      }
    } catch (e) {
      console.warn('Failed to load column preferences from API:', e)
      error.value = e instanceof Error ? e : new Error(String(e))
    }
    return null
  }

  /**
   * Save preferences to API
   */
  async function saveToApi(): Promise<boolean> {
    const userId = userIdRef.value
    const tenantSlug = tenantSlugRef.value


    if (!userId || !tenantSlug) {
      return false
    }

    try {
      const response = await $fetch<{ success: boolean; message?: string }>(
        `/api/tenant/${tenantSlug}/user/preferences`,
        {
          method: 'POST',
          body: {
            userId,
            preferences: {
              [tableKey]: {
                visible: visible.value,
                order: order.value
              }
            }
          }
        }
      )


      if (!response.success) {
        console.warn('API returned success: false when saving preferences:', response.message)
        return false
      }

      error.value = null
      return true
    } catch (e) {
      console.warn('Failed to save column preferences to API:', e)
      error.value = e instanceof Error ? e : new Error(String(e))
      return false
    }
  }

  /**
   * Internal save function that tries API first, then falls back to localStorage
   */
  async function saveInternal(): Promise<void> {
    // Always save to localStorage as backup
    saveToLocalStorage()

    // Try API if we have a userId
    if (userIdRef.value) {
      await saveToApi()
    }
  }

  // Create debounced save function
  const debouncedSave = debounce(saveInternal, debounceMs)

  /**
   * Load preferences (API first, then localStorage fallback)
   */
  async function load(): Promise<void> {

    loading.value = true
    isLoading.value = true
    error.value = null

    try {
      // Try API first if we have userId
      let prefs: ColumnPreferences | null = null

      if (userIdRef.value) {
        prefs = await loadFromApi()
      }

      // Fall back to localStorage
      if (!prefs) {
        prefs = loadFromLocalStorage()
      }

      // Apply loaded preferences or use defaults
      // Always create new arrays to ensure reactivity works correctly
      if (prefs) {
        // Validate that loaded preferences contain valid column IDs
        // Use loaded values if they have content, otherwise use defaults
        visible.value = prefs.visible.length > 0 ? [...prefs.visible] : [...defaultColumns.visible]
        order.value = prefs.order.length > 0 ? [...prefs.order] : [...defaultColumns.order]
      } else {
        // No saved preferences, use defaults
        visible.value = [...defaultColumns.visible]
        order.value = [...defaultColumns.order]
      }
    } finally {
      loading.value = false
      isLoading.value = false
      initialized.value = true
    }
  }

  /**
   * Manual save function (bypasses debounce)
   */
  async function save(): Promise<void> {
    await saveInternal()
  }

  /**
   * Reset preferences to defaults
   */
  function reset(): void {
    visible.value = [...defaultColumns.visible]
    order.value = [...defaultColumns.order]
    // Save immediately after reset
    saveInternal()
  }

  /**
   * Update config values (useful when userId becomes available after init)
   */
  function updateConfig(newConfig: Partial<UseColumnPreferencesConfig>): void {

    if (newConfig.tenantSlug !== undefined) {
      tenantSlugRef.value = newConfig.tenantSlug
    }
    if (newConfig.userId !== undefined) {
      userIdRef.value = newConfig.userId
    }
  }

  /**
   * Update visible columns
   */
  function setVisible(newVisible: string[]): void {
    visible.value = [...newVisible]
  }

  /**
   * Update column order
   */
  function setOrder(newOrder: string[]): void {
    order.value = [...newOrder]
  }

  // Watch for changes and auto-save with debounce
  // Only watch after initialization and not during load to prevent saving defaults
  watch(
    [visible, order],
    (newValues, oldValues) => {
      // Skip if not initialized or currently loading
      if (!initialized.value || isLoading.value) {
        return
      }

      // Skip if values haven't actually changed (reference equality check)
      const [newVisible, newOrder] = newValues
      const [oldVisible, oldOrder] = oldValues || [[], []]

      // Only save if there's an actual change
      if (
        JSON.stringify(newVisible) !== JSON.stringify(oldVisible) ||
        JSON.stringify(newOrder) !== JSON.stringify(oldOrder)
      ) {
        debouncedSave()
      }
    },
    { deep: true }
  )

  // Auto-load on creation (client-side only)
  if (import.meta.client) {
    load()
  }

  return {
    // Reactive state
    visible,
    order,
    loading,
    initialized,
    error,

    // Actions
    load,
    save,
    reset,
    setVisible,
    setOrder,
    updateConfig
  }
}
