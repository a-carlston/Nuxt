<script setup lang="ts">
import type { TableColumn, TableRow, PendingEdit, PendingDelete } from '~/types/table'

interface Props {
  /** Array of row data to render */
  rows: TableRow[]
  /** Column definitions for the table */
  columns: TableColumn[]
  /** Set of selected row IDs */
  selectedIds?: Set<string | number>
  /** Map of pending edits (rowId -> PendingEdit[]) */
  pendingEdits?: Map<string | number, PendingEdit[]>
  /** Map of pending deletes (rowId -> PendingDelete) */
  pendingDeletes?: Map<string | number, PendingDelete>
  /** Whether the table is in a loading state */
  loading?: boolean
  /** Message to show when there are no rows */
  emptyMessage?: string
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number
  /** Whether selection is enabled */
  selectable?: boolean
  /** Unique key field for rows (default: 'id') */
  rowKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedIds: () => new Set(),
  pendingEdits: () => new Map(),
  pendingDeletes: () => new Map(),
  loading: false,
  emptyMessage: 'No data available',
  skeletonRows: 5,
  selectable: false,
  rowKey: 'id'
})

const emit = defineEmits<{
  /** Emitted when a row is selected/deselected */
  'row-select': [rowId: string | number, selected: boolean]
  /** Emitted when a cell value changes */
  'cell-change': [rowId: string | number, field: string, oldValue: unknown, newValue: unknown]
  /** Emitted when a row enters edit mode or is edited */
  'row-edit': [rowId: string | number]
}>()

/**
 * Get the unique key for a row
 */
function getRowKey(row: TableRow): string | number {
  return row[props.rowKey] as string | number
}

/**
 * Check if a row is selected
 */
function isRowSelected(row: TableRow): boolean {
  return props.selectedIds.has(getRowKey(row))
}

/**
 * Check if a row has pending edits
 */
function hasRowPendingEdits(row: TableRow): boolean {
  return props.pendingEdits.has(getRowKey(row))
}

/**
 * Check if a row is pending deletion
 */
function isRowPendingDelete(row: TableRow): boolean {
  return props.pendingDeletes.has(getRowKey(row))
}

/**
 * Get pending edits for a specific row
 */
function getRowPendingEdits(row: TableRow): PendingEdit[] {
  return props.pendingEdits.get(getRowKey(row)) || []
}

/**
 * Get value for a cell, considering pending edits
 */
function getCellValue(row: TableRow, column: TableColumn): unknown {
  const pendingEdits = getRowPendingEdits(row)
  const fieldEdit = pendingEdits.find(edit => edit.field === column.field)

  if (fieldEdit) {
    return fieldEdit.newValue
  }

  // Support dot notation for nested fields (e.g., 'user.name')
  const field = column.field
  if (field.includes('.')) {
    const parts = field.split('.')
    let value: unknown = row
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }
    return value
  }

  return row[field]
}

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown, column: TableColumn, row: TableRow): string {
  if (value === null || value === undefined) {
    return column.placeholder || '-'
  }

  // Use custom format function if provided
  if (typeof column.format === 'function') {
    return column.format(value, row)
  }

  // Handle different column types
  switch (column.type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Number(value))

    case 'date':
      return new Date(value as string).toLocaleDateString()

    case 'datetime':
      return new Date(value as string).toLocaleString()

    case 'boolean':
      return value ? 'Yes' : 'No'

    case 'number':
      return new Intl.NumberFormat().format(Number(value))

    case 'select':
      const option = column.options?.find(opt => opt.value === value)
      return option?.label || String(value)

    default:
      return String(value)
  }
}

/**
 * Check if a specific cell has pending edit
 */
function hasCellPendingEdit(row: TableRow, column: TableColumn): boolean {
  const pendingEdits = getRowPendingEdits(row)
  return pendingEdits.some(edit => edit.field === column.field)
}

/**
 * Handle row selection toggle
 */
function handleRowSelect(row: TableRow) {
  const rowId = getRowKey(row)
  const isSelected = isRowSelected(row)
  emit('row-select', rowId, !isSelected)
}

/**
 * Handle row click for edit
 */
function handleRowEdit(row: TableRow) {
  emit('row-edit', getRowKey(row))
}

/**
 * Get visible columns only
 */
const visibleColumns = computed(() => {
  return props.columns.filter(col => col.visible !== false)
})

/**
 * Get column width style
 */
