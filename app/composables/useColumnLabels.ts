import { ref, computed } from 'vue'

/**
 * API response type for column labels
 * The API returns labels in the format: { columnId: { label: string } }
 */
interface ApiLabelValue {
  label: string
}

interface ColumnLabelsResponse {
  success: boolean
  labels: Record<string, ApiLabelValue | string>
}

/**
 * API response type for save/delete operations
 */
interface SaveLabelsResponse {
  success: boolean
  message?: string
}

// Cache storage: Map<cacheKey, labels>
// Cache key format: "tenantSlug:tableId"
const labelCache = new Map<string, Record<string, string>>()

/**
 * Composable for managing company-level column label overrides.
 *
 * Provides functionality to:
 * - Load column labels from the API with caching
 * - Get display labels (override or default)
 * - Save/delete individual label overrides (admin only)
 * - Bulk save all labels at once
 *
 * @param tableId - The table identifier (e.g., 'directory', 'timeoff')
 * @returns Methods and reactive state for managing column labels
 *
 * @example
 * ```ts
 * const { companyLabels, loading, getDisplayLabel, loadLabels } = useColumnLabels('directory')
 *
 * // Load labels on mount
 * await loadLabels()
 *
 * // Get display label for a column
 * const label = getDisplayLabel({ id: 'firstName', label: 'First Name' })
 * // Returns company override if exists, otherwise 'First Name'
 * ```
 */
export function useColumnLabels(tableId: string) {
  // Get tenant slug from route
  const route = useRoute()
  const tenantSlug = computed(() => route.params.slug as string)

  // Cache key for this table
  const cacheKey = computed(() => `${tenantSlug.value}:${tableId}`)

  // Reactive state
  const companyLabels = ref<Record<string, string>>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Load column labels from API.
   * Uses cache to avoid repeated fetches within the same session.
   *
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async function loadLabels(forceRefresh = false): Promise<void> {
    if (!tenantSlug.value) {
      console.warn('[useColumnLabels] No tenant slug available')
      return
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh && labelCache.has(cacheKey.value)) {
      companyLabels.value = labelCache.get(cacheKey.value) || {}
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ColumnLabelsResponse>(
        `/api/tenant/${tenantSlug.value}/settings/column-labels`,
        {
          method: 'GET',
          params: { tableId }
        }
      )

      if (response.success) {
        // Transform API response: { columnId: { label } } -> { columnId: label }
        const rawLabels = response.labels || {}
        const flatLabels: Record<string, string> = {}

        for (const [columnId, value] of Object.entries(rawLabels)) {
          if (typeof value === 'string') {
            // Already flat format
            flatLabels[columnId] = value
          } else if (value && typeof value === 'object' && 'label' in value) {
            // Nested { label: string } format
            flatLabels[columnId] = value.label
          }
        }

        companyLabels.value = flatLabels
        // Update cache
        labelCache.set(cacheKey.value, companyLabels.value)
      } else {
        companyLabels.value = {}
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      companyLabels.value = {}
      console.error('[useColumnLabels] Failed to load labels:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Get the display label for a column.
   * Returns the company override if one exists, otherwise returns the default label.
   *
   * @param column - Object with id and label properties
   * @returns The display label string
   */
  function getDisplayLabel(column: { id: string; label: string }): string {
    // Check for company override
    const override = companyLabels.value[column.id]
    if (override && override.trim()) {
      return override
    }
    // Fall back to default label
    return column.label
  }

  /**
   * Save a single label override.
   * Admin-only operation.
   *
   * @param columnId - The column identifier
   * @param label - The custom label to save
   */
  async function saveLabel(columnId: string, label: string): Promise<void> {
    if (!tenantSlug.value) {
      throw new Error('No tenant slug available')
    }

    loading.value = true
    error.value = null

    try {
      // Build labels object with just this single label
      const labels: Record<string, string> = { [columnId]: label }

      const response = await $fetch<SaveLabelsResponse>(
        `/api/tenant/${tenantSlug.value}/settings/column-labels`,
        {
          method: 'POST',
          body: { tableId, labels }
        }
      )

      if (response.success) {
        // Update local state
        companyLabels.value = {
          ...companyLabels.value,
          [columnId]: label
        }
        // Update cache
        labelCache.set(cacheKey.value, companyLabels.value)
      } else {
        throw new Error(response.message || 'Failed to save label')
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a label override, reverting to the default.
   * Admin-only operation.
   *
   * @param columnId - The column identifier to delete
   */
  async function deleteLabel(columnId: string): Promise<void> {
    if (!tenantSlug.value) {
      throw new Error('No tenant slug available')
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<SaveLabelsResponse>(
        `/api/tenant/${tenantSlug.value}/settings/column-labels`,
        {
          method: 'DELETE',
          params: { tableId, columnId }
        }
      )

      if (response.success) {
        // Remove from local state
        const updated = { ...companyLabels.value }
        delete updated[columnId]
        companyLabels.value = updated
        // Update cache
        labelCache.set(cacheKey.value, companyLabels.value)
      } else {
        throw new Error(response.message || 'Failed to delete label')
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Save all labels at once.
   * Replaces all existing labels for this table with the provided labels.
   * Admin-only operation.
   *
   * @param labels - Record of columnId to label mappings
   */
  async function saveAllLabels(labels: Record<string, string>): Promise<void> {
    if (!tenantSlug.value) {
      throw new Error('No tenant slug available')
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<SaveLabelsResponse>(
        `/api/tenant/${tenantSlug.value}/settings/column-labels`,
        {
          method: 'POST',
          body: { tableId, labels }
        }
      )

      if (response.success) {
        // Update local state with new labels
        companyLabels.value = { ...labels }
        // Update cache
        labelCache.set(cacheKey.value, companyLabels.value)
      } else {
        throw new Error(response.message || 'Failed to save labels')
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear the cache for this table.
   * Useful when labels are modified externally.
   */
  function clearCache(): void {
    labelCache.delete(cacheKey.value)
  }

  /**
   * Clear all cached labels across all tables.
   * Useful on logout or tenant switch.
   */
  function clearAllCache(): void {
    labelCache.clear()
  }

  /**
   * Check if a column has a custom label override.
   *
   * @param columnId - The column identifier
   * @returns True if a custom label exists
   */
  function hasOverride(columnId: string): boolean {
    const override = companyLabels.value[columnId]
    return Boolean(override && override.trim())
  }

  return {
    // Reactive state
    companyLabels,
    loading,
    error,

    // Methods
    getDisplayLabel,
    loadLabels,
    saveLabel,
    deleteLabel,
    saveAllLabels,
    clearCache,
    clearAllCache,
    hasOverride
  }
}
