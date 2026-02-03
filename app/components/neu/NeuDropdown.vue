<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  width?: string
  closeOnClick?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-end',
  width: 'auto',
  closeOnClick: false
})

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0 })

function updatePosition() {
  if (!triggerRef.value) return

  const rect = triggerRef.value.getBoundingClientRect()
  const dropdownWidth = props.width !== 'auto' ? parseInt(props.width) : 200
  const viewportWidth = window.innerWidth

  let top = rect.bottom + 8 // 8px gap (use viewport coords for fixed positioning)
  let left = rect.left

  // Adjust for placement
  if (props.placement === 'bottom-end' || props.placement === 'top-end') {
    // Align to right edge of trigger
    left = rect.right - dropdownWidth
  }

  if (props.placement === 'top-start' || props.placement === 'top-end') {
    // Position above trigger
    top = rect.top - 8
  }

  // Clamp to viewport to prevent overflow
  left = Math.max(8, Math.min(left, viewportWidth - dropdownWidth - 8))

  position.value = { top, left }
}

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePosition()
    })
  }
}

function close() {
  isOpen.value = false
}

function handleContentClick() {
  if (props.closeOnClick) {
    close()
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return

  const target = e.target as HTMLElement
  if (triggerRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return

  close()
}

function handleScroll() {
  if (isOpen.value) {
    updatePosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', updatePosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', updatePosition)
})

// Expose methods for parent components
defineExpose({ isOpen, toggle, close })
</script>

<template>
  <div class="neu-dropdown inline-block">
    <!-- Trigger slot -->
    <div ref="triggerRef" @click="toggle">
      <slot name="trigger" :is-open="isOpen" :toggle="toggle" />
    </div>

    <!-- Dropdown content - Teleported to body to escape overflow clipping -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="neu-dropdown-content fixed z-[9999]"
          :style="{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: width !== 'auto' ? width : undefined,
            minWidth: width === 'auto' ? '200px' : undefined,
            transformOrigin: placement.startsWith('top') ? 'bottom' : 'top'
          }"
          @click="handleContentClick"
        >
          <NeuCard variant="flat" padding="none" class="shadow-lg">
            <slot :close="close" />
          </NeuCard>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.neu-dropdown-content {
  /* Ensure it's above everything */
  isolation: isolate;
}

.neu-dropdown-content :deep(.rounded-2xl) {
  border-radius: 0.75rem;
}

.neu-dropdown-content :deep(.bg-\[var\(--neu-bg-secondary\)\]) {
  background: var(--neu-bg);
}
</style>
