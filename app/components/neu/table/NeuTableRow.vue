<script setup lang="ts">
import type { TableColumn, TableRow, PendingEdit } from '~/types/table'

interface Props {
  /** The row data object */
  row: TableRow
  /** Column definitions for rendering cells */
  columns: TableColumn[]
  /** Whether this row is currently selected */
  isSelected?: boolean
  /** Whether this row is marked for pending deletion */
  isPendingDelete?: boolean
  /** Pending edits for this row */
  pendingEdits?: PendingEdit[]
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isPendingDelete: false,
  pendingEdits: () => []
})

const emit = defineEmits<{
  /** Emitted when the row selection changes */
  select: [row: TableRow, selected: boolean]
  /** Emitted when a cell enters edit mode */
  'edit-cell': [row: TableRow, column: TableColumn]
  /** Emitted when a cell value changes */
  'cell-change': [row: TableRow, column: TableColumn, oldValue: unknown, newValue: unknown]
}>()

/**
 * Get the value of a field from the row, supporting dot notation
 */
function getFieldValue(field: string): unknown {
  const parts = field.split('.')
  let value: unknown = props.row
  for (const part of parts) {
    if (value === null || value === undefined) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

/**
 * Get the pending edit for a specific field if it exists
 */
function getPendingEditForField(field: string): PendingEdit | undefined {
  return props.pendingEdits.find(edit => edit.field === field)
}

/**
 * Check if a field has a pending edit
 */
function hasFieldEdit(field: string): boolean {
  return props.pendingEdits.some(edit => edit.field === field)
}

/**
 * Get the display value for a field (pending value if edited, otherwise original)
 */
function getDisplayValue(field: string): unknown {
  const pendingEdit = getPendingEditForField(field)
  if (pendingEdit) {
    return pendingEdit.newValue
  }
  return getFieldValue(field)
}

/**
 * Handle selection toggle from checkbox
 */
function handleSelectionChange(selected: boolean) {
  emit('select', props.row, selected)
}

/**
 * Handle double-click on a cell to enter edit mode
 */
function handleCellDblClick(column: TableColumn) {
  if (column.editable && !props.isPendingDelete) {
    emit('edit-cell', props.row, column)
  }
}

/**
 * Handle cell value change
 */
function handleCellChange(column: TableColumn, oldValue: unknown, newValue: unknown) {
  emit('cell-change', props.row, column, oldValue, newValue)
}
</script>

<template>
  <tr
    class="neu-table-row transition-all duration-200"
    :class="{
      'is-selected': isSelected,
      'is-pending-delete': isPendingDelete
    }"
  >
    <!-- Selection checkbox slot -->
    <td
      v-if="$slots.selection"
      class="neu-table-cell neu-table-cell--selection"
    >
      <slot
        name="selection"
        :row="row"
        :is-selected="isSelected"
        :on-change="handleSelectionChange"
      />
    </td>

    <!-- Render cells for each column -->
    <td
      v-for="column in columns"
      :key="column.id"
      class="neu-table-cell"
      :class="[
        column.className,
        {
          'neu-table-cell--editable': column.editable && !isPendingDelete,
          'neu-table-cell--edited': hasFieldEdit(column.field),
          'neu-table-cell--pinned-left': column.pinned === 'left',
          'neu-table-cell--pinned-right': column.pinned === 'right'
        }
      ]"
      :style="{
        width: column.width,
        minWidth: column.minWidth,
        maxWidth: column.maxWidth
      }"
      @dblclick="handleCellDblClick(column)"
    >
      <NeuTableCell
        :row="row"
        :column="column"
        :value="getDisplayValue(column.field)"
        :original-value="getFieldValue(column.field)"
        :is-edited="hasFieldEdit(column.field)"
        :is-pending-delete="isPendingDelete"
        :pending-edit="getPendingEditForField(column.field)"
        @change="(oldVal: unknown, newVal: unknown) => handleCellChange(column, oldVal, newVal)"
      >
        <!-- Pass through any column-specific slots -->
        <template
          v-if="$slots[`cell-${column.id}`]"
          #default="slotProps"
        >
          <slot
            :name="`cell-${column.id}`"
            v-bind="slotProps"
          />
        </template>
      </NeuTableCell>
    </td>
  </tr>
</template>

<style scoped>
.neu-table-row {
  background: var(--neu-bg);
}

/* Hover effect with subtle neu-flat shadow */
.neu-table-row:hover:not(.is-pending-delete) {
  background: var(--neu-bg-secondary);
  box-shadow:
    2px 2px 4px var(--neu-shadow-dark),
    -1px -1px 3px var(--neu-shadow-light);
}

/* Selected state - highlighted background */
.neu-table-row.is-selected {
  background: color-mix(in srgb, var(--neu-primary) 15%, var(--neu-bg));
}

.neu-table-row.is-selected:hover {
  background: color-mix(in srgb, var(--neu-primary) 20%, var(--neu-bg-secondary));
}

/* Pending delete state - dimmed with visual indication */
.neu-table-row.is-pending-delete {
  opacity: 0.6;
  background: color-mix(in srgb, var(--neu-danger) 10%, var(--neu-bg));
}

.neu-table-row.is-pending-delete .neu-table-cell {
  text-decoration: line-through;
  color: var(--neu-text-muted);
}

.neu-table-row.is-pending-delete:hover {
  opacity: 0.7;
}

/* Cell base styles */
.neu-table-cell {
  padding: 0.75rem 1rem;
  color: var(--neu-text);
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 30%, transparent);
  vertical-align: middle;
}

/* Selection cell */
.neu-table-cell--selection {
  width: 48px;
  text-align: center;
  padding: 0.75rem 0.5rem;
}

/* Editable cell indicator */
.neu-table-cell--editable {
  cursor: pointer;
  position: relative;
}

.neu-table-cell--editable::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 6px;
  border: 1px dashed transparent;
  transition: border-color 0.2s ease;
  pointer-events: none;
}

.neu-table-cell--editable:hover::after {
  border-color: color-mix(in srgb, var(--neu-primary) 40%, transparent);
}

/* Edited cell highlight */
.neu-table-cell--edited {
  background: color-mix(in srgb, var(--neu-warning) 15%, transparent);
  position: relative;
}

.neu-table-cell--edited::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--neu-warning);
}

/* Pinned columns */
.neu-table-cell--pinned-left {
  position: sticky;
  left: 0;
  background: var(--neu-bg);
  z-index: 1;
  box-shadow: 2px 0 4px color-mix(in srgb, var(--neu-shadow-dark) 20%, transparent);
}

.neu-table-cell--pinned-right {
  position: sticky;
  right: 0;
  background: var(--neu-bg);
  z-index: 1;
  box-shadow: -2px 0 4px color-mix(in srgb, var(--neu-shadow-dark) 20%, transparent);
}

/* Maintain pinned column background on row states */
.neu-table-row.is-selected .neu-table-cell--pinned-left,
.neu-table-row.is-selected .neu-table-cell--pinned-right {
  background: color-mix(in srgb, var(--neu-primary) 15%, var(--neu-bg));
}

.neu-table-row.is-pending-delete .neu-table-cell--pinned-left,
.neu-table-row.is-pending-delete .neu-table-cell--pinned-right {
  background: color-mix(in srgb, var(--neu-danger) 10%, var(--neu-bg));
}
</style>
