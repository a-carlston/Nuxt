<script setup lang="ts">
interface Props {
  modelValue?: boolean
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7'
}

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label
    class="neu-checkbox inline-flex items-start gap-3 cursor-pointer select-none"
    :class="{ 'opacity-50 cursor-not-allowed pointer-events-none': disabled }"
  >
    <!-- Hidden real checkbox -->
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="sr-only peer"
      @change="handleChange"
    />

    <!-- Visual checkbox -->
    <span
      :class="[
        'neu-checkbox-box relative rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0',
        sizeClasses[size],
        modelValue ? 'is-checked' : ''
      ]"
    >
      <svg
        v-if="modelValue"
        class="w-3/4 h-3/4 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="3"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </span>

    <!-- Label -->
    <span
      v-if="label || $slots.label"
      class="text-[var(--neu-text)] pt-0.5"
    >
      <slot name="label">{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.neu-checkbox {
  -webkit-tap-highlight-color: transparent;
}

.neu-checkbox-box {
  background: var(--neu-bg);
  border: 2px solid var(--neu-text-muted);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-checkbox-box:hover {
  border-color: var(--neu-primary);
}

.neu-checkbox-box.is-checked {
  background: var(--neu-primary);
  border-color: var(--neu-primary);
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2);
}
</style>
