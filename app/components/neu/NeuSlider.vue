<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  label?: string
  showValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  showValue: true
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template>
  <div
    class="w-full"
    :class="{ 'opacity-50': disabled }"
  >
    <div
      v-if="label || showValue"
      class="flex justify-between items-center mb-2"
    >
      <label
        v-if="label"
        class="text-sm font-medium text-[var(--neu-text)]"
      >
        {{ label }}
      </label>
      <span
        v-if="showValue"
        class="text-sm text-[var(--neu-text-muted)]"
      >
        {{ modelValue }}
      </span>
    </div>
    <div class="relative">
      <div
        class="w-full h-2 rounded-full bg-[var(--neu-bg)] shadow-[var(--neu-shadow-pressed)]"
      >
        <div
          class="h-full rounded-full bg-[var(--neu-primary)] transition-all duration-100"
          :style="{ width: `${percentage}%` }"
        />
      </div>
      <input
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        @input="handleInput"
      />
      <div
        class="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-[var(--neu-shadow-flat)] pointer-events-none transition-all duration-100"
        :style="{ left: `calc(${percentage}% - 10px)` }"
      />
    </div>
  </div>
</template>
