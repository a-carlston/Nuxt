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

const sizeConfig = {
  sm: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
  md: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
  lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' }
}

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <label
    class="inline-flex items-center gap-3 cursor-pointer"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
  >
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      :class="[
        'neu-toggle-track relative rounded-full transition-all duration-200',
        sizeConfig[size].track,
        { 'is-active': modelValue }
      ]"
      @click="toggle"
    >
      <span
        :class="[
          'neu-toggle-thumb absolute top-0.5 left-0.5 rounded-full transition-transform duration-200',
          sizeConfig[size].thumb,
          { [sizeConfig[size].translate]: modelValue }
        ]"
      />
    </button>
    <span
      v-if="label"
      class="text-[var(--neu-text)]"
    >
      {{ label }}
    </span>
  </label>
</template>

<style scoped>
.neu-toggle-track {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-toggle-track.is-active {
  background: var(--neu-primary);
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2);
}

.neu-toggle-thumb {
  background: white;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}
</style>
