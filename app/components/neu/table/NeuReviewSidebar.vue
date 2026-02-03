<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import type { PendingEdit, PendingDelete } from '~/types/table'
import type { ChangesByUser } from '~/composables/usePendingChanges'

interface Props {
  /** Whether the sidebar is open */
  isOpen: boolean
  /** Changes grouped by user ID */
  changesByUser: ChangesByUser
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Emitted when the close button is clicked */
  close: []
  /** Emitted when the save all button is clicked */
  save: []
  /** Emitted when the cancel all button is clicked */
  cancel: []
  /** Emitted when a single change is reverted */
  'revert-change': [type: 'edit' | 'delete', change: PendingEdit | PendingDelete]
}>()

/**
 * Get the user's display name from their changes
 */
function getUserName(userId: string): string | undefined {
  const userChanges = props.changesByUser[userId]
  if (!userChanges) return undefined

  // Try to get name from edits first
  const editWithName = userChanges.edits.find(e => e.userName)
  if (editWithName?.userName) return editWithName.userName

  // Try deletes
  const deleteWithName = userChanges.deletes.find(d => d.userName)
  if (deleteWithName?.userName) return deleteWithName.userName

  return undefined
}

/**
 * Get total change count
 */
function getTotalChangeCount(): number {
  let count = 0
  for (const userId in props.changesByUser) {
    const changes = props.changesByUser[userId]
    if (changes) {
      count += changes.edits.length + changes.deletes.length
    }
  }
  return count
}

/**
 * Handle escape key to close sidebar
 */
function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

/**
 * Handle revert from NeuChangeGroup
 */
function handleRevertChange(type: 'edit' | 'delete', change: PendingEdit | PendingDelete) {
  emit('revert-change', type, change)
}

// Lock body scroll when open
watch(
  () => props.isOpen,
  (isOpen) => {
    if (import.meta.client) {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  }
)

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('keydown', handleEscape)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', handleEscape)
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <!-- Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        @click="emit('close')"
      />
    </Transition>

    <!-- Sidebar -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isOpen"
        class="neu-review-sidebar"
      >
        <!-- Header -->
        <div class="neu-review-sidebar__header">
          <div class="flex items-center gap-3">
            <div class="neu-review-sidebar__icon">
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-[var(--neu-text)]">
                Review Changes
              </h2>
              <p class="text-sm text-[var(--neu-text-muted)]">
                {{ getTotalChangeCount() }} pending {{ getTotalChangeCount() === 1 ? 'change' : 'changes' }}
              </p>
            </div>
          </div>

          <!-- Close button -->
          <button
            type="button"
            class="neu-review-sidebar__close"
            @click="emit('close')"
          >
            <svg
              class="w-5 h-5"
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

        <!-- Content -->
        <div class="neu-review-sidebar__content">
          <div
            v-if="Object.keys(changesByUser).length === 0"
            class="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <div class="neu-review-sidebar__empty-icon">
              <svg
                class="w-12 h-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p class="text-[var(--neu-text-muted)] mt-4">
              No pending changes to review
            </p>
          </div>

          <div
            v-else
            class="space-y-4"
          >
            <NeuChangeGroup
              v-for="(changes, userId) in changesByUser"
              :key="userId"
              :user-id="String(userId)"
              :user-name="getUserName(String(userId))"
              :edits="changes.edits"
              :deletes="changes.deletes"
              @revert-change="handleRevertChange"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="neu-review-sidebar__footer">
          <button
            type="button"
            class="neu-review-sidebar__btn neu-review-sidebar__btn--cancel"
            @click="emit('cancel')"
          >
            <svg
              class="w-4 h-4 mr-2"
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
            Cancel All
          </button>

          <button
            type="button"
            class="neu-review-sidebar__btn neu-review-sidebar__btn--save"
            @click="emit('save')"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Save All
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.neu-review-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  background: var(--neu-bg);
  box-shadow:
    -8px 0 24px var(--neu-shadow-dark),
    8px 0 24px var(--neu-shadow-light);
  z-index: 50;
}

.neu-review-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 20%, transparent);
  background: var(--neu-bg-secondary);
}

.neu-review-sidebar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 0.75rem;
  background: var(--neu-primary);
  color: white;
  box-shadow: var(--neu-shadow-small);
}

.neu-review-sidebar__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.75rem;
  background: var(--neu-bg);
  color: var(--neu-text-muted);
  box-shadow: var(--neu-shadow-small);
  transition: all 0.2s ease;
}

.neu-review-sidebar__close:hover {
  color: var(--neu-text);
  box-shadow: var(--neu-shadow-convex);
}

.neu-review-sidebar__close:active {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-review-sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.neu-review-sidebar__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 1.25rem;
  background: var(--neu-bg-secondary);
  color: var(--neu-success);
  box-shadow: var(--neu-shadow-flat);
}

.neu-review-sidebar__footer {
  display: flex;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 20%, transparent);
  background: var(--neu-bg-secondary);
}

.neu-review-sidebar__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.neu-review-sidebar__btn--cancel {
  background: var(--neu-bg);
  color: var(--neu-danger);
  box-shadow: var(--neu-shadow-small);
}

.neu-review-sidebar__btn--cancel:hover {
  background: color-mix(in srgb, var(--neu-danger) 10%, var(--neu-bg));
  box-shadow: var(--neu-shadow-convex);
}

.neu-review-sidebar__btn--cancel:active {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-review-sidebar__btn--save {
  background: var(--neu-primary);
  color: white;
  box-shadow:
    4px 4px 8px var(--neu-shadow-dark),
    -2px -2px 4px var(--neu-shadow-light);
}

.neu-review-sidebar__btn--save:hover {
  filter: brightness(1.1);
  box-shadow:
    6px 6px 12px var(--neu-shadow-dark),
    -3px -3px 6px var(--neu-shadow-light);
}

.neu-review-sidebar__btn--save:active {
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.1);
}

/* Responsive */
@media (max-width: 480px) {
  .neu-review-sidebar {
    max-width: 100%;
  }
}
</style>
