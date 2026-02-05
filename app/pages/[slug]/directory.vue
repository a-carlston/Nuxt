<script setup lang="ts">
import type { Ref } from 'vue'
import type { TableColumn, BulkPayload, BulkResponse } from '~/types/table'
import { usePendingChanges } from '~/composables/usePendingChanges'
import { useColumnPreferences } from '~/composables/useColumnPreferences'
import { useColumnLabels } from '~/composables/useColumnLabels'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Get tenant slug from route
const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

// Inject layout state
const user = inject<Ref<{ firstName: string; lastName: string; email: string; avatarUrl: string | null; title: string }>>('layoutUser')!
const company = inject<Ref<{ name: string; slug: string; tagline: string; logoUrl: string | null }>>('layoutCompany')!
const isExpanded = inject<Ref<boolean>>('layoutIsExpanded')!

// Pending changes (shared state with NeuDataTable)
const pendingChanges = usePendingChanges()

// Column labels composable for admin-customized column names
const {
  companyLabels,
  loading: labelsLoading,
  loadLabels: loadColumnLabels,
  getDisplayLabel
} = useColumnLabels('directory')

// Auth state
const { user: authUser, isInitialized: authInitialized, initAuth } = useAuth()

// ============================================================================
// State
// ============================================================================

const isSaving = ref(false)
const showReviewSidebar = ref(false)
const expandedGroups = ref<Set<string | number>>(new Set())

// Session data (derived from auth)
const session = computed(() => {
  if (!authUser.value) return null
  return { userId: authUser.value.id, tenantSlug: tenantSlug.value }
})

// Column preferences composable (initialized after we have session data)
// Use shallowRef to prevent Vue from unwrapping the inner refs returned by the composable
const columnPreferences = shallowRef<ReturnType<typeof useColumnPreferences> | null>(null)

// Notification state
const notification = ref<{
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
} | null>(null)

// Table reference
const tableRef = ref<{
  refresh: () => Promise<void>
  getSelectedRows: () => unknown[]
  getPendingChanges: () => BulkPayload
  clearPendingChanges: () => void
  triggerSave: () => void
} | null>(null)

// ============================================================================
// Computed
// ============================================================================

const fetchUrl = computed(() => {
  if (!tenantSlug.value) return ''
  return `/api/tenant/${tenantSlug.value}/users`
})

// Computed values from column preferences
// Using shallowRef preserves the inner refs, so we access them with .value
const visibleColumnIds = computed<string[]>(() => {
  const prefs = columnPreferences.value
  if (!prefs) return columns.map(col => col.id)
  return prefs.visible.value
})
const columnOrder = computed<string[]>(() => {
  const prefs = columnPreferences.value
  if (!prefs) return columns.map(col => col.id)
  return prefs.order.value
})
const preferencesLoaded = computed<boolean>(() => {
  const prefs = columnPreferences.value
  if (!prefs) return false
  return prefs.initialized.value
})

// URL to the admin settings page for customizing column names
const columnSettingsUrl = computed(() => {
  if (!tenantSlug.value) return undefined
  return `/${tenantSlug.value}/admin/settings/columns`
})

// Columns with custom labels applied (for column manager display)
const columnsWithLabels = computed<TableColumn[]>(() => {
  return columns.map(col => ({
    ...col,
    label: getDisplayLabel(col)
  }))
})

// Displayed columns (filtered by visibility, ordered by user preference, with custom labels)
const displayedColumns = computed(() => {
  // If no preferences loaded yet, show all columns in original order with custom labels
  if (!preferencesLoaded.value || visibleColumnIds.value.length === 0) {
    return columnsWithLabels.value
  }

  // Filter visible columns
  const visible = columnsWithLabels.value.filter(col => visibleColumnIds.value.includes(col.id))

  // Sort by user-defined order
  const orderMap = new Map(columnOrder.value.map((id, index) => [id, index]))
  return visible.sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity
    const orderB = orderMap.get(b.id) ?? Infinity
    return orderA - orderB
  })
})

// Pending edits as array for toast
const pendingEditsArray = computed(() => {
  return pendingChanges.getChangesPayload().edits
})

// Pending deletes as array for toast
const pendingDeletesArray = computed(() => {
  return pendingChanges.getChangesPayload().deletes
})

// Group changes by row for the review sidebar
interface GroupedChange {
  rowId: string | number
  rowName: string
  rowAvatarUrl?: string
  edits: typeof pendingEditsArray.value
  isDeleted: boolean
}

