<script setup lang="ts">
import type { TableColumn, SortDirection } from '~/types/table'

interface Props {
  columns: TableColumn[]
  sortBy?: string | null
  sortOrder?: SortDirection
  showSelectionColumn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sortBy: null,
  sortOrder: null,
  showSelectionColumn: false
})

const emit = defineEmits<{
  sort: [field: string, direction: SortDirection]
  'select-all': [selected: boolean]
}>()

// Track select all state
const selectAllChecked = ref(false)

/**
 * Handle clicking on a sortable column header
 * Cycles through: asc -> desc -> null -> asc
 */
function handleSort(column: TableColumn) {
  if (!column.sortable) return

  let newDirection: SortDirection

  if (props.sortBy !== column.field) {
    // Different column, start with ascending
    newDirection = 'asc'
  } else {
    // Same column, cycle through directions
    switch (props.sortOrder) {
      case 'asc':
        newDirection = 'desc'
        break
      case 'desc':
        newDirection = null
        break
      default:
        newDirection = 'asc'
    }
  }

  emit('sort', column.field, newDirection)
}

/**
 * Handle select all checkbox change
 */
function handleSelectAll() {
  selectAllChecked.value = !selectAllChecked.value
  emit('select-all', selectAllChecked.value)
}

/**
 * Get the sort icon state for a column
 */
function getSortState(column: TableColumn): 'asc' | 'desc' | 'none' {
  if (props.sortBy === column.field && props.sortOrder) {
    return props.sortOrder
  }
  return 'none'
}

/**
 * Check if a column is currently being sorted
 */
function isActiveSort(column: TableColumn): boolean {
  return props.sortBy === column.field && props.sortOrder !== null
}
</script>

<template>
  <thead class="neu-table-header">
    <tr>
      <!-- Selection column -->
      <th
        v-if="showSelectionColumn"
        class="neu-table-th neu-table-th-select"
      >
        <label class="neu-select-all-wrapper">
          <input
            type="checkbox"
            :checked="selectAllChecked"
            class="sr-only"
            @change="handleSelectAll"
          />
          <span
            class="neu-checkbox-visual"
            :class="{ 'is-checked': selectAllChecked }"
          >
            <svg
              v-if="selectAllChecked"
              class="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
        </label>
      </th>

      <!-- Column headers -->
      <th
        v-for="column in columns"
        :key="column.id"
        class="neu-table-th"
        :class="{
          'is-sortable': column.sortable,
          'is-active-sort': isActiveSort(column)
        }"
        :style="{
          width: column.width,
          minWidth: column.minWidth,
          maxWidth: column.maxWidth
        }"
        @click="handleSort(column)"
      >
        <div class="neu-th-content">
          <span class="neu-th-label">{{ column.label }}</span>

          <!-- Sort indicator -->
          <span
            v-if="column.sortable"
            class="neu-sort-indicator"
            :class="`sort-${getSortState(column)}`"
          >
            <!-- Up arrow (asc) -->
            <svg
              v-if="getSortState(column) === 'asc'"
              class="neu-sort-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>

            <!-- Down arrow (desc) -->
            <svg
              v-if="getSortState(column) === 'desc'"
              class="neu-sort-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>

            <!-- Neutral indicator (sortable but not sorted) -->
            <svg
              v-if="getSortState(column) === 'none'"
              class="neu-sort-icon neu-sort-neutral"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 9l4-4 4 4M8 15l4 4 4-4"
              />
            </svg>
          </span>
        </div>
      </th>
    </tr>
  </thead>
</template>

<style scoped>
.neu-table-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

.neu-table-th {
  padding: 1rem 1.25rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--neu-text-muted);
  background: linear-gradient(180deg, var(--neu-bg) 0%, var(--neu-bg-secondary) 100%);
  border-bottom: 2px solid color-mix(in srgb, var(--neu-shadow-dark) 15%, transparent);
  white-space: nowrap;
  user-select: none;
  transition: all 0.2s ease;
}

.neu-table-th:first-child {
  padding-left: 1.5rem;
}

.neu-table-th:last-child {
  padding-right: 1.5rem;
}

.neu-table-th-select {
  width: 56px;
  text-align: center;
}

.neu-table-th.is-sortable {
  cursor: pointer;
}

.neu-table-th.is-sortable:hover {
  color: var(--neu-text);
  background: linear-gradient(180deg, var(--neu-bg-secondary) 0%, color-mix(in srgb, var(--neu-primary) 8%, var(--neu-bg-secondary) 92%) 100%);
}

.neu-table-th.is-active-sort {
  color: var(--neu-primary);
  background: linear-gradient(180deg, var(--neu-bg) 0%, color-mix(in srgb, var(--neu-primary) 10%, var(--neu-bg-secondary) 90%) 100%);
  border-bottom-color: var(--neu-primary);
}

.neu-th-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.neu-th-label {
  flex: 1;
}

.neu-sort-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.neu-sort-icon {
  width: 1rem;
  height: 1rem;
  transition: all 0.2s ease;
}

.neu-sort-neutral {
  opacity: 0.3;
}

.neu-table-th.is-sortable:hover .neu-sort-neutral {
  opacity: 0.6;
}

.sort-asc .neu-sort-icon,
.sort-desc .neu-sort-icon {
  color: var(--neu-primary);
}

/* Select all checkbox styling */
.neu-select-all-wrapper {
  display: inline-flex;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.neu-checkbox-visual {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neu-bg);
  border: 2px solid var(--neu-text-muted);
  box-shadow: var(--neu-shadow-pressed);
  transition: all 0.2s ease;
}

.neu-checkbox-visual:hover {
  border-color: var(--neu-primary);
}

.neu-checkbox-visual.is-checked {
  background: var(--neu-primary);
  border-color: var(--neu-primary);
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
