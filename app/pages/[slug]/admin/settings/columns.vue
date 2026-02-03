<script setup lang="ts">
/**
 * Admin Settings - Column Display Names
 *
 * Allows administrators to customize column header labels for tables
 * throughout the organization. Changes apply to all users.
 */

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// ============================================================================
// Types
// ============================================================================

interface ColumnDefinition {
  id: string
  label: string
  field?: string
}

interface TableOption {
  label: string
  value: string
  columns: ColumnDefinition[]
}

// ============================================================================
// Route and Tenant
// ============================================================================

const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

// ============================================================================
// State
// ============================================================================

const selectedTable = ref('directory')

// Local edits (not yet saved)
const localEdits = ref<Record<string, string>>({})

// Notification state
const notification = ref<{
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
} | null>(null)

// ============================================================================
// Column Definitions for Each Table
// ============================================================================

// Directory columns (from directory.vue)
const directoryColumns: ColumnDefinition[] = [
  { id: 'status', label: 'Status' },
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'companyEmail', label: 'Work Email' },
  { id: 'title', label: 'Title' },
  { id: 'department', label: 'Department' },
  { id: 'division', label: 'Division' },
  { id: 'location', label: 'Location' },
  { id: 'employeeId', label: 'Employee ID' },
  { id: 'startDate', label: 'Start Date' }
]

// Available tables for selection
const tableOptions: TableOption[] = [
  { label: 'Directory', value: 'directory', columns: directoryColumns }
]

// Get columns for currently selected table
const currentColumns = computed(() => {
  const table = tableOptions.find(t => t.value === selectedTable.value)
  return table?.columns || []
})

// ============================================================================
// Column Labels Composable
// ============================================================================

const {
  companyLabels,
  loading: labelsLoading,
  loadLabels,
  saveAllLabels,
  deleteLabel,
  hasOverride
} = useColumnLabels(selectedTable.value)

// ============================================================================
// Computed
// ============================================================================

// Check if there are unsaved changes
const hasUnsavedChanges = computed(() => {
  return Object.keys(localEdits.value).length > 0
})

// Get the current value to display in input
const getInputValue = (columnId: string): string => {
  // Local edit takes precedence
  if (columnId in localEdits.value) {
    return localEdits.value[columnId] ?? ''
  }
  // Then company label
  if (companyLabels.value[columnId]) {
    return companyLabels.value[columnId] ?? ''
  }
  return ''
}

// Check if a column has been modified locally
const isModified = (columnId: string): boolean => {
  return columnId in localEdits.value
}

// Check if a column has any custom label (saved or local)
const hasCustomValue = (columnId: string): boolean => {
  if (columnId in localEdits.value) {
    return !!localEdits.value[columnId]
  }
  return hasOverride(columnId)
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
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

function hideNotification() {
  notification.value = null
}

// ============================================================================
// Handlers
// ============================================================================

function handleInputChange(columnId: string, value: string) {
  const trimmedValue = value.trim()
  const savedValue = companyLabels.value[columnId] || ''

  if (trimmedValue === savedValue) {
    // Value matches saved value, remove from local edits
    const newEdits = { ...localEdits.value }
    delete newEdits[columnId]
    localEdits.value = newEdits
  } else {
    // Track as local edit
    localEdits.value = {
      ...localEdits.value,
      [columnId]: trimmedValue
    }
  }
}

async function handleReset(columnId: string) {
  // If there's a local edit, just remove it
  if (columnId in localEdits.value) {
    const newEdits = { ...localEdits.value }
    delete newEdits[columnId]
    localEdits.value = newEdits
    return
  }

  // If there's a saved override, delete it from the server
  if (hasOverride(columnId)) {
    try {
      await deleteLabel(columnId)
      showNotification('success', 'Reset', 'Column label has been reset to default.')
    } catch (err) {
      showNotification('error', 'Error', 'Failed to reset column label.')
    }
  }
}

async function handleSave() {
  if (!hasUnsavedChanges.value) return

  try {
    // Merge existing labels with local edits
    const mergedLabels: Record<string, string> = {
      ...companyLabels.value
    }

    // Apply local edits
    for (const [columnId, value] of Object.entries(localEdits.value)) {
      if (value) {
        mergedLabels[columnId] = value
      } else {
        delete mergedLabels[columnId]
      }
    }

    await saveAllLabels(mergedLabels)
    localEdits.value = {}
    showNotification('success', 'Saved', 'Column labels have been saved successfully.')
  } catch (err) {
    showNotification('error', 'Error', 'Failed to save column labels.')
  }
}

function handleDiscard() {
  localEdits.value = {}
}

async function handleTableChange(tableId: string | number | null | undefined) {
  if (!tableId || typeof tableId !== 'string') return

  // Warn about unsaved changes
  if (hasUnsavedChanges.value) {
    const confirmed = window.confirm('You have unsaved changes. Discard them?')
    if (!confirmed) return
  }

  selectedTable.value = tableId
  localEdits.value = {}

  // Reload labels for new table
  await loadLabels(true)
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  // Load column labels for default table
  await loadLabels()
})
</script>

