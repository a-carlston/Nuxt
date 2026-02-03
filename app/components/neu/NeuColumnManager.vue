<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { TableColumn } from '~/types/table'

interface Props {
  columns: TableColumn[]
  visibleColumns: string[]
  columnOrder: string[]
  /** URL to the admin settings page for customizing column names */
  settingsUrl?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visibleColumns': [value: string[]]
  'update:columnOrder': [value: string[]]
}>()

// Drag state
const draggedColumnId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropPosition = ref<'before' | 'after' | null>(null)
const dragGhostEl = ref<HTMLElement | null>(null)

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

// Keyboard navigation for reordering
function moveColumnUp(columnId: string) {
  const newOrder = [...props.columnOrder]
  const index = newOrder.indexOf(columnId)

  if (index > 0) {
    const temp = newOrder[index - 1]!
    newOrder[index - 1] = newOrder[index]!
    newOrder[index] = temp
    emit('update:columnOrder', newOrder)
  }
}

function moveColumnDown(columnId: string) {
  const newOrder = [...props.columnOrder]
  const index = newOrder.indexOf(columnId)

  if (index < newOrder.length - 1) {
    const temp = newOrder[index]!
    newOrder[index] = newOrder[index + 1]!
    newOrder[index + 1] = temp
    emit('update:columnOrder', newOrder)
  }
}

function handleKeydown(event: KeyboardEvent, columnId: string) {
  if (event.key === 'ArrowUp' && (event.altKey || event.metaKey)) {
    event.preventDefault()
    moveColumnUp(columnId)
  } else if (event.key === 'ArrowDown' && (event.altKey || event.metaKey)) {
    event.preventDefault()
    moveColumnDown(columnId)
  }
}

function resetToDefault() {
  emit('update:visibleColumns', props.columns.map(col => col.id))
  emit('update:columnOrder', props.columns.map(col => col.id))
}

function getColumnIndex(columnId: string): number {
  return props.columnOrder.indexOf(columnId)
}

