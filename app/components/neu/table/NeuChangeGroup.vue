<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PendingEdit, PendingDelete } from '~/types/table'

interface Props {
  /** User ID who made the changes */
  userId: string
  /** Display name of the user */
  userName?: string
  /** Array of pending edits */
  edits?: PendingEdit[]
  /** Array of pending deletes */
  deletes?: PendingDelete[]
}

const props = withDefaults(defineProps<Props>(), {
  edits: () => [],
  deletes: () => []
})

const emit = defineEmits<{
  /** Emitted when a change is reverted */
  'revert-change': [type: 'edit' | 'delete', change: PendingEdit | PendingDelete]
}>()

const isExpanded = ref(true)

/**
 * Total count of changes for this user
 */
const changeCount = computed(() => {
  return props.edits.length + props.deletes.length
})

/**
 * Toggle the expanded state
 */
function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

/**
 * Handle reverting a change
 */
function handleRevert(type: 'edit' | 'delete', change: PendingEdit | PendingDelete) {
  emit('revert-change', type, change)
}

/**
 * Get display name with fallback
 */
const displayName = computed(() => {
  return props.userName || `User ${props.userId}`
})
</script>

<template>
  <div class="neu-change-group">
    <!-- Header -->
    <button
      type="button"
      class="neu-change-group__header"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- User avatar placeholder -->
        <div class="neu-change-group__avatar">
          {{ displayName.charAt(0).toUpperCase() }}
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-[var(--neu-text)] truncate">
            {{ displayName }}
          </div>
          <div class="text-xs text-[var(--neu-text-muted)]">
            {{ changeCount }} {{ changeCount === 1 ? 'change' : 'changes' }}
          </div>
        </div>
      </div>

      <!-- Expand/collapse icon -->
      <svg
        :class="[
          'w-5 h-5 text-[var(--neu-text-muted)] transition-transform duration-200',
          { 'rotate-180': isExpanded }
        ]"
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
    </button>

    <!-- Changes list -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[500px]"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 max-h-[500px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-show="isExpanded"
        class="neu-change-group__content"
      >
        <!-- Edits -->
        <NeuChangeItem
          v-for="edit in edits"
          :key="`edit-${edit.rowId}-${edit.field}`"
          :change="edit"
          type="edit"
          @revert="handleRevert('edit', edit)"
        />

        <!-- Deletes -->
        <NeuChangeItem
          v-for="del in deletes"
          :key="`delete-${del.rowId}`"
          :change="del"
          type="delete"
          @revert="handleRevert('delete', del)"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.neu-change-group {
  border-radius: 1rem;
  background: var(--neu-bg-secondary);
  box-shadow: var(--neu-shadow-flat);
  overflow: hidden;
}

.neu-change-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;
}

.neu-change-group__header:hover {
  background: color-mix(in srgb, var(--neu-shadow-dark) 5%, transparent);
}

.neu-change-group__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.75rem;
  background: var(--neu-primary);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: var(--neu-shadow-small);
  flex-shrink: 0;
}

.neu-change-group__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem 1rem 1rem;
  overflow: hidden;
}
</style>
