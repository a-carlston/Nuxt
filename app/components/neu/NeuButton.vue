<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
  loading: false,
  rounded: false
})

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',   // ~30px - compact
  md: 'px-4 py-2 text-sm',     // ~38px - standard
  lg: 'px-5 py-2.5 text-base'  // ~44px - large
}

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary': return 'neu-btn-primary'
    case 'success': return 'neu-btn-success'
    case 'warning': return 'neu-btn-warning'
    case 'danger': return 'neu-btn-danger'
    case 'ghost': return 'neu-btn-ghost'
    default: return ''
  }
})
</script>

<template>
  <button
    type="button"
    :class="[
      'neu-btn inline-flex items-center justify-center font-medium transition-all duration-200',
      sizeClasses[size],
      variantClass,
      {
        'rounded-full': rounded,
        'rounded-lg': !rounded,
        'opacity-50 cursor-not-allowed': disabled,
        'cursor-wait': loading
      }
    ]"
    :disabled="disabled || loading"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>

