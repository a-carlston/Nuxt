<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '~/types/table'

interface Props {
  columns: TableColumn[]
  visibleColumns: string[]
  columnOrder: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visibleColumns': [value: string[]]
  'update:columnOrder': [value: string[]]
}>()

// Get the ordered columns based on columnOrder prop
const orderedColumns = computed(() => {
  const orderMap = new Map(props.columnOrder.map((id, index) => [id, index]))
  return [...props.columns].sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity
    const orderB = orderMap.get(b.id) ?? Infinity
    return orderA - orderB
  })
})

function isColumnVisible(columnId: string): boolean {
  return props.visibleColumns.includes(columnId)
}

function toggleColumnVisibility(columnId: string) {
  const newVisibleColumns = [...props.visibleColumns]
  const index = newVisibleColumns.indexOf(columnId)

  if (index > -1) {
    // Don't allow hiding the last visible column
    if (newVisibleColumns.length > 1) {
      newVisibleColumns.splice(index, 1)
    }
  } else {
    newVisibleColumns.push(columnId)
  }

  emit('update:visibleColumns', newVisibleColumns)
}

function moveColumnUp(columnId: string) {
  const newOrder = [...props.columnOrder]
  const index = newOrder.indexOf(columnId)

  if (index > 0) {
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    emit('update:columnOrder', newOrder)
  }
}

function moveColumnDown(columnId: string) {
  const newOrder = [...props.columnOrder]
  const index = newOrder.indexOf(columnId)

  if (index < newOrder.length - 1) {
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    emit('update:columnOrder', newOrder)
  }
}

function resetToDefault() {
  emit('update:visibleColumns', props.columns.map(col => col.id))
  emit('update:columnOrder', props.columns.map(col => col.id))
}

function getColumnIndex(columnId: string): number {
  return props.columnOrder.indexOf(columnId)
}
</script>

<template>
  <NeuDropdown placement="bottom-end" width="300px">
    <template #trigger="{ isOpen }">
      <NeuButton
        variant="ghost"
        size="sm"
        title="Manage columns"
        :class="{ 'is-active': isOpen }"
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
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      </NeuButton>
    </template>

    <template #default="{ close }">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--neu-shadow-dark)]/10">
        <span class="text-sm font-semibold text-[var(--neu-text)]">Manage Columns</span>
        <NeuButton variant="ghost" size="sm" @click="resetToDefault">
          <svg
            class="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset
        </NeuButton>
      </div>

      <!-- Column List -->
      <div class="max-h-80 overflow-y-auto p-2">
        <div
          v-for="column in orderedColumns"
          :key="column.id"
          class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--neu-bg-secondary)] transition-colors"
        >
          <!-- Visibility Checkbox -->
          <NeuCheckbox
            :model-value="isColumnVisible(column.id)"
            :disabled="isColumnVisible(column.id) && visibleColumns.length === 1"
            size="sm"
            @update:model-value="toggleColumnVisibility(column.id)"
          />

          <!-- Column Label -->
          <span class="flex-1 text-sm text-[var(--neu-text)] truncate">
            {{ column.label }}
          </span>

          <!-- Reorder Buttons -->
          <div class="flex items-center gap-1">
            <NeuButton
              variant="ghost"
              size="sm"
              :disabled="getColumnIndex(column.id) === 0"
              class="!p-1"
              @click="moveColumnUp(column.id)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </NeuButton>
            <NeuButton
              variant="ghost"
              size="sm"
              :disabled="getColumnIndex(column.id) === columnOrder.length - 1"
              class="!p-1"
              @click="moveColumnDown(column.id)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </NeuButton>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-2 border-t border-[var(--neu-shadow-dark)]/10 text-center">
        <span class="text-xs text-[var(--neu-text-muted)]">
          {{ visibleColumns.length }} of {{ columns.length }} columns visible
        </span>
      </div>
    </template>
  </NeuDropdown>
</template>