function getColumnStyle(column: TableColumn): Record<string, string> {
  const style: Record<string, string> = {}

  if (column.width) {
    style.width = column.width
    style.minWidth = column.width
  }
  if (column.minWidth) {
    style.minWidth = column.minWidth
  }
  if (column.maxWidth) {
    style.maxWidth = column.maxWidth
  }

  return style
}
</script>

<template>
  <div class="neu-table-body overflow-auto neu-scrollbar">
    <!-- Loading State: Skeleton Rows -->
    <div v-if="loading" class="divide-y divide-[var(--neu-shadow-dark)]/10">
      <div
        v-for="i in skeletonRows"
        :key="`skeleton-${i}`"
        class="flex items-center gap-3 px-4 py-3"
      >
        <!-- Checkbox skeleton -->
        <div
          v-if="selectable"
          class="w-5 h-5 rounded skeleton-shimmer flex-shrink-0"
        />

        <!-- Cell skeletons -->
        <div
          v-for="(column, colIndex) in visibleColumns"
          :key="`skeleton-${i}-${colIndex}`"
          class="flex-1"
          :style="getColumnStyle(column)"
        >
          <div
            :class="[
              'h-4 rounded skeleton-shimmer',
              column.type === 'avatar' ? 'w-8 h-8 rounded-full' : '',
              column.type === 'badge' ? 'w-16' : '',
              column.type === 'actions' ? 'w-20' : 'w-full max-w-[200px]'
            ]"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="rows.length === 0"
      class="flex flex-col items-center justify-center py-12 px-4"
    >
      <div class="w-16 h-16 mb-4 rounded-full bg-[var(--neu-bg-secondary)] flex items-center justify-center">
        <svg
          class="w-8 h-8 text-[var(--neu-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <p class="text-[var(--neu-text-muted)] text-sm text-center">
        {{ emptyMessage }}
      </p>
    </div>

    <!-- Data Rows -->
    <div v-else class="neu-table-rows">
      <div
        v-for="(row, index) in rows"
        :key="getRowKey(row)"
        :class="[
          'neu-table-row group',
          {
            'is-selected': isRowSelected(row),
            'is-pending-edit': hasRowPendingEdits(row) && !isRowPendingDelete(row),
            'is-pending-delete': isRowPendingDelete(row),
            'is-even': index % 2 === 1
          }
        ]"
        @click="handleRowEdit(row)"
      >
        <!-- Selection Checkbox -->
        <div
          v-if="selectable"
          class="flex-shrink-0"
          @click.stop
        >
          <button
            type="button"
            :class="[
              'w-5 h-5 rounded flex items-center justify-center transition-all duration-200',
              isRowSelected(row)
                ? 'bg-[var(--neu-primary)] text-white'
                : 'bg-[var(--neu-bg)] shadow-neu-small hover:shadow-neu-small-pressed'
            ]"
            @click="handleRowSelect(row)"
          >
            <svg
              v-if="isRowSelected(row)"
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>

        <!-- Cell Values -->
        <template v-for="column in visibleColumns" :key="column.id">
          <!-- Avatar Cell -->
          <div
            v-if="column.type === 'avatar'"
            class="flex-shrink-0"
            :style="getColumnStyle(column)"
          >
            <div class="w-8 h-8 rounded-full bg-[var(--neu-primary)] flex items-center justify-center text-white text-xs font-medium">
              {{ String(getCellValue(row, column) || '?').charAt(0).toUpperCase() }}
            </div>
          </div>

          <!-- Badge Cell -->
          <div
            v-else-if="column.type === 'badge'"
            class="flex-1 min-w-0"
            :style="getColumnStyle(column)"
          >
            <span
              :class="[
                'neu-badge',
                hasCellPendingEdit(row, column) ? 'ring-2 ring-amber-400' : ''
              ]"
              :data-color="column.options?.find(o => o.value === getCellValue(row, column))?.color || 'gray'"
            >
              <span class="neu-badge-dot" />
              {{ formatCellValue(getCellValue(row, column), column, row) }}
            </span>
          </div>

          <!-- Boolean Cell -->
          <div
            v-else-if="column.type === 'boolean'"
            class="flex-1 min-w-0"
            :style="getColumnStyle(column)"
          >
            <span
              :class="[
                'inline-flex items-center gap-1',
                hasCellPendingEdit(row, column) ? 'ring-2 ring-amber-400 rounded px-1' : ''
              ]"
            >
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  getCellValue(row, column) ? 'bg-[var(--neu-success)]' : 'bg-[var(--neu-text-muted)]'
                ]"
              />
              <span class="text-sm text-[var(--neu-text)]">
                {{ formatCellValue(getCellValue(row, column), column, row) }}
              </span>
            </span>
          </div>

          <!-- Actions Cell -->
          <div
            v-else-if="column.type === 'actions'"
            class="flex-shrink-0 flex items-center gap-1"
            :style="getColumnStyle(column)"
            @click.stop
          >
            <slot name="actions" :row="row" :column="column">
              <!-- Default action buttons can be added here -->
            </slot>
          </div>

          <!-- Default Text Cell -->
          <div
            v-else
            :class="[
              'flex-1 min-w-0 text-sm',
              column.className
            ]"
            :style="getColumnStyle(column)"
          >
            <span
              :class="[
                'block truncate',
                hasCellPendingEdit(row, column)
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-[var(--neu-text)]'
              ]"
              :title="String(getCellValue(row, column) || '')"
            >
              {{ formatCellValue(getCellValue(row, column), column, row) }}
            </span>
          </div>
        </template>

        <!-- Pending Status Indicators -->
        <div class="flex-shrink-0 flex items-center gap-2">
          <!-- Pending Edit Indicator -->
          <span
            v-if="hasRowPendingEdits(row) && !isRowPendingDelete(row)"
            class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            title="Has unsaved changes"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </span>

          <!-- Pending Delete Indicator -->
          <span
            v-if="isRowPendingDelete(row)"
            class="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
            title="Pending deletion"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.neu-table-body {
  max-height: 100%;
  background: var(--neu-bg);
}

