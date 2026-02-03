<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  changesCount: number
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  saving: false
})

const emit = defineEmits<{
  save: []
  discardAll: []
  review: []
}>()

const showToast = computed(() => props.changesCount > 0)
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
        v-if="showToast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4"
      >
        <NeuCard variant="flat" padding="none" class="neu-pending-toast">
          <div class="flex items-center gap-1.5 p-1.5">
            <!-- Review button with animated count -->
            <button
              class="neu-review-btn"
              @click="emit('review')"
            >
              <span class="neu-review-text">Review</span>
              <span class="neu-review-count">
                <span class="neu-review-count-inner">{{ changesCount }}</span>
              </span>
            </button>

            <!-- Action buttons -->
            <div class="flex items-center gap-1.5">
              <!-- Discard -->
              <button
                class="neu-icon-btn"
                title="Discard all changes"
                @click="emit('discardAll')"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <!-- Save -->
              <button
                class="neu-icon-btn neu-icon-btn-save"
                :class="{ 'is-loading': saving }"
                :disabled="saving"
                title="Save all changes"
                @click="emit('save')"
              >
                <svg v-if="!saving" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.828a2 2 0 00-.586-1.414l-1.828-1.828A2 2 0 0016.172 4H15M8 4v4a1 1 0 001 1h5a1 1 0 001-1V4M8 4h7M8 15h8" />
                </svg>
                <div v-else class="w-4 h-4 border-2 border-[var(--neu-text-muted)] border-t-[var(--neu-text)] rounded-full animate-spin" />
              </button>
            </div>
          </div>
        </NeuCard>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.neu-pending-toast {
  box-shadow:
    0 4px 20px color-mix(in srgb, var(--neu-shadow-dark) 15%, transparent),
    0 8px 32px color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
}

.neu-review-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem 0.5rem 0.875rem;
  background: color-mix(in srgb, var(--neu-warning) 15%, var(--neu-bg));
  border: 1px solid color-mix(in srgb, var(--neu-warning) 30%, transparent);
  border-radius: 0.625rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--neu-shadow-pressed);
}

.neu-review-btn:hover {
  background: color-mix(in srgb, var(--neu-warning) 25%, var(--neu-bg));
  border-color: var(--neu-warning);
}

.neu-review-text {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--neu-text);
}

.neu-review-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.375rem;
  background: var(--neu-primary);
  border-radius: 9999px;
  animation: pulse-glow 2s ease-in-out infinite;
}

.neu-review-count-inner {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  animation: count-bounce 2s ease-in-out infinite;
}

.neu-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--neu-bg);
  border: none;
  border-radius: 0.5rem;
  color: var(--neu-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: var(--neu-shadow-flat);
}

.neu-icon-btn:hover {
  box-shadow: var(--neu-shadow-pressed);
  color: var(--neu-text);
}

.neu-icon-btn-save {
  color: var(--neu-text);
}

.neu-icon-btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--neu-primary) 40%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--neu-primary) 0%, transparent);
  }
}

@keyframes count-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
