<script setup lang="ts">
interface Props {
  variant?: 'flat' | 'convex' | 'concave' | 'pressed'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'flat',
  padding: 'md',
  hover: false
})

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8'
}

const variantClasses = {
  flat: 'neu-flat',
  convex: 'neu-convex',
  concave: 'neu-concave',
  pressed: 'neu-pressed'
}
</script>

<template>
  <div
    :class="[
      'bg-[var(--neu-bg-secondary)] rounded-2xl transition-all duration-200',
      variantClasses[variant],
      paddingClasses[padding],
      { 'hover:shadow-neu-convex cursor-pointer': hover }
    ]"
  >
    <slot />
  </div>
</template>
