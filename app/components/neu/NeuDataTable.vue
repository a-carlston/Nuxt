<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { TableColumn, TableConfig, TableRow, SortDirection, PendingEdit, PendingDelete, BulkPayload } from '~/types/table'
import { useTableData, type SortOrder } from '~/composables/useTableData'
import { usePendingChanges } from '~/composables/usePendingChanges'

interface Props {
  columns: TableColumn[]
  fetchUrl: string
  config?: Partial<TableConfig>
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({})
})

const emit = defineEmits<{
  save: [payload: BulkPayload]
  'row-click': [row: TableRow]
  'selection-change': [selectedIds: (string | number)[], selectedRows: TableRow[]]
}>()

// Composables
const tableData = useTableData({
  fetchUrl: props.fetchUrl,
  defaultPageSize: props.config?.pagination?.defaultPageSize ?? 25,
  defaultSortBy: props.config?.sorting?.defaultSort?.field ?? undefined,
  defaultSortOrder: (props.config?.sorting?.defaultSort?.direction as SortOrder) ?? 'asc'
})

const pendingChanges = usePendingChanges()

// Filter state
const columnFilters = ref<Record<string, string>>({})
const showFilters = ref(false)

// Inline editing state
const editingCell = ref<{ rowId: string | number; field: string } | null>(null)
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// Computed
const visibleColumns = computed(() => props.columns.filter((col) => col.visible !== false))
const selectionEnabled = computed(() => props.config?.selection?.enabled ?? true)
const filteringEnabled = computed(() => props.config?.filtering?.enabled ?? true)

// Page size options for NeuSelect
const pageSizeOptions = computed(() => {
  const sizes = props.config?.pagination?.pageSizeOptions ?? [10, 25, 50, 100]
  return sizes.map(size => ({ label: String(size), value: size }))
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return Object.values(columnFilters.value).some(v => v && v.trim() !== '')
})

// Handlers
function handleSort(field: string) {
  const current = tableData.sortBy.value
  const currentOrder = tableData.sortOrder.value

  if (current === field) {
    if (currentOrder === 'asc') {
      tableData.sortOrder.value = 'desc'
    } else if (currentOrder === 'desc') {
      tableData.sortBy.value = null
      tableData.sortOrder.value = 'asc'
    }
  } else {
    tableData.sortBy.value = field
    tableData.sortOrder.value = 'asc'
  }
  tableData.refresh()
}

function handleSelectAll(checked: boolean) {
  if (checked) {
    tableData.selectAll()
  } else {
    tableData.clearSelection()
  }
}

function handleRowSelect(rowId: string | number) {
  tableData.toggleRowSelection(rowId)
}

function getRowKey(row: TableRow): string | number {
  const key = props.config?.rowKey ?? 'meta_id'
  return (row[key] ?? row.id ?? row.meta_id) as string | number
}

function getCellValue(row: TableRow, field: string): unknown {
  if (field.includes('.')) {
    return field.split('.').reduce((obj, key) => obj?.[key], row as Record<string, unknown>)
  }
  return row[field]
}

function formatValue(value: unknown, column: TableColumn): string {
  if (value === null || value === undefined || value === '') return '—'

  switch (column.type) {
    case 'date':
      return new Date(value as string).toLocaleDateString()
    case 'badge':
      const opt = column.options?.find(o => o.value === value)
      return opt?.label || String(value)
    default:
      return String(value)
  }
}

function getBadgeVariant(value: unknown, column: TableColumn): 'success' | 'primary' | 'warning' | 'danger' | 'default' {
  const opt = column.options?.find(o => o.value === value)
  const color = opt?.color || 'gray'
  const colorMap: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'default'> = {
    green: 'success',
    blue: 'primary',
    amber: 'warning',
    red: 'danger',
    gray: 'default'
  }
  return colorMap[color] || 'default'
}

// Filter handlers
function handleFilterChange(field: string, value: string) {
  columnFilters.value[field] = value
  // Use the composable's setFilter which handles debouncing and API calls
  tableData.setFilter(field, value)
}

function clearFilters() {
  columnFilters.value = {}
  tableData.clearFilters()
}

function toggleFilters() {
  showFilters.value = !showFilters.value
}

// Inline editing functions
function isEditable(column: TableColumn): boolean {
  return column.editable === true && props.config?.editing?.enabled !== false
}