const groupedChanges = computed<GroupedChange[]>(() => {
  const changes = pendingChanges.getChangesPayload()
  const groups = new Map<string | number, GroupedChange>()

  // Group edits by rowId
  for (const edit of changes.edits) {
    const existing = groups.get(edit.rowId)
    if (existing) {
      existing.edits.push(edit)
      // Update avatar if we have one and existing doesn't
      if (!existing.rowAvatarUrl && edit.rowAvatarUrl) {
        existing.rowAvatarUrl = edit.rowAvatarUrl
      }
    } else {
      groups.set(edit.rowId, {
        rowId: edit.rowId,
        rowName: edit.rowName || `Row ${edit.rowId}`,
        rowAvatarUrl: edit.rowAvatarUrl,
        edits: [edit],
        isDeleted: false
      })
    }
  }

  // Add deletes
  for (const del of changes.deletes) {
    const existing = groups.get(del.rowId)
    // Get row name and avatar from rowData
    const rowData = del.rowData
    const rowName = rowData
      ? `${rowData.firstName || ''} ${rowData.lastName || ''}`.trim() || `Row ${del.rowId}`
      : `Row ${del.rowId}`
    const rowAvatarUrl = rowData?.avatarUrl || rowData?.avatar_url || rowData?.avatar

    if (existing) {
      existing.isDeleted = true
      // Update avatar if we have one from delete and existing doesn't
      if (!existing.rowAvatarUrl && rowAvatarUrl) {
        existing.rowAvatarUrl = String(rowAvatarUrl)
      }
    } else {
      groups.set(del.rowId, {
        rowId: del.rowId,
        rowName,
        rowAvatarUrl: rowAvatarUrl ? String(rowAvatarUrl) : undefined,
        edits: [],
        isDeleted: true
      })
    }
  }

  return Array.from(groups.values())
})

// Get column label from field name (uses custom labels if available)
function getColumnLabel(field: string): string {
  const column = columns.find(c => c.field === field)
  if (!column) return field
  return getDisplayLabel(column)
}

// Toggle group expansion in review sidebar
function toggleGroupExpanded(rowId: string | number) {
  if (expandedGroups.value.has(rowId)) {
    expandedGroups.value.delete(rowId)
  } else {
    expandedGroups.value.add(rowId)
  }
  // Trigger reactivity
  expandedGroups.value = new Set(expandedGroups.value)
}

function isGroupExpanded(rowId: string | number): boolean {
  return expandedGroups.value.has(rowId)
}

// Clear expanded groups when sidebar closes
watch(showReviewSidebar, (isOpen) => {
  if (!isOpen) {
    expandedGroups.value = new Set()
  }
})

// ============================================================================
// Column Definitions
// ============================================================================

// Column definitions
// Note: The 'field' property is used for displaying data from API response (camelCase)
// The 'sortField' property (if different) would be used for sorting with the API (snake_case)
// Currently, the NeuDataTable sends the field value directly to the API for sorting
// The API expects snake_case sort fields (e.g., 'personal_last_name' not 'lastName')
const columns: TableColumn[] = [
  {
    id: 'status',
    label: 'Status',
    field: 'status',
    type: 'badge',
    width: '120px',
    sortable: true,
    filterable: true,
    options: [
      { label: 'Active', value: 'active', color: 'green' },
      { label: 'Invited', value: 'invited', color: 'blue' },
      { label: 'Inactive', value: 'inactive', color: 'gray' }
    ]
  },
  {
    id: 'firstName',
    label: 'First Name',
    field: 'firstName',
    type: 'text',
    width: '140px',
    sortable: true,
    filterable: true,
    editable: true,
    required: true
  },
  {
    id: 'lastName',
    label: 'Last Name',
    field: 'lastName',
    type: 'text',
    width: '140px',
    sortable: true,
    filterable: true,
    editable: true,
    required: true
  },
  {
    id: 'email',
    label: 'Email',
    field: 'email',
    type: 'email',
    width: '220px',
    sortable: true,
    filterable: true
  },
  {
    id: 'phone',
    label: 'Phone',
    field: 'phone',
    type: 'phone',
    width: '140px',
    sortable: false,
    filterable: true
  },
  {
    id: 'companyEmail',
    label: 'Work Email',
    field: 'companyEmail',
    type: 'email',
    width: '220px',
    sortable: false, // API doesn't support sorting on company_email
    filterable: false
  },
  {
    id: 'title',
    label: 'Title',
    field: 'title',
    type: 'text',
    width: '160px',
    sortable: true,
    filterable: true,
    editable: true,
    placeholder: 'Job title'
  },
  {
    id: 'department',
    label: 'Department',
    field: 'department',
    type: 'text',
    width: '140px',
    sortable: true,
    filterable: true,
    editable: true
  },
  {
    id: 'division',
    label: 'Division',
    field: 'division',
    type: 'text',
    width: '140px',
    sortable: true,
    filterable: true,
    editable: true
  },
  {
    id: 'location',
    label: 'Location',
    field: 'location',
    type: 'text',
    width: '140px',
    sortable: true,
    filterable: true,
    editable: true
  },
  {
    id: 'employeeId',
    label: 'Employee ID',
    field: 'employeeId',
    type: 'text',
    width: '120px',
    sortable: false, // API doesn't support sorting on employee_id
    filterable: false
  },
  {
    id: 'startDate',
    label: 'Start Date',
    field: 'startDate',
    type: 'date',
    width: '120px',
    sortable: true,
    filterable: false
  }
]

