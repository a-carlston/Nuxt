<script setup lang="ts">
import type { PendingEdit, PendingDelete } from '~/types/table'

interface Props {
  /** The change data (edit or delete) */
  change: PendingEdit | PendingDelete
  /** Type of change */
  type: 'edit' | 'delete'
}

defineProps<Props>()

const emit = defineEmits<{
  /** Emitted when the user clicks the revert button */
  revert: []
}>()

/**
 * Check if the change is a PendingEdit
 */
function isEdit(change: PendingEdit | PendingDelete): change is PendingEdit {
  return 'field' in change
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'empty'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Get a display identifier for a deleted row
 */
function getRowIdentifier(rowData: Record<string, unknown>): string {
  // Try common identifier fields
  const identifiers = ['name', 'title', 'email', 'label', 'id']
  for (const field of identifiers) {
    if (rowData[field]) {
      return String(rowData[field])
    }
  }
  return `Row #${rowData.id || 'Unknown'}`
}
</script>

<template>
  <div
    class="neu-change-item"
    :class="{ 'neu-change-item--delete': type === 'delete' }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <!-- Edit change display -->
        <template v-if="type === 'edit' && isEdit(change)">
          <div class="text-sm font-medium text-[var(--neu-text)] mb-1">
            {{ change.field }}
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-[var(--neu-text-muted)] truncate max-w-[100px]">
              {{ formatValue(change.oldValue) }}
            </span>
            <svg
              class="w-4 h-4 text-[var(--neu-text-muted)] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span class="text-[var(--neu-warning)] font-medium truncate max-w-[100px]">
              {{ formatValue(change.newValue) }}
            </span>
          </div>
        </template>

        <!-- Delete change display -->
        <template v-else-if="type === 'delete' && !isEdit(change)">
          <div class="text-sm font-medium text-[var(--neu-danger)] mb-1">
            Delete Row
          </div>
          <div class="text-sm text-[var(--neu-text-muted)] truncate">
            {{ getRowIdentifier(change.rowData as Record<string, unknown>) }}
          </div>
        </template>
      </div>

      <!-- Revert button -->
      <button
        type="button"
        class="neu-change-item__revert"
        title="Revert this change"
        @click="emit('revert')"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.neu-change-item {
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: var(--neu-bg);
  box-shadow:
    inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light);
  transition: all 0.2s ease;
}

.neu-change-item:hover {
  background: var(--neu-bg-secondary);
}

.neu-change-item--delete {
  background: color-mix(in srgb, var(--neu-danger) 8%, var(--neu-bg));
  border-left: 3px solid var(--neu-danger);
}

.neu-change-item__revert {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 0.5rem;
  background: var(--neu-bg);
  color: var(--neu-text-muted);
  box-shadow: var(--neu-shadow-small);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.neu-change-item__revert:hover {
  color: var(--neu-danger);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-change-item__revert:active {
  box-shadow:
    inset 2px 2px 4px var(--neu-shadow-dark),
    inset -2px -2px 4px var(--neu-shadow-light);
}
</style>