// Create custom drag ghost element
function createDragGhost(columnId: string, sourceElement: HTMLElement): HTMLElement {
  const column = props.columns.find(c => c.id === columnId)
  if (!column) return document.createElement('div')

  // Create ghost element
  const ghost = document.createElement('div')
  ghost.className = 'neu-drag-ghost'
  ghost.innerHTML = `
    <div class="neu-drag-ghost-content">
      <svg class="neu-drag-ghost-icon" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
      <span class="neu-drag-ghost-label">${column.label}</span>
    </div>
  `

  // Style the ghost element
  const computedStyle = getComputedStyle(document.documentElement)
  const bgColor = computedStyle.getPropertyValue('--neu-bg').trim() || '#e0e5ec'
  const textColor = computedStyle.getPropertyValue('--neu-text').trim() || '#2d3748'
  const primaryColor = computedStyle.getPropertyValue('--neu-primary').trim() || '#6366f1'
  const shadowDark = computedStyle.getPropertyValue('--neu-shadow-dark').trim() || 'rgba(0,0,0,0.15)'
  const shadowLight = computedStyle.getPropertyValue('--neu-shadow-light').trim() || 'rgba(255,255,255,0.8)'

  ghost.style.cssText = `
    position: fixed;
    top: -1000px;
    left: -1000px;
    z-index: 99999;
    pointer-events: none;
    padding: 10px 16px;
    background: ${bgColor};
    border-radius: 10px;
    box-shadow:
      6px 6px 14px ${shadowDark},
      -4px -4px 10px ${shadowLight},
      0 0 0 2px ${primaryColor};
    font-family: inherit;
    font-size: 14px;
    color: ${textColor};
    white-space: nowrap;
    transform: rotate(2deg);
  `

  const content = ghost.querySelector('.neu-drag-ghost-content') as HTMLElement
  if (content) {
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `
  }

  const icon = ghost.querySelector('.neu-drag-ghost-icon') as HTMLElement
  if (icon) {
    icon.style.cssText = `
      width: 16px;
      height: 16px;
      opacity: 0.6;
    `
  }

  const label = ghost.querySelector('.neu-drag-ghost-label') as HTMLElement
  if (label) {
    label.style.cssText = `
      font-weight: 500;
    `
  }

  document.body.appendChild(ghost)
  return ghost
}

// Clean up drag ghost
function removeDragGhost() {
  if (dragGhostEl.value) {
    dragGhostEl.value.remove()
    dragGhostEl.value = null
  }
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, columnId: string) {
  if (!event.dataTransfer) return

  draggedColumnId.value = columnId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', columnId)

  // Create and set custom drag image
  const sourceElement = event.target as HTMLElement
  const ghost = createDragGhost(columnId, sourceElement)
  dragGhostEl.value = ghost

  // Set the custom drag image - offset to center it on cursor
  event.dataTransfer.setDragImage(ghost, 100, 20)

  // Add dragging class after a frame to allow drag image capture
  requestAnimationFrame(() => {
    sourceElement.closest('.column-item')?.classList.add('is-dragging')
  })
}

// Cleanup on unmount
onUnmounted(() => {
  removeDragGhost()
})

function handleDragOver(event: DragEvent, columnId: string) {
  event.preventDefault()
  if (!event.dataTransfer || !draggedColumnId.value || draggedColumnId.value === columnId) {
    dropTargetId.value = null
    dropPosition.value = null
    return
  }

  event.dataTransfer.dropEffect = 'move'

  // Determine if dropping before or after based on mouse position
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2

  dropTargetId.value = columnId
  dropPosition.value = event.clientY < midpoint ? 'before' : 'after'
}

function handleDragLeave(event: DragEvent) {
  // Only clear if we're leaving the item entirely
  const relatedTarget = event.relatedTarget as HTMLElement | null
  const currentTarget = event.currentTarget as HTMLElement

  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    dropTargetId.value = null
    dropPosition.value = null
  }
}

function handleDrop(event: DragEvent, targetColumnId: string) {
  event.preventDefault()

  if (!draggedColumnId.value || draggedColumnId.value === targetColumnId) {
    clearDragState()
    return
  }

  const newOrder = [...props.columnOrder]
  const draggedIndex = newOrder.indexOf(draggedColumnId.value)
  const targetIndex = newOrder.indexOf(targetColumnId)

  // Remove dragged item
  newOrder.splice(draggedIndex, 1)

  // Calculate new position
  let insertIndex = newOrder.indexOf(targetColumnId)
  if (dropPosition.value === 'after') {
    insertIndex += 1
  }

  // Insert at new position
  newOrder.splice(insertIndex, 0, draggedColumnId.value)

  emit('update:columnOrder', newOrder)
  clearDragState()
}

function handleDragEnd() {
  // Remove dragging class from all items
  document.querySelectorAll('.column-item.is-dragging').forEach(el => {
    el.classList.remove('is-dragging')
  })
  // Clean up the ghost element
  removeDragGhost()
  clearDragState()
}

function clearDragState() {
  draggedColumnId.value = null
  dropTargetId.value = null
  dropPosition.value = null
}

function isDragging(columnId: string): boolean {
  return draggedColumnId.value === columnId
}

function isDropTarget(columnId: string): boolean {
  return dropTargetId.value === columnId
}

function getDropIndicatorPosition(columnId: string): 'before' | 'after' | null {
  if (dropTargetId.value === columnId) {
    return dropPosition.value
  }
  return null
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

      <!-- Instructions -->
      <div class="px-4 py-2 text-xs text-[var(--neu-text-muted)] border-b border-[var(--neu-shadow-dark)]/10">
        Drag to reorder or use Alt+Arrow keys
      </div>

      <!-- Column List -->
      <div
        class="max-h-80 overflow-y-auto p-2"
        role="listbox"
        aria-label="Column order"
      >
        <div
          v-for="column in orderedColumns"
          :key="column.id"
          class="column-item relative"
          :class="{
            'is-dragging': isDragging(column.id),
            'is-drop-target': isDropTarget(column.id)
          }"
          draggable="true"
          role="option"
          :aria-selected="isColumnVisible(column.id)"
          tabindex="0"
          @dragstart="handleDragStart($event, column.id)"
          @dragover="handleDragOver($event, column.id)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, column.id)"
          @dragend="handleDragEnd"
          @keydown="handleKeydown($event, column.id)"
        >
          <!-- Drop indicator line - before -->
          <div
            v-if="getDropIndicatorPosition(column.id) === 'before'"
            class="drop-indicator drop-indicator--before"
            aria-hidden="true"
          />

          <div class="column-item-content flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150">
            <!-- Drag Handle -->
            <button
              type="button"
              class="drag-handle flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -m-1 rounded text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] focus:outline-none focus:ring-2 focus:ring-[var(--neu-primary)]/50"
              aria-label="Drag to reorder"
              tabindex="-1"
            >
              <svg
                class="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </button>

            <!-- Visibility Checkbox -->
            <NeuCheckbox
              :model-value="isColumnVisible(column.id)"
              :disabled="isColumnVisible(column.id) && visibleColumns.length === 1"
              size="sm"
              :aria-label="`Toggle ${column.label} visibility`"
              @update:model-value="toggleColumnVisibility(column.id)"
            />

            <!-- Column Label -->
            <span class="flex-1 text-sm text-[var(--neu-text)] truncate select-none">
              {{ column.label }}
            </span>

            <!-- Position indicator for screen readers -->
            <span class="sr-only">
              Position {{ getColumnIndex(column.id) + 1 }} of {{ columnOrder.length }}
            </span>
          </div>

          <!-- Drop indicator line - after -->
          <div
            v-if="getDropIndicatorPosition(column.id) === 'after'"
            class="drop-indicator drop-indicator--after"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-2 border-t border-[var(--neu-shadow-dark)]/10">
        <div class="text-center">
          <span class="text-xs text-[var(--neu-text-muted)]">
            {{ visibleColumns.length }} of {{ columns.length }} columns visible
          </span>
        </div>
        <!-- Admin settings link -->
        <div v-if="settingsUrl" class="mt-2 pt-2 border-t border-[var(--neu-shadow-dark)]/10 text-center">
          <NuxtLink
            :to="settingsUrl"
            class="inline-flex items-center gap-1.5 text-xs text-[var(--neu-primary)] hover:text-[var(--neu-primary-dark)] transition-colors"
            @click="close"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Customize column names
          </NuxtLink>
        </div>
      </div>
    </template>
  </NeuDropdown>
</template>

<style scoped>
.column-item {
  user-select: none;
  transition: transform 150ms ease, opacity 150ms ease;
}

.column-item:focus {
  outline: none;
}

.column-item:focus .column-item-content {
  box-shadow: 0 0 0 2px var(--neu-primary);
}

.column-item-content {
  background: transparent;
  transition:
    background-color 150ms ease,
    box-shadow 200ms ease,
    transform 150ms ease,
    border 150ms ease;
}

.column-item:not(.is-dragging):hover .column-item-content {
  background: var(--neu-bg-secondary);
}

/* Dragging state - the source item becomes a placeholder */
.column-item.is-dragging {
  opacity: 0.4;
  transform: scale(0.96);
}

.column-item.is-dragging .column-item-content {
  background: var(--neu-bg-secondary);
  border: 2px dashed var(--neu-primary);
  border-radius: 8px;
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark);
}

/* Fade the content inside the placeholder to show it's "picked up" */
.column-item.is-dragging .column-item-content > * {
  opacity: 0.3;
}

/* Drop target state - highlight where item will land */
.column-item.is-drop-target .column-item-content {
  background: color-mix(in srgb, var(--neu-primary) 8%, var(--neu-bg-secondary));
  transform: scale(1.01);
}

/* Drop indicator lines - prominent with glow effect */
.drop-indicator {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 3px;
  background: linear-gradient(90deg, var(--neu-primary), color-mix(in srgb, var(--neu-primary) 80%, white));
  border-radius: 2px;
  pointer-events: none;
  z-index: 10;
  box-shadow:
    0 0 8px var(--neu-primary),
    0 0 16px color-mix(in srgb, var(--neu-primary) 50%, transparent);
  animation: dropIndicatorPulse 0.8s ease-in-out infinite;
}

@keyframes dropIndicatorPulse {
  0%, 100% {
    opacity: 1;
    box-shadow:
      0 0 8px var(--neu-primary),
      0 0 16px color-mix(in srgb, var(--neu-primary) 50%, transparent);
  }
  50% {
    opacity: 0.8;
    box-shadow:
      0 0 12px var(--neu-primary),
      0 0 24px color-mix(in srgb, var(--neu-primary) 60%, transparent);
  }
}

.drop-indicator::before,
.drop-indicator::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--neu-primary);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  box-shadow:
    0 0 6px var(--neu-primary),
    inset 1px 1px 2px rgba(255, 255, 255, 0.3);
}

.drop-indicator::before {
  left: -5px;
}

.drop-indicator::after {
  right: -5px;
}

.drop-indicator--before {
  top: -1px;
}

.drop-indicator--after {
  bottom: -1px;
}

/* Drag handle styling */
.drag-handle {
  transition:
    color 150ms ease,
    transform 150ms ease;
}

.drag-handle:hover {
  transform: scale(1.1);
}

.column-item.is-dragging .drag-handle {
  cursor: grabbing;
}

/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
