import { ref, computed, watch } from 'vue'
import type {
  TableRow,
  SortDirection,
  FilterValue
} from '~/types/table'

// Sort order type (alias for cleaner API)
export type SortOrder = 'asc' | 'desc'

// Config for useTableData composable
export interface UseTableDataConfig {
  fetchUrl: string
  defaultPageSize?: number
  defaultSortBy?: string
  defaultSortOrder?: SortOrder
}

// Fetch params sent to the API
export interface TableFetchParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: SortOrder
  filters?: Record<string, FilterValue>
  search?: string
}

// Expected API response format
export interface TableFetchResponse<T = TableRow> {
  success?: boolean
  data: T[]
  total?: number
  page?: number
  pageSize?: number
  // Support nested pagination format from API
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
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

export function useTableData<T extends TableRow = TableRow>(config: UseTableDataConfig) {
  const {
    fetchUrl,
    defaultPageSize = 10,
    defaultSortBy,
    defaultSortOrder = 'asc'
  } = config

  // State
  const data = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const total = ref(0)
  const sortBy = ref<string | null>(defaultSortBy ?? null)
  const sortOrder = ref<SortOrder>(defaultSortOrder)
  const filters = ref<Map<string, FilterValue>>(new Map())
  const globalSearch = ref('')
  const selectedRowIds = ref<Set<string | number>>(new Set())

  // Computed
  const selectedRows = computed(() => {
    return data.value.filter((row) => selectedRowIds.value.has(row.id))
  })

  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value) || 1
  })

  const hasNextPage = computed(() => page.value < totalPages.value)
  const hasPrevPage = computed(() => page.value > 1)

  const isAllSelected = computed(() => {
    if (data.value.length === 0) return false
    return data.value.every((row) => selectedRowIds.value.has(row.id))
  })

  const isSomeSelected = computed(() => {
    return selectedRowIds.value.size > 0 && !isAllSelected.value
  })

  // Build query params for fetch
  function buildFetchParams(): TableFetchParams {
    const params: TableFetchParams = {
      page: page.value,
      pageSize: pageSize.value
    }

    if (sortBy.value) {
      params.sortBy = sortBy.value
      params.sortOrder = sortOrder.value
    }

    if (filters.value.size > 0) {
      const filterObj: Record<string, FilterValue> = {}
      filters.value.forEach((value, key) => {
        if (value !== null && value !== undefined && value !== '') {
          filterObj[key] = value
        }
      })
      if (Object.keys(filterObj).length > 0) {
        params.filters = filterObj
      }
    }

    if (globalSearch.value.trim()) {
      params.search = globalSearch.value.trim()
    }

    return params
  }

  // Core fetch function
  async function fetch() {
    loading.value = true
    error.value = null

    try {
      const params = buildFetchParams()
      const response = await $fetch<TableFetchResponse<T>>(fetchUrl, {
        method: 'GET',
        params: {
          page: params.page,
          pageSize: params.pageSize,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          filters: params.filters ? JSON.stringify(params.filters) : undefined,
          search: params.search
        }
      })

      data.value = response.data
      // Handle both flat total and nested pagination.total formats
      total.value = response.total ?? response.pagination?.total ?? 0
      // Update page/pageSize if server returns different values
      if (response.page !== undefined) page.value = response.page
      else if (response.pagination?.page !== undefined) page.value = response.pagination.page
      if (response.pageSize !== undefined) pageSize.value = response.pageSize
      else if (response.pagination?.pageSize !== undefined) pageSize.value = response.pagination.pageSize
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      data.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  // Debounced fetch for filter/search changes
  const debouncedFetch = debounce(fetch, 300)

  // Actions
  function setPage(n: number) {
    if (n < 1) n = 1
    if (n > totalPages.value) n = totalPages.value
    page.value = n
    fetch()
  }

  function setPageSize(n: number) {
    if (n < 1) n = 1
    pageSize.value = n
    // Reset to first page when changing page size
    page.value = 1
    fetch()
  }

  function setSort(field: string, order?: SortOrder) {
    // Toggle order if same field, otherwise use provided order or default
    if (sortBy.value === field && order === undefined) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = order ?? 'asc'
    }
    // Reset to first page when sorting changes
    page.value = 1
    fetch()
  }

  function setFilter(field: string, value: FilterValue) {
    if (value === null || value === undefined || value === '') {
      filters.value.delete(field)
    } else {
      filters.value.set(field, value)
    }
    // Reset to first page when filters change
    page.value = 1
    debouncedFetch()
  }

  function clearFilters() {
    filters.value.clear()
    page.value = 1
    fetch()
  }

  function setGlobalSearch(search: string) {
    globalSearch.value = search
    // Reset to first page when search changes
    page.value = 1
    debouncedFetch()
  }

  function toggleRowSelection(id: string | number) {
    if (selectedRowIds.value.has(id)) {
      selectedRowIds.value.delete(id)
    } else {
      selectedRowIds.value.add(id)
    }
    // Trigger reactivity
    selectedRowIds.value = new Set(selectedRowIds.value)
  }

  function selectAll() {
    data.value.forEach((row) => {
      selectedRowIds.value.add(row.id)
    })
    // Trigger reactivity
    selectedRowIds.value = new Set(selectedRowIds.value)
  }

  function clearSelection() {
    selectedRowIds.value.clear()
    // Trigger reactivity
    selectedRowIds.value = new Set()
  }

  function selectRows(ids: (string | number)[]) {
    ids.forEach((id) => selectedRowIds.value.add(id))
    // Trigger reactivity
    selectedRowIds.value = new Set(selectedRowIds.value)
  }

  function deselectRows(ids: (string | number)[]) {
    ids.forEach((id) => selectedRowIds.value.delete(id))
    // Trigger reactivity
    selectedRowIds.value = new Set(selectedRowIds.value)
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      clearSelection()
    } else {
      selectAll()
    }
  }

  function refresh() {
    return fetch()
  }

  function reset() {
    page.value = 1
    pageSize.value = defaultPageSize
    sortBy.value = defaultSortBy ?? null
    sortOrder.value = defaultSortOrder
    filters.value.clear()
    globalSearch.value = ''
    selectedRowIds.value.clear()
    return fetch()
  }

  // Watch for external changes to trigger reactivity updates
  watch(
    () => filters.value.size,
    () => {
      // Force reactivity when filters map changes
    },
    { deep: true }
  )

  return {
    // State
    data,
    loading,
    error,
    page,
    pageSize,
    total,
    sortBy,
    sortOrder,
    filters,
    globalSearch,
    selectedRowIds,
    // Computed
    selectedRows,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isAllSelected,
    isSomeSelected,
    // Actions
    fetch,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    clearFilters,
    setGlobalSearch,
    toggleRowSelection,
    selectAll,
    clearSelection,
    selectRows,
    deselectRows,
    toggleSelectAll,
    refresh,
    reset
  }
}