.neu-table-rows {
  display: flex;
  flex-direction: column;
}

.neu-table-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  min-height: 56px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 8%, transparent);
  background: var(--neu-bg);
}

.neu-table-row:last-child {
  border-bottom: none;
}

.neu-table-row.is-even {
  background: color-mix(in srgb, var(--neu-bg-secondary) 40%, var(--neu-bg) 60%);
}

.neu-table-row:hover {
  background: color-mix(in srgb, var(--neu-primary) 8%, var(--neu-bg) 92%);
  border-left-color: var(--neu-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--neu-primary) 15%, transparent);
}

.neu-table-row.is-selected {
  background: color-mix(in srgb, var(--neu-primary) 12%, var(--neu-bg) 88%);
  border-left-color: var(--neu-primary);
  box-shadow: inset 4px 0 0 0 var(--neu-primary);
}

.neu-table-row.is-pending-edit {
  background: color-mix(in srgb, var(--neu-warning) 10%, var(--neu-bg) 90%);
  border-left-color: var(--neu-warning);
  box-shadow: inset 4px 0 0 0 var(--neu-warning);
}

.neu-table-row.is-pending-delete {
  background: color-mix(in srgb, var(--neu-danger) 8%, var(--neu-bg) 92%);
  border-left-color: var(--neu-danger);
  box-shadow: inset 4px 0 0 0 var(--neu-danger);
  opacity: 0.7;
}

.neu-table-row.is-pending-delete * {
  text-decoration: line-through;
  text-decoration-color: var(--neu-danger);
}

/* Custom shadow utilities for checkbox */
.shadow-neu-small {
  box-shadow:
    2px 2px 4px var(--neu-shadow-dark),
    -2px -2px 4px var(--neu-shadow-light);
}

.hover\:shadow-neu-small-pressed:hover {
  box-shadow:
    inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light);
}

/* Badge styling */
.neu-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  text-transform: capitalize;
  background: var(--neu-bg-secondary);
  color: var(--neu-text);
  box-shadow:
    inset 1px 1px 2px var(--neu-shadow-dark),
    inset -1px -1px 2px var(--neu-shadow-light);
}

.neu-badge-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: currentColor;
  box-shadow: 0 0 4px currentColor;
}

.neu-badge[data-color="green"] {
  background: color-mix(in srgb, #22c55e 15%, var(--neu-bg) 85%);
  color: #16a34a;
}

.neu-badge[data-color="blue"] {
  background: color-mix(in srgb, #3b82f6 15%, var(--neu-bg) 85%);
  color: #2563eb;
}

.neu-badge[data-color="gray"] {
  background: color-mix(in srgb, #6b7280 15%, var(--neu-bg) 85%);
  color: #4b5563;
}

.neu-badge[data-color="red"] {
  background: color-mix(in srgb, #ef4444 15%, var(--neu-bg) 85%);
  color: #dc2626;
}

.neu-badge[data-color="amber"],
.neu-badge[data-color="yellow"] {
  background: color-mix(in srgb, #f59e0b 15%, var(--neu-bg) 85%);
  color: #d97706;
}

/* Skeleton shimmer animation - uses the global skeleton-shimmer class from neumorphic.css */
</style>