function startEditing(row: TableRow, column: TableColumn) {
  if (!isEditable(column)) return

  const rowId = getRowKey(row)
  const field = column.field

  // Check if there's a pending edit - use that value instead of original
  const pendingValue = pendingChanges.getPendingValue(rowId, field)
  const currentValue = pendingValue !== undefined ? pendingValue : getCellValue(row, field)

  editingCell.value = { rowId, field }
  editValue.value = currentValue != null ? String(currentValue) : ''

  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function cancelEditing() {
  editingCell.value = null
  editValue.value = ''
}

function getRowDisplayName(row: TableRow): string {
  // Try to get a display name from common name fields
  const firstName = row.firstName || row.first_name || ''
  const lastName = row.lastName || row.last_name || ''
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim()
  }
  // Fallback to name or email
  const name = row.name || row.email || row.title || ''
  if (name) return String(name)
  // Last resort: use row ID
  return `Row ${getRowKey(row)}`
}

function getRowAvatarUrl(row: TableRow): string | undefined {
  // Try common avatar field names
  const avatar = row.avatarUrl || row.avatar_url || row.avatar || row.profileImage || row.profile_image
  return avatar ? String(avatar) : undefined
}

function saveEditing(row: TableRow, column: TableColumn) {
  if (!editingCell.value) return

  const rowId = getRowKey(row)
  const field = column.field
  const originalValue = getCellValue(row, field)
  const newValue = editValue.value
  const hasPendingEditForField = pendingChanges.hasFieldEdit(rowId, field)

  // If there's a pending edit, or if the value changed from original
  if (hasPendingEditForField || String(originalValue ?? '') !== newValue) {
    const rowName = getRowDisplayName(row)
    const rowAvatarUrl = getRowAvatarUrl(row)
    // The composable will handle removing the edit if newValue === originalValue
    pendingChanges.addEdit(
      rowId,
      field,
      originalValue != null ? String(originalValue) : '',
      newValue,
      'current-user', // TODO: Get actual userId from session
      undefined,
      rowName,
      rowAvatarUrl
    )
  }

  cancelEditing()
}

function handleEditKeydown(e: KeyboardEvent, row: TableRow, column: TableColumn) {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveEditing(row, column)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEditing()
  } else if (e.key === 'Tab') {
    // Save and move to next editable cell
    saveEditing(row, column)
  }
}

function isEditing(rowId: string | number, field: string): boolean {
  return editingCell.value?.rowId === rowId && editingCell.value?.field === field
}

function hasPendingEdit(rowId: string | number, field: string): boolean {
  return pendingChanges.hasFieldEdit(rowId, field)
}

function getPendingValue(rowId: string | number, field: string): string | undefined {
  const value = pendingChanges.getPendingValue(rowId, field)
  return value != null ? String(value) : undefined
}

// Expose methods
function refresh() { return tableData.refresh() }
function getSelectedRows(): TableRow[] { return tableData.selectedRows.value }
function getPendingChanges(): BulkPayload { return pendingChanges.getChangesPayload() }
function clearPendingChanges() { pendingChanges.clearAll() }
function triggerSave() { emit('save', pendingChanges.getChangesPayload()) }

defineExpose({ refresh, getSelectedRows, getPendingChanges, clearPendingChanges, triggerSave })

onMounted(() => { tableData.fetch() })
watch(() => props.fetchUrl, () => { if (props.fetchUrl) tableData.fetch() })
</script>

