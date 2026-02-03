<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableColumn, SelectOption } from '~/types/table'

interface Props {
  columns: TableColumn[]
  filters: Map<string, unknown> | Record<string, unknown>
  showSelectionColumn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSelectionColumn: false
})

const emit = defineEmits<{
  'filter-change': [payload: { field: string; value: unknown }]
}>()

// Local filter values for debouncing
const localFilters = ref<Record<string, unknown>>({})

// Debounce timers per field
const debounceTimers = ref<Record<string, ReturnType<typeof setTimeout>>>({})

// Initialize local filters from props
watch(
  () => props.filters,
  (newFilters) => {
    if (newFilters instanceof Map) {
      newFilters.forEach((value, key) => {
        localFilters.value[key] = value
      })
    } else {
      localFilters.value = { ...newFilters }
    }
  },
  { immediate: true, deep: true }
)

// Get visible/filterable columns
const visibleColumns = computed(() => {
  return props.columns.filter((col) => col.visible !== false)
})

// Get filter value for a field
function getFilterValue(field: string): unknown {
  return localFilters.value[field] ?? ''
}

// Handle input change with debounce
function handleInputChange(column: TableColumn, value: unknown) {
  localFilters.value[column.field] = value

  // Clear existing timer
  if (debounceTimers.value[column.field]) {
    clearTimeout(debounceTimers.value[column.field])
  }

  // Set new timer for debounced emit
  debounceTimers.value[column.field] = setTimeout(() => {
    emit('filter-change', { field: column.field, value })
  }, 300)
}

// Handle select change (no debounce needed)
function handleSelectChange(column: TableColumn, value: unknown) {
  localFilters.value[column.field] = value
  emit('filter-change', { field: column.field, value: value === '' ? null : value })
}

// Get options for select/badge columns with "All" option
function getSelectOptions(column: TableColumn): SelectOption[] {
  const allOption: SelectOption = { label: 'All', value: '' }
  const columnOptions = column.options || []
  return [allOption, ...columnOptions]
}

// Determine filter type based on column type
function getFilterType(column: TableColumn): 'text' | 'select' | 'date' | 'none' {
  if (!column.filterable) {
    return 'none'
  }

  const type = column.type || 'text'

  switch (type) {
    case 'select':
    case 'badge':
      return 'select'
    case 'date':
    case 'datetime':
      return 'date'
    case 'actions':
    case 'avatar':
      return 'none'
    default:
      return 'text'
  }
}
</script>

<template>
  <tr class="neu-filter-row">
    <!-- Empty cell for selection column -->
    <td
      v-if="showSelectionColumn"
      class="neu-filter-cell neu-filter-cell--empty"
    />

    <!-- Filter cells for each column -->
    <td
      v-for="column in visibleColumns"
      :key="column.id"
      class="neu-filter-cell"
      :style="{ width: column.width }"
    >
      <!-- Text filter -->
      <div
        v-if="getFilterType(column) === 'text'"
        class="neu-filter-input-wrapper"
      >
        <svg
          class="neu-filter-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          :value="getFilterValue(column.field)"
          :placeholder="column.placeholder || 'Filter...'"
          class="neu-filter-input"
          @input="handleInputChange(column, ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Select filter -->
      <div
        v-else-if="getFilterType(column) === 'select'"
        class="neu-filter-select-wrapper"
      >
        <select
          :value="getFilterValue(column.field)"
          class="neu-filter-select"
          @change="handleSelectChange(column, ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="option in getSelectOptions(column)"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <svg
          class="neu-filter-select-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <!-- Date filter -->
      <div
        v-else-if="getFilterType(column) === 'date'"
        class="neu-filter-input-wrapper"
      >
        <input
          type="date"
          :value="getFilterValue(column.field)"
          class="neu-filter-input neu-filter-input--date"
          @input="handleInputChange(column, ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Non-filterable column -->
      <div v-else class="neu-filter-cell--empty" />
    </td>
  </tr>
</template>

<style scoped>
.neu-filter-row {
  background: var(--neu-bg);
}

.neu-filter-cell {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--neu-border, rgba(0, 0, 0, 0.1));
}

.neu-filter-cell--empty {
  padding: 0.5rem 0.75rem;
}

/* Input wrapper with search icon */
.neu-filter-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.neu-filter-icon {
  position: absolute;
  left: 0.5rem;
  width: 0.875rem;
  height: 0.875rem;
  color: var(--neu-text-muted);
  pointer-events: none;
}

/* Base input styling - compact with pressed effect */
.neu-filter-input {
  width: 100%;
  padding: 0.375rem 0.5rem 0.375rem 1.75rem;
  font-size: 0.75rem;
  line-height: 1.25;
  color: var(--neu-text);
  background: var(--neu-bg);
  border: none;
  border-radius: 0.5rem;
  outline: none;
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light);
  transition: box-shadow 0.2s ease;
}

.neu-filter-input::placeholder {
  color: var(--neu-text-muted);
}

.neu-filter-input:focus {
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light),
    0 0 0 2px var(--neu-primary);
}

/* Date input adjustments */
.neu-filter-input--date {
  padding-left: 0.5rem;
}

.neu-filter-input--date::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  filter: var(--neu-calendar-filter, none);
}

.neu-filter-input--date::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

/* Select wrapper */
.neu-filter-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.neu-filter-select {
  width: 100%;
  padding: 0.375rem 1.75rem 0.375rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.25;
  color: var(--neu-text);
  background: var(--neu-bg);
  border: none;
  border-radius: 0.5rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light);
  transition: box-shadow 0.2s ease;
}

.neu-filter-select:focus {
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light),
    0 0 0 2px var(--neu-primary);
}

.neu-filter-select-icon {
  position: absolute;
  right: 0.5rem;
  width: 0.75rem;
  height: 0.75rem;
  color: var(--neu-text-muted);
  pointer-events: none;
}

/* Dark mode calendar picker */
:root.dark .neu-filter-input--date::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
