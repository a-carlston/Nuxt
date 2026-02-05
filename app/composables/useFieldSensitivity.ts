/**
 * Composable for handling field-level sensitivity configuration.
 *
 * Provides field sensitivity checking and masking type retrieval based on
 * the user's role configuration. Automatically fetches configuration on auth.
 */

interface FieldConfig {
  level: number
  masking: string
}

interface FieldSensitivityState {
  loaded: boolean
  loading: boolean
  config: Record<string, Record<string, FieldConfig>>
  userMaxLevel: number
}

export function useFieldSensitivity() {
  const { isAuthenticated, tenant } = useAuth()

  // Field sensitivity state (uses useState for SSR hydration)
  const fieldSensitivityState = useState<FieldSensitivityState>('field-sensitivity-state', () => ({
    loaded: false,
    loading: false,
    config: {},
    userMaxLevel: 100, // Default to most restrictive (highest number = least access)
  }))

  // Computed properties
  const isLoaded = computed(() => fieldSensitivityState.value.loaded)
  const isLoading = computed(() => fieldSensitivityState.value.loading)
  const config = computed(() => fieldSensitivityState.value.config)
  const userMaxLevel = computed(() => fieldSensitivityState.value.userMaxLevel)

  /**
   * List of fields the user cannot access (sensitivity level too high)
   */
  const sensitiveFields = computed(() => {
    const result: Array<{ table: string; field: string; level: number; masking: string }> = []
    const cfg = fieldSensitivityState.value.config
    const maxLevel = fieldSensitivityState.value.userMaxLevel

    for (const [tableName, fields] of Object.entries(cfg)) {
      for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        // User cannot access if their max level is higher than the field's level
        // (lower number = more access)
        if (maxLevel > fieldConfig.level) {
          result.push({
            table: tableName,
            field: fieldName,
            level: fieldConfig.level,
            masking: fieldConfig.masking,
          })
        }
      }
    }

    return result
  })

  /**
   * Fetch field sensitivity configuration from the server
   */
  async function fetchSensitivityConfig(): Promise<void> {
    if (!isAuthenticated.value || !tenant.value?.slug) {
      return
    }

    fieldSensitivityState.value.loading = true

    try {
      // Forward cookies during SSR
      const headers: HeadersInit = {}
      if (import.meta.server) {
        const requestHeaders = useRequestHeaders(['cookie'])
        if (requestHeaders.cookie) {
          headers.cookie = requestHeaders.cookie
        }
      }

      const response = await $fetch<{
        success: boolean
        data: {
          config: Record<string, Record<string, FieldConfig>>
          userMaxLevel: number
        }
      }>(`/api/tenant/${tenant.value.slug}/rbac/field-sensitivity`, {
        credentials: 'include',
        headers,
      })

      if (response.success) {
        fieldSensitivityState.value = {
          loaded: true,
          loading: false,
          config: response.data.config,
          userMaxLevel: response.data.userMaxLevel,
        }
      }
    } catch (error) {
      console.error('Failed to fetch field sensitivity config:', error)
      fieldSensitivityState.value.loading = false
    }
  }

  /**
   * Initialize field sensitivity (call after login)
   */
  async function initFieldSensitivity(): Promise<void> {
    if (fieldSensitivityState.value.loaded) {
      return
    }

    await fetchSensitivityConfig()
  }

  /**
   * Clear field sensitivity config (call on logout)
   */
  function clearFieldSensitivity(): void {
    fieldSensitivityState.value = {
      loaded: false,
      loading: false,
      config: {},
      userMaxLevel: 100,
    }
  }

  /**
   * Check if the current user can access a specific field
   * User can access if their maxLevel <= field's level (lower = more access)
   */
  function canAccessField(tableName: string, fieldName: string): boolean {
    if (!fieldSensitivityState.value.loaded) {
      return false
    }

    const fieldConfig = fieldSensitivityState.value.config[tableName]?.[fieldName]

    // If no config exists for this field, assume it's accessible (no sensitivity restriction)
    if (!fieldConfig) {
      return true
    }

    // User can access if their max level is less than or equal to the field's level
    return fieldSensitivityState.value.userMaxLevel <= fieldConfig.level
  }

  /**
   * Get the full configuration for a specific field
   */
  function getFieldConfig(tableName: string, fieldName: string): FieldConfig | null {
    return fieldSensitivityState.value.config[tableName]?.[fieldName] ?? null
  }

  /**
   * Get just the masking type for a specific field
   */
  function getMaskingType(tableName: string, fieldName: string): string | null {
    return fieldSensitivityState.value.config[tableName]?.[fieldName]?.masking ?? null
  }

  // Auto-init on client when auth is ready
  if (import.meta.client) {
    watch(
      () => isAuthenticated.value,
      (authenticated) => {
        if (authenticated && !fieldSensitivityState.value.loaded) {
          initFieldSensitivity()
        } else if (!authenticated) {
          clearFieldSensitivity()
        }
      },
      { immediate: true }
    )
  }

  return {
    // State
    fieldSensitivityState: readonly(fieldSensitivityState),
    isLoaded,
    isLoading,
    config,
    userMaxLevel,

    // Computed
    sensitiveFields,

    // Actions
    fetchSensitivityConfig,
    initFieldSensitivity,
    clearFieldSensitivity,

    // Field checking
    canAccessField,
    getFieldConfig,
    getMaskingType,
  }
}
