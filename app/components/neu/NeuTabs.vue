<script setup lang="ts">
interface Tab {
  id: string
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string
  tabs: Tab[]
  variant?: 'default' | 'pills'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectTab(tab: Tab) {
  if (!tab.disabled) {
    emit('update:modelValue', tab.id)
  }
}
</script>

<template>
  <div class="w-full">
    <div
      :class="[
        'neu-tabs-container flex gap-2 p-2 rounded-xl',
        { 'is-pills': variant === 'pills' }
      ]"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :disabled="tab.disabled"
        :class="[
          'neu-tab px-4 py-2 rounded-lg font-medium transition-all duration-200',
          {
            'is-active': modelValue === tab.id,
            'opacity-50 cursor-not-allowed': tab.disabled
          }
        ]"
        @click="selectTab(tab)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="mt-4">
      <slot :name="modelValue" />
    </div>
  </div>
</template>

<style scoped>
.neu-tabs-container {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-tabs-container.is-pills {
  background: transparent;
  box-shadow: none;
}

.neu-tab {
  color: var(--neu-text-muted);
}

.neu-tab:hover:not(:disabled):not(.is-active) {
  color: var(--neu-text);
}

.neu-tab.is-active {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  color: var(--neu-primary);
}
</style>