<template>
  <div class="neu-table-wrapper">
    <!-- Toolbar -->
    <div v-if="$slots.toolbar" class="neu-table-toolbar">
      <slot
        name="toolbar"
        :selected-count="tableData.selectedRowIds.value.size"
        :total-count="tableData.total.value"
        :has-changes="pendingChanges.hasChanges.value"
        :changes-count="pendingChanges.totalChanges.value"
        :refresh="refresh"
        :trigger-save="triggerSave"
        :clear-pending-changes="clearPendingChanges"
        :toggle-filters="toggleFilters"
        :show-filters="showFilters"
        :has-active-filters="hasActiveFilters"
        :clear-filters="clearFilters"
      />
    </div>

    <!-- Table Container - Scrollable on mobile -->
    <div class="neu-table-scroll">
      <table class="neu-table">
        <thead>
          <!-- Header Row -->
          <tr>
            <!-- Select All Checkbox -->
            <th v-if="selectionEnabled" class="neu-th neu-th-checkbox">
              <NeuCheckbox
                :model-value="tableData.isAllSelected.value"
                size="sm"
                @update:model-value="handleSelectAll"
              />
            </th>
            <!-- Column Headers -->
            <th
              v-for="col in visibleColumns"
              :key="col.id"
              class="neu-th"
              :class="{
                'is-sortable': col.sortable,
                'is-sorted': tableData.sortBy.value === col.field
              }"
              @click="col.sortable && handleSort(col.field)"
            >
              <div class="neu-th-content">
                <span class="neu-th-label">{{ col.label }}</span>
                <span v-if="col.sortable" class="neu-sort-icon">
                  <svg v-if="tableData.sortBy.value === col.field && tableData.sortOrder.value === 'asc'" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else-if="tableData.sortBy.value === col.field && tableData.sortOrder.value === 'desc'" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="w-4 h-4 opacity-30" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" stroke="currentColor" stroke-width="1.5" fill="none" />
                  </svg>
                </span>
              </div>
            </th>
          </tr>

          <!-- Filter Row -->
          <tr v-if="showFilters && filteringEnabled" class="neu-filter-row">
            <th v-if="selectionEnabled" class="neu-th-filter" />
            <th v-for="col in visibleColumns" :key="`filter-${col.id}`" class="neu-th-filter">
              <template v-if="col.filterable">
                <!-- Select filter for badge/option columns -->
                <NeuSelect
                  v-if="col.type === 'badge' && col.options"
                  :model-value="columnFilters[col.field] || null"
                  :options="[{ label: 'All', value: '' }, ...col.options.map(o => ({ label: o.label, value: o.value }))]"
                  placeholder="All"
                  size="sm"
                  @update:model-value="handleFilterChange(col.field, String($event || ''))"
                />
                <!-- Text input for other columns -->
                <input
                  v-else
                  type="text"
                  :value="columnFilters[col.field] || ''"
                  :placeholder="`Filter ${col.label}...`"
                  class="neu-filter-input"
                  @input="handleFilterChange(col.field, ($event.target as HTMLInputElement).value)"
                />
              </template>
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- Loading Skeleton -->
          <template v-if="tableData.loading.value">
            <tr v-for="i in 5" :key="`skel-${i}`" class="neu-tr">
              <td v-if="selectionEnabled" class="neu-td"><div class="skeleton w-5 h-5 rounded" /></td>
              <td v-for="col in visibleColumns" :key="`skel-${i}-${col.id}`" class="neu-td">
                <div class="skeleton h-4 rounded" :style="{ width: col.type === 'badge' ? '80px' : '70%' }" />
              </td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="tableData.data.value.length === 0">
            <td :colspan="visibleColumns.length + (selectionEnabled ? 1 : 0)" class="neu-td-empty">
              <div class="empty-state">
                <svg class="w-16 h-16 text-[var(--neu-text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-[var(--neu-text-muted)] text-lg">No data found</p>
                <p v-if="hasActiveFilters" class="text-[var(--neu-text-muted)] text-sm mt-1">
                  Try adjusting your filters
                </p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-else
            v-for="(row, idx) in tableData.data.value"
            :key="getRowKey(row)"
            class="neu-tr"
            :class="{
              'is-selected': tableData.selectedRowIds.value.has(getRowKey(row)),
              'is-even': idx % 2 === 1
            }"
            @click="emit('row-click', row)"
          >
            <!-- Checkbox -->
            <td v-if="selectionEnabled" class="neu-td neu-td-checkbox" @click.stop>
              <NeuCheckbox
                :model-value="tableData.selectedRowIds.value.has(getRowKey(row))"
                size="sm"
                @update:model-value="handleRowSelect(getRowKey(row))"
              />
            </td>
            <!-- Cells -->
            <td
              v-for="col in visibleColumns"
              :key="col.id"
              class="neu-td"
              :class="{
                'is-editable': isEditable(col),
                'is-editing': isEditing(getRowKey(row), col.field),
                'has-pending-edit': hasPendingEdit(getRowKey(row), col.field)
              }"
              :data-label="col.label"
              @dblclick="isEditable(col) && startEditing(row, col)"
            >
              <!-- Editing Mode -->
              <template v-if="isEditing(getRowKey(row), col.field)">
                <input
                  ref="editInputRef"
                  v-model="editValue"
                  type="text"
                  class="neu-edit-input"
                  @blur="saveEditing(row, col)"
                  @keydown="handleEditKeydown($event, row, col)"
                  @click.stop
                />
              </template>
              <!-- Display Mode -->
              <template v-else>
                <!-- Badge -->
                <NeuBadge v-if="col.type === 'badge'" :variant="getBadgeVariant(getCellValue(row, col.field), col)" size="sm">
                  {{ formatValue(getCellValue(row, col.field), col) }}
                </NeuBadge>
                <!-- Email -->
                <a v-else-if="col.type === 'email' && getCellValue(row, col.field)" :href="`mailto:${getCellValue(row, col.field)}`" class="neu-link" @click.stop>
                  {{ getCellValue(row, col.field) }}
                </a>
                <!-- Phone -->
                <a v-else-if="col.type === 'phone' && getCellValue(row, col.field)" :href="`tel:${getCellValue(row, col.field)}`" class="neu-link" @click.stop>
                  {{ getCellValue(row, col.field) }}
                </a>
                <!-- Default (show pending value if exists) -->
                <span v-else class="neu-cell-text" :class="{ 'has-change': hasPendingEdit(getRowKey(row), col.field) }">
                  {{ hasPendingEdit(getRowKey(row), col.field) ? getPendingValue(getRowKey(row), col.field) : formatValue(getCellValue(row, col.field), col) }}
                </span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer / Pagination -->
    <div class="neu-table-footer">
      <div class="neu-table-info">
        <span class="hidden sm:inline">Showing </span>
        {{ Math.min((tableData.page.value - 1) * tableData.pageSize.value + 1, tableData.total.value) }}-{{ Math.min(tableData.page.value * tableData.pageSize.value, tableData.total.value) }}
        <span class="hidden sm:inline"> of {{ tableData.total.value }}</span>
        <span class="sm:hidden"> / {{ tableData.total.value }}</span>
      </div>
      <div class="neu-table-pagination">
        <!-- Page size selector - hidden on mobile -->
        <div class="neu-page-size-select hidden sm:block">
          <NeuSelect
            :model-value="tableData.pageSize.value"
            :options="pageSizeOptions"
            size="sm"
            @update:model-value="tableData.setPageSize(Number($event))"
          />
        </div>
        <div class="flex items-center gap-1">
          <NeuButton variant="ghost" size="sm" :disabled="tableData.page.value <= 1" class="!px-2" @click="tableData.setPage(1)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </NeuButton>
          <NeuButton variant="ghost" size="sm" :disabled="tableData.page.value <= 1" class="!px-2" @click="tableData.setPage(tableData.page.value - 1)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NeuButton>
          <span class="px-2 sm:px-3 text-sm text-[var(--neu-text)] whitespace-nowrap">
            {{ tableData.page.value }} / {{ tableData.totalPages.value || 1 }}
          </span>
          <NeuButton variant="ghost" size="sm" :disabled="tableData.page.value >= tableData.totalPages.value" class="!px-2" @click="tableData.setPage(tableData.page.value + 1)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NeuButton>
          <NeuButton variant="ghost" size="sm" :disabled="tableData.page.value >= tableData.totalPages.value" class="!px-2" @click="tableData.setPage(tableData.totalPages.value)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </NeuButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.neu-table-wrapper {
  background: var(--neu-bg);
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 12%, transparent);
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--neu-shadow-dark) 8%, transparent),
    0 4px 12px color-mix(in srgb, var(--neu-shadow-dark) 4%, transparent);
  overflow: hidden;
  /* Prevent double scrollbars */
  max-width: 100%;
}

