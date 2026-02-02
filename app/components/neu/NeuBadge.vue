<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  pill?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  pill: false
})

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
}

const variantClasses = {
  default: 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text)]',
  primary: 'bg-[var(--neu-primary)] text-white',
  success: 'bg-[var(--neu-success)] text-white',
  warning: 'bg-[var(--neu-warning)] text-white',
  danger: 'bg-[var(--neu-danger)] text-white'
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium shadow-[var(--neu-shadow-small)]',
      sizeClasses[size],
      variantClasses[variant],
      pill ? 'rounded-full' : 'rounded-md'
    ]"
  >
    <slot />
  </span>
</template>
