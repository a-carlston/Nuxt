<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue?: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  showClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  size: 'md',
  closeOnOverlay: true,
  closeOnEscape: true,
  showClose: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close()
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
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
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black/40"
          @click="handleOverlayClick"
        />

        <!-- Modal -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            :class="[
              'relative w-full rounded-2xl bg-[var(--neu-bg)]',
              sizeClasses[size]
            ]"
          >
            <!-- Header -->
            <div
              v-if="title || $slots.header || showClose"
              class="flex items-center justify-between p-5 border-b border-[var(--neu-shadow-dark)]/10"
            >
              <slot name="header">
                <h3 class="text-lg font-semibold text-[var(--neu-text)]">
                  {{ title }}
                </h3>
              </slot>
              <button
                v-if="showClose"
                type="button"
                class="p-2 rounded-lg text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors"
                @click="close"
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

            <!-- Body -->
            <div class="p-5">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="p-5 border-t border-[var(--neu-shadow-dark)]/10"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