.neu-table-toolbar {
  padding: 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
  background: var(--neu-bg);
}

@media (min-width: 640px) {
  .neu-table-toolbar {
    padding: 1rem 1.5rem;
  }
}

.neu-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--neu-text-muted) transparent;
}

.neu-table-scroll::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.neu-table-scroll::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--neu-bg-secondary) 50%, transparent);
  border-radius: 4px;
}

.neu-table-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--neu-text-muted) 50%, transparent);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.neu-table-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--neu-text-muted);
}

.neu-table-scroll::-webkit-scrollbar-corner {
  background: transparent;
}

.neu-table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
}

/* Header */
.neu-th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--neu-text-muted);
  background: color-mix(in srgb, var(--neu-bg-secondary) 50%, var(--neu-bg) 50%);
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 12%, transparent);
  white-space: nowrap;
  user-select: none;
  position: sticky;
  top: 0;
  z-index: 10;
}

.neu-th-checkbox {
  width: 56px;
  text-align: center;
}

.neu-th.is-sortable {
  cursor: pointer;
  transition: all 0.15s ease;
}

.neu-th.is-sortable:hover {
  color: var(--neu-primary);
  background: color-mix(in srgb, var(--neu-primary) 8%, var(--neu-bg-secondary) 46%, var(--neu-bg) 46%);
}

