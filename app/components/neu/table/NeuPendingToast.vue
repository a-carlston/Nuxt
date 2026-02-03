<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Number of pending changes */
  changeCount: number
  /** Whether the review sidebar is open */
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

const emit = defineEmits<{
  /** Emitted when the save button is clicked */
  save: []
  /** Emitted when the cancel button is clicked */
  cancel: []
  /** Emitted when the review button is clicked to toggle sidebar */
  'toggle-review': []
}>()

/**
 * Format the change count message
 */
const changeMessage = computed(() => {
  if (props.changeCount === 0) return 'No pending changes'
  if (props.changeCount === 1) return '1 pending change'
  return `${props.changeCount} pending changes`
})

/**
 * Whether the toast should be visible
 */
const isVisible = computed(() => props.changeCount > 0)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="isVisible"
        class="neu-pending-toast"
        :class="{ 'neu-pending-toast--sidebar-open': isOpen }"
      >
        <div class="neu-pending-toast__content">
          <!-- Change indicator -->
          <div class="flex items-center gap-3">
            <div class="neu-pending-toast__indicator">
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <span class="text-[var(--neu-text)] font-medium">
              {{ changeMessage }}
            </span>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <!-- Review button -->
            <button
              type="button"
              class="neu-pending-toast__btn neu-pending-toast__btn--review"
              @click="emit('toggle-review')"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Review
            </button>

            <!-- Cancel button -->
            <button
              type="button"
              class="neu-pending-toast__btn neu-pending-toast__btn--cancel"
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
              Cancel
            </button>

            <!-- Save button -->
            <button
              type="button"
              class="neu-pending-toast__btn neu-pending-toast__btn--save"
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
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.neu-pending-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  transition: all 0.3s ease;
}

.neu-pending-toast--sidebar-open {
  transform: translateX(calc(-50% - 180px));
}

.neu-pending-toast__content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  background: var(--neu-bg);
  border-radius: 1rem;
  box-shadow:
    8px 8px 16px var(--neu-shadow-dark),
    -8px -8px 16px var(--neu-shadow-light),
    0 4px 20px rgba(0, 0, 0, 0.15);
}

.neu-pending-toast__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 0.75rem;
  background: var(--neu-warning);
  color: white;
  box-shadow: var(--neu-shadow-small);
}

.neu-pending-toast__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.neu-pending-toast__btn--review {
  background: var(--neu-bg-secondary);
  color: var(--neu-text);
  box-shadow: var(--neu-shadow-small);
}

.neu-pending-toast__btn--review:hover {
  box-shadow: var(--neu-shadow-convex);
}

.neu-pending-toast__btn--review:active {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-pending-toast__btn--cancel {
  background: var(--neu-bg-secondary);
  color: var(--neu-danger);
  box-shadow: var(--neu-shadow-small);
}

.neu-pending-toast__btn--cancel:hover {
  background: color-mix(in srgb, var(--neu-danger) 10%, var(--neu-bg-secondary));
  box-shadow: var(--neu-shadow-convex);
}

.neu-pending-toast__btn--cancel:active {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-pending-toast__btn--save {
  background: var(--neu-primary);
  color: white;
  box-shadow:
    4px 4px 8px var(--neu-shadow-dark),
    -2px -2px 4px var(--neu-shadow-light);
}

.neu-pending-toast__btn--save:hover {
  filter: brightness(1.1);
  box-shadow:
    6px 6px 12px var(--neu-shadow-dark),
    -3px -3px 6px var(--neu-shadow-light);
}

.neu-pending-toast__btn--save:active {
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.1);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .neu-pending-toast__content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .neu-pending-toast--sidebar-open {
    transform: translateX(-50%);
  }
}
</style>
