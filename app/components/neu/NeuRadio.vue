<script setup lang="ts">
interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

interface Props {
  modelValue?: string | number
  options: Option[]
  name: string
  disabled?: boolean
  inline?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  inline: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

const dotSizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3'
}

function select(value: string | number) {
  if (!props.disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div
    :class="[
      'flex gap-4',
      inline ? 'flex-row flex-wrap' : 'flex-col'
    ]"
  >
    <label
      v-for="option in options"
      :key="option.value"
      class="inline-flex items-center gap-3 cursor-pointer"
      :class="{ 'opacity-50 cursor-not-allowed': disabled || option.disabled }"
    >
      <button
        type="button"
        role="radio"
        :aria-checked="modelValue === option.value"
        :disabled="disabled || option.disabled"
        :class="[
          'relative rounded-full flex items-center justify-center transition-all duration-200',
          sizeClasses[size],
          modelValue === option.value
            ? 'bg-[var(--neu-primary)] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]'
            : 'bg-[var(--neu-bg)] shadow-[var(--neu-shadow-small)]'
        ]"
        @click="select(option.value)"
      >
        <span
          v-if="modelValue === option.value"
          :class="[
            'rounded-full bg-white',
            dotSizeClasses[size]
          ]"
        />
      </button>
      <span class="text-[var(--neu-text)]">
        {{ option.label }}
      </span>
    </label>
  </div>
</template>
