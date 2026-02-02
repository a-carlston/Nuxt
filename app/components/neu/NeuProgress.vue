<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value?: number
  max?: number
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  max: 100,
  variant: 'primary',
  size: 'md',
  showLabel: false,
  indeterminate: false
})

const percentage = computed(() => {
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4'
}

const variantColors = {
  default: 'bg-[var(--neu-text-muted)]',
  primary: 'bg-[var(--neu-primary)]',
  success: 'bg-[var(--neu-success)]',
  warning: 'bg-[var(--neu-warning)]',
  danger: 'bg-[var(--neu-danger)]'
}
</script>

<template>
  <div class="w-full">
    <div
      v-if="showLabel"
      class="flex justify-between items-center mb-1.5"
    >
      <span class="text-sm text-[var(--neu-text)]">
        <slot name="label">Progress</slot>
      </span>
      <span class="text-sm text-[var(--neu-text-muted)]">
        {{ Math.round(percentage) }}%
      </span>
    </div>
    <div
      :class="[
        'w-full rounded-full bg-[var(--neu-bg)] shadow-[var(--neu-shadow-pressed)] overflow-hidden',
        sizeClasses[size]
      ]"
    >
      <div
        :class="[
          'h-full rounded-full transition-all duration-300',
          variantColors[variant],
          { 'animate-progress-indeterminate': indeterminate }
        ]"
        :style="indeterminate ? {} : { width: `${percentage}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% {
    width: 0%;
    margin-left: 0%;
  }
  50% {
    width: 50%;
    margin-left: 25%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
  }
}

.animate-progress-indeterminate {
  animation: progress-indeterminate 1.5s ease-in-out infinite;
}
</style>