// Table configuration
// Note: The API expects snake_case field names for sorting (e.g., 'personal_last_name')
// See SORTABLE_COLUMNS in server/api/tenant/[slug]/users/index.get.ts for allowed sort fields
const tableConfig = {
  pagination: {
    enabled: true,
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    showPageSizeSelector: true,
    showTotal: true
  },
  sorting: {
    enabled: true,
    defaultSort: { field: 'personal_last_name', direction: 'asc' as const }
  },
  filtering: {
    enabled: true,
    showFilterRow: true,
    debounceMs: 300
  },
  selection: {
    enabled: true,
    mode: 'multiple' as const,
    showCheckbox: true,
    selectAll: true
  },
  editing: {
    enabled: true,
    mode: 'cell' as const
  },
  emptyMessage: 'No employees found. Add team members to get started.',
  rowKey: 'id'
}

// ============================================================================
// Notification Helpers
// ============================================================================

function showNotification(
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string
) {
  notification.value = { show: true, type, title, message }
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

function hideNotification() {
  notification.value = null
}

// ============================================================================
// Toolbar Actions
// ============================================================================

function handleSearch(query: string) {
  // Search is handled by the table's filter row
  // This could trigger a global search if needed
}

function handleExport() {
  // TODO: Implement CSV export
  showNotification('info', 'Export', 'Export functionality coming soon.')
}

function handleImport() {
  // TODO: Implement CSV import
  showNotification('info', 'Import', 'Import functionality coming soon.')
}

function handleReviewChanges() {
  showReviewSidebar.value = true
}

// ============================================================================
// Column Preferences
// ============================================================================

function handleVisibleColumnsChange(newVisible: string[]) {
  if (columnPreferences.value) {
    columnPreferences.value.setVisible(newVisible)
  }
}

function handleColumnOrderChange(newOrder: string[]) {
  if (columnPreferences.value) {
    columnPreferences.value.setOrder(newOrder)
  }
}

// ============================================================================
// Save Handler
// ============================================================================

async function handleSave(payload: BulkPayload) {
  if (!session.value?.tenantSlug) {
    showNotification('error', 'Error', 'Session not found. Please sign in again.')
    return
  }

  // Show pending toast
  showNotification('info', 'Saving...', `Saving ${payload.edits.length} edit(s) and ${payload.deletes.length} deletion(s)...`)
  isSaving.value = true

  try {
    const response = await $fetch<BulkResponse>(`/api/tenant/${session.value.tenantSlug}/users/bulk`, {
      method: 'POST',
      body: payload
    })

    if (response.success) {
      showNotification(
        'success',
        'Changes Saved',
        `Successfully applied ${response.applied.edits} edit(s) and ${response.applied.deletes} deletion(s).`
      )
      // Clear pending changes
      tableRef.value?.clearPendingChanges()
      // Refresh table data
      await tableRef.value?.refresh()
      // Close review sidebar
      showReviewSidebar.value = false
    } else {
      const failedCount = response.errors?.length || 0
      showNotification(
        'warning',
        'Partial Success',
        `Applied ${response.applied.edits} edit(s) and ${response.applied.deletes} deletion(s). ${failedCount} operation(s) failed.`
      )
    }
  } catch (error) {
    console.error('Failed to save changes:', error)
    showNotification(
      'error',
      'Save Failed',
      'An error occurred while saving changes. Please try again.'
    )
  } finally {
    isSaving.value = false
  }
}

// Discard handlers for toast
function handleDiscardAll() {
  pendingChanges.clearAll()
}

function handleDiscardEdit(rowId: string | number, field: string) {
  pendingChanges.revertEdit(rowId, field)
}

function handleDiscardDelete(rowId: string | number) {
  pendingChanges.revertDelete(rowId)
}

function handleSaveFromToast() {
  const payload = pendingChanges.getChangesPayload()
  handleSave(payload)
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  const slug = tenantSlug.value
  if (!slug) {
    navigateTo('/find-domain')
    return
  }

  // Initialize column preferences composable immediately with defaults
  // This allows the table to render with all columns while preferences load
  const defaultColumns = {
    visible: columns.map(col => col.id),
    order: columns.map(col => col.id)
  }

  columnPreferences.value = useColumnPreferences(
    'directoryColumns',
    defaultColumns,
    {
      tenantSlug: slug,
      userId: authUser.value?.id || undefined,
      debounceMs: 300
    }
  )

  // Load column labels in the background (non-blocking)
  loadColumnLabels()

  // If auth isn't initialized yet, wait for it then update preferences with userId
  if (!authInitialized.value) {
    initAuth()
  }
})