<template>
  <!-- Page Header -->
  <div class="mb-8">
    <div class="flex items-center gap-2 text-sm text-[var(--neu-text-muted)] mb-2">
      <NuxtLink :to="`/${tenantSlug}/dashboard`" class="hover:text-[var(--neu-primary)] transition-colors">
        Admin
      </NuxtLink>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span>Settings</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span class="text-[var(--neu-text)]">Column Labels</span>
    </div>
    <h1 class="text-2xl sm:text-3xl font-bold text-[var(--neu-text)] mb-2">
      Column Display Names
    </h1>
    <p class="text-[var(--neu-text-muted)]">
      Customize how column headers appear for your organization. Changes apply to all users.
    </p>
  </div>

  <!-- Settings Card -->
  <NeuCard variant="flat" padding="none" class="overflow-hidden">
    <!-- Table Selector -->
    <div class="px-6 py-4 border-b border-[var(--neu-shadow-dark)]/10">
      <div class="flex items-center gap-4">
        <label for="table-select" class="text-sm font-medium text-[var(--neu-text)] whitespace-nowrap">
          Table:
        </label>
        <NeuSelect
          id="table-select"
          :model-value="selectedTable"
          :options="tableOptions"
          size="sm"
          class="w-48"
          @update:model-value="handleTableChange"
        />
      </div>
    </div>

    <!-- Column Labels Table -->
    <div class="overflow-x-auto">
      <table class="w-full" role="grid" aria-label="Column label settings">
        <thead>
          <tr class="border-b border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/50">
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wider w-36"
            >
              Column ID
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wider w-40"
            >
              Default Label
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wider"
            >
              Custom Label
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-right text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wider w-24"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--neu-shadow-dark)]/5">
          <tr
            v-for="column in currentColumns"
            :key="column.id"
            class="hover:bg-[var(--neu-bg-secondary)]/30 transition-colors"
            :class="{ 'bg-[var(--neu-primary)]/5': isModified(column.id) }"
          >
            <td class="px-6 py-4">
              <code class="text-xs font-mono text-[var(--neu-text-muted)] bg-[var(--neu-bg-secondary)] px-2 py-1 rounded">
                {{ column.id }}
              </code>
            </td>
            <td class="px-6 py-4">
              <span class="text-sm text-[var(--neu-text)]">
                {{ column.label }}
              </span>
            </td>
            <td class="px-6 py-4">
              <NeuInput
                :model-value="getInputValue(column.id)"
                :placeholder="column.label"
                size="sm"
                :aria-label="`Custom label for ${column.label}`"
                @update:model-value="(val) => handleInputChange(column.id, String(val))"
              />
            </td>
            <td class="px-6 py-4 text-right">
              <NeuButton
                v-if="hasCustomValue(column.id)"
                variant="ghost"
                size="sm"
                title="Reset to default"
                aria-label="Reset to default label"
                @click="handleReset(column.id)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </NeuButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer with Actions -->
    <div class="px-6 py-4 border-t border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/30">
      <div class="flex items-center justify-between">
        <div class="text-sm text-[var(--neu-text-muted)]">
          <span v-if="hasUnsavedChanges" class="flex items-center gap-2">
            <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse" aria-hidden="true" />
            You have unsaved changes
          </span>
          <span v-else>
            All changes saved
          </span>
        </div>
        <div class="flex items-center gap-3">
          <NeuButton
            v-if="hasUnsavedChanges"
            variant="ghost"
            @click="handleDiscard"
          >
            Discard
          </NeuButton>
          <NeuButton
            variant="primary"
            :disabled="!hasUnsavedChanges"
            :loading="labelsLoading"
            @click="handleSave"
          >
            Save Changes
          </NeuButton>
        </div>
      </div>
    </div>
  </NeuCard>

  <!-- Help Text -->
  <div class="mt-6 text-sm text-[var(--neu-text-muted)]">
    <p class="flex items-start gap-2">
      <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        Custom labels will be displayed to all users in your organization. Leave a field empty to use the default system label.
      </span>
    </p>
  </div>

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
      role="alert"
      aria-live="polite"
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
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else-if="notification.type === 'error'"
            class="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else-if="notification.type === 'warning'"
            class="w-5 h-5 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
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
          aria-label="Dismiss notification"
          @click="hideNotification"
        >
          <svg class="w-4 h-4 text-current opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