.neu-th.is-sorted {
  color: var(--neu-primary);
  background: color-mix(in srgb, var(--neu-primary) 12%, var(--neu-bg-secondary) 44%, var(--neu-bg) 44%);
}

.neu-th-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.neu-th-label {
  flex: 1;
}

.neu-sort-icon {
  display: flex;
  flex-shrink: 0;
}

/* Filter Row */
.neu-filter-row {
  background: var(--neu-bg);
}

.neu-th-filter {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
  background: var(--neu-bg);
}

.neu-filter-input {
  width: 100%;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--neu-text);
  background: var(--neu-bg-secondary);
  border: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 15%, transparent);
  border-radius: 0.5rem;
  outline: none;
  transition: all 0.15s ease;
}

.neu-filter-input::placeholder {
  color: var(--neu-text-muted);
  opacity: 0.6;
}

.neu-filter-input:focus {
  border-color: var(--neu-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--neu-primary) 20%, transparent);
}

/* Rows */
.neu-tr {
  transition: background 0.15s ease;
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 6%, transparent);
}

.neu-tr:last-child {
  border-bottom: none;
}

.neu-tr.is-even {
  background: color-mix(in srgb, var(--neu-bg-secondary) 25%, var(--neu-bg) 75%);
}

.neu-tr:hover {
  background: color-mix(in srgb, var(--neu-primary) 6%, var(--neu-bg) 94%);
}

.neu-tr.is-selected {
  background: color-mix(in srgb, var(--neu-primary) 12%, var(--neu-bg) 88%);
}

/* Cells */
.neu-td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--neu-text);
  vertical-align: middle;
}

.neu-td-checkbox {
  width: 56px;
  text-align: center;
}

.neu-td-empty {
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.neu-cell-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Links */
.neu-link {
  color: var(--neu-primary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.neu-link:hover {
  text-decoration: underline;
}

/* Editable cells */
.neu-td.is-editable {
  cursor: pointer;
}

.neu-td.is-editable:hover:not(.is-editing) {
  background: color-mix(in srgb, var(--neu-primary) 5%, transparent);
}

.neu-td.has-pending-edit {
  background: color-mix(in srgb, var(--neu-warning) 10%, transparent);
}

.neu-td.is-editing {
  padding: 0.5rem 0.75rem;
}

.neu-edit-input {
  width: 100%;
  padding: 0.25rem 0.25rem;
  font-size: inherit;
  font-family: inherit;
  color: var(--neu-text);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--neu-primary);
  border-radius: 0;
  outline: none;
  line-height: inherit;
}

.neu-cell-text.has-change {
  color: var(--neu-warning);
  font-style: italic;
}

/* Footer */
.neu-table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-top: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
  background: color-mix(in srgb, var(--neu-bg-secondary) 30%, var(--neu-bg) 70%);
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .neu-table-footer {
    padding: 1rem 1.5rem;
  }
}

.neu-table-info {
  font-size: 0.8125rem;
  color: var(--neu-text-muted);
  white-space: nowrap;
}

.neu-table-pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.neu-page-size-select {
  width: 80px;
}

/* Skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--neu-bg-secondary) 25%,
    color-mix(in srgb, var(--neu-bg-secondary) 60%, var(--neu-shadow-light) 40%) 50%,
    var(--neu-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Mobile responsive - card view for very small screens */
@media (max-width: 480px) {
  .neu-table {
    min-width: 100%;
  }

  .neu-table thead {
    display: none;
  }

  .neu-table tbody tr {
    display: block;
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    background: var(--neu-bg);
    border: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
    border-radius: 0.75rem;
  }

  .neu-table tbody tr:last-child {
    margin-bottom: 0;
  }

  .neu-table tbody tr.is-selected {
    border-color: var(--neu-primary);
  }

  .neu-table tbody td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 6%, transparent);
  }

  .neu-table tbody td:last-child {
    border-bottom: none;
  }

  .neu-table tbody td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--neu-text-muted);
    margin-right: 1rem;
  }

  .neu-table tbody td.neu-td-checkbox {
    justify-content: flex-start;
    border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
    padding-bottom: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .neu-table tbody td.neu-td-checkbox::before {
    content: 'Select';
  }

  .neu-td-empty {
    display: block !important;
  }

  .neu-td-empty::before {
    display: none !important;
  }
}
</style>