// Watch for auth state changes and update composable if userId becomes available
watch(
  () => authUser.value?.id,
  (newUserId) => {
    if (newUserId && columnPreferences.value) {
      columnPreferences.value.updateConfig({ userId: newUserId })
    }
  }
)
</script>

<template>
  <!-- Page Header -->
  <div class="mb-6">
    <h1 class="text-2xl sm:text-3xl font-bold text-[var(--neu-text)] mb-2">
      Employee Directory
    </h1>
    <p class="text-[var(--neu-text-muted)]">
      Manage and view all employees in your organization.
    </p>
  </div>

  <!-- Data Table -->
  <NeuContainer max-width="full" :padded="false">
    <NeuCard v-if="fetchUrl" padding="md" class="neu-table-card">
      <NeuDataTable
        ref="tableRef"
        :columns="displayedColumns"
        :fetch-url="fetchUrl"
        :config="tableConfig"
        @save="handleSave"
      >
      <!-- Toolbar Slot -->
      <template #toolbar="{ selectedCount, totalCount, hasChanges, changesCount, refresh, triggerSave, toggleFilters, showFilters, hasActiveFilters, clearFilters }">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Left side: Search -->
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <NeuSearch
              placeholder="Search..."
              class="w-full sm:w-64"
              @search="handleSearch"
            />
          </div>

          <!-- Right side: Actions -->
          <div class="flex items-center gap-1">
            <!-- Selected count badge -->
            <span v-if="selectedCount > 0" class="text-xs text-[var(--neu-text-muted)] mr-2 hidden sm:inline">
              {{ selectedCount }} selected
            </span>

            <!-- Filter toggle button -->
            <NeuButton
              variant="ghost"
              size="sm"
              :class="{ '!text-[var(--neu-primary)]': showFilters || hasActiveFilters }"
              title="Toggle filters"
              @click="toggleFilters"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span v-if="hasActiveFilters" class="w-1.5 h-1.5 bg-[var(--neu-primary)] rounded-full absolute top-1 right-1" />
            </NeuButton>

            <!-- Column Manager -->
            <NeuColumnManager
              :columns="columnsWithLabels"
              :visible-columns="visibleColumnIds"
              :column-order="columnOrder"
              :settings-url="columnSettingsUrl"
              @update:visible-columns="handleVisibleColumnsChange"
              @update:column-order="handleColumnOrderChange"
            />

            <!-- Export button -->
            <NeuButton
              variant="ghost"
              size="sm"
              title="Export to CSV"
              @click="handleExport"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </NeuButton>

            <!-- Import button -->
            <NeuButton
              variant="ghost"
              size="sm"
              title="Import from CSV"
              @click="handleImport"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </NeuButton>

            <!-- Refresh button -->
            <NeuButton
              variant="ghost"
              size="sm"
              title="Refresh data"
              @click="refresh"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </NeuButton>
          </div>
        </div>
      </template>
      </NeuDataTable>
    </NeuCard>
  </NeuContainer>

  <!-- Review Changes Sidebar -->
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showReviewSidebar"
      class="fixed inset-0 z-50 flex justify-end"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/30 backdrop-blur-sm"
        @click="showReviewSidebar = false"
      />

      <!-- Sidebar Panel -->
      <Transition
        enter-active-class="transition-transform duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="showReviewSidebar"
          class="relative w-full max-w-md bg-[var(--neu-bg)] shadow-xl overflow-hidden flex flex-col"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-[var(--neu-shadow-dark)]/10">
            <h2 class="text-lg font-semibold text-[var(--neu-text)]">Review Changes</h2>
            <NeuButton
              variant="ghost"
              size="sm"
              rounded
              @click="showReviewSidebar = false"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </NeuButton>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-4 neu-review-scrollbar">
            <!-- Summary bar -->
            <NeuCard v-if="groupedChanges.length > 0" variant="pressed" padding="sm" class="mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-[var(--neu-primary)]/10 flex items-center justify-center">
                  <svg class="w-5 h-5 text-[var(--neu-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div class="text-sm font-medium text-[var(--neu-text)]">{{ groupedChanges.length }} {{ groupedChanges.length === 1 ? 'person' : 'people' }} affected</div>
                  <div class="text-xs text-[var(--neu-text-muted)]">{{ pendingChanges.totalChanges.value }} total changes</div>
                </div>
              </div>
            </NeuCard>

            <div v-if="tableRef" class="space-y-3">
              <!-- Group changes by row name - Collapsible -->
              <template v-for="group in groupedChanges" :key="group.rowId">
                <NeuCard variant="flat" padding="none" class="overflow-hidden">
                  <!-- Collapsible Header -->
                  <button
                    class="w-full flex items-center gap-3 p-3 hover:bg-[var(--neu-bg-secondary)]/50 transition-colors"
                    @click="toggleGroupExpanded(group.rowId)"
                  >
                    <!-- Avatar -->
                    <NeuAvatar
                      :src="group.rowAvatarUrl"
                      :initials="group.rowName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)"
                      :alt="group.rowName"
                      size="md"
                    />

                    <!-- Name & count -->
                    <div class="flex-1 min-w-0 text-left">
                      <div class="font-medium text-[var(--neu-text)] truncate">{{ group.rowName }}</div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <NeuBadge v-if="group.edits.length > 0" size="sm" variant="primary" pill>
                          {{ group.edits.length }} edit{{ group.edits.length !== 1 ? 's' : '' }}
                        </NeuBadge>
                        <NeuBadge v-if="group.isDeleted" size="sm" variant="danger" pill>
                          deletion
                        </NeuBadge>
                      </div>
                    </div>

                    <!-- Chevron -->
                    <svg
                      class="w-5 h-5 text-[var(--neu-text-muted)] transition-transform duration-200"
                      :class="{ 'rotate-180': isGroupExpanded(group.rowId) }"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <!-- Collapsible Content -->
                  <Transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[500px]"
                    leave-active-class="transition-all duration-150 ease-in"
                    leave-from-class="opacity-100 max-h-[500px]"
                    leave-to-class="opacity-0 max-h-0"
                  >
                    <div v-if="isGroupExpanded(group.rowId)" class="border-t border-[var(--neu-shadow-dark)]/10 overflow-hidden">
                      <!-- Edits -->
                      <div
                        v-for="edit in group.edits"
                        :key="`${edit.rowId}-${edit.field}`"
                        class="flex items-center gap-3 px-4 py-3 border-b border-[var(--neu-shadow-dark)]/5 last:border-b-0 hover:bg-[var(--neu-bg-secondary)]/30"
                      >
                        <div class="flex-1 min-w-0">
                          <NeuBadge size="sm" class="mb-1.5">{{ getColumnLabel(edit.field) }}</NeuBadge>
                          <div class="flex items-center gap-2 text-sm">
                            <span class="text-red-500 line-through truncate max-w-[100px]" :title="String(edit.oldValue || '(empty)')">
                              {{ edit.oldValue || '(empty)' }}
                            </span>
                            <svg class="w-4 h-4 flex-shrink-0 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span class="text-green-500 font-medium truncate max-w-[100px]" :title="String(edit.newValue || '(empty)')">
                              {{ edit.newValue || '(empty)' }}
                            </span>
                          </div>
                        </div>
                        <NeuButton
                          variant="ghost"
                          size="sm"
                          rounded
                          title="Undo this change"
                          @click.stop="handleDiscardEdit(edit.rowId, edit.field)"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </NeuButton>
                      </div>

                      <!-- Delete marker -->
                      <div
                        v-if="group.isDeleted"
                        class="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/10"
                      >
                        <div class="flex items-center gap-2 flex-1">
                          <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span class="text-sm font-medium text-red-600 dark:text-red-400">
                            Will be deleted
                          </span>
                        </div>
                        <NeuButton
                          variant="ghost"
                          size="sm"
                          rounded
                          title="Cancel deletion"
                          @click.stop="handleDiscardDelete(group.rowId)"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </NeuButton>
                      </div>
                    </div>
                  </Transition>
                </NeuCard>
              </template>

              <!-- Empty state -->
              <div
                v-if="groupedChanges.length === 0"
                class="text-center py-12"
              >
                <NeuAvatar
                  initials="OK"
                  size="xl"
                  class="mx-auto mb-4"
                />
                <p class="text-[var(--neu-text)] font-medium mb-1">All caught up!</p>
                <p class="text-sm text-[var(--neu-text-muted)]">No pending changes to review</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 p-4 border-t border-[var(--neu-shadow-dark)]/10">
            <NeuButton
              variant="ghost"
              @click="tableRef?.clearPendingChanges(); showReviewSidebar = false"
            >
              Discard All
            </NeuButton>
            <NeuButton
              variant="primary"
              :loading="isSaving"
              @click="tableRef?.triggerSave()"
            >
              Save Changes
            </NeuButton>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- Notification Toast -->
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="notification"
      class="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <div
        :class="[
          'p-4 rounded-xl shadow-lg flex items-start gap-3',
          {
            'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800': notification.type === 'success',
            'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800': notification.type === 'error',
            'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800': notification.type === 'warning',
            'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800': notification.type === 'info'
          }
        ]"
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <svg
            v-if="notification.type === 'success'"
            class="w-5 h-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else-if="notification.type === 'error'"
            class="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else-if="notification.type === 'warning'"
            class="w-5 h-5 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p
            :class="[
              'text-sm font-medium',
              {
                'text-green-800 dark:text-green-200': notification.type === 'success',
                'text-red-800 dark:text-red-200': notification.type === 'error',
                'text-amber-800 dark:text-amber-200': notification.type === 'warning',
                'text-blue-800 dark:text-blue-200': notification.type === 'info'
              }
            ]"
          >
            {{ notification.title }}
          </p>
          <p
            :class="[
              'text-sm mt-0.5',
              {
                'text-green-600 dark:text-green-300': notification.type === 'success',
                'text-red-600 dark:text-red-300': notification.type === 'error',
                'text-amber-600 dark:text-amber-300': notification.type === 'warning',
                'text-blue-600 dark:text-blue-300': notification.type === 'info'
              }
            ]"
          >
            {{ notification.message }}
          </p>
        </div>

        <!-- Close button -->
        <button
          class="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          @click="hideNotification"
        >
          <svg class="w-4 h-4 text-current opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>

  <!-- Pending Changes Toast -->
  <NeuPendingToast
    :changes-count="pendingChanges.totalChanges.value"
    :saving="isSaving"
    @save="handleSaveFromToast"
    @discard-all="handleDiscardAll"
    @review="showReviewSidebar = true"
  />
</template>

<style scoped>
/* Table card wrapper - allow internal scrolling */
.neu-table-card {
  overflow: visible;
}

.neu-table-card :deep(.neu-table-wrapper) {
  box-shadow: none;
  border: 2px solid color-mix(in srgb, var(--neu-shadow-dark) 15%, transparent);
  border-radius: 0.75rem;
}

/* Enhance table border visibility on hover */
.neu-table-card :deep(.neu-table-wrapper:hover) {
  border-color: color-mix(in srgb, var(--neu-primary) 30%, color-mix(in srgb, var(--neu-shadow-dark) 15%, transparent));
}

/* Review sidebar scrollbar */
.neu-review-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--neu-text-muted) transparent;
}

.neu-review-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.neu-review-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.neu-review-scrollbar::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--neu-text-muted) 50%, transparent);
  border-radius: 3px;
}

.neu-review-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--neu-text-muted);
}
</style>
