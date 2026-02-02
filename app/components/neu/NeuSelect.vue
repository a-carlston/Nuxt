<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

interface Props {
  modelValue?: string | number | null | undefined
  options: Option[]
  placeholder?: string
  disabled?: boolean
  label?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  searchable?: boolean
  searchPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  placeholder: 'Select an option',
  disabled: false,
  size: 'md',
  searchable: false,
  searchPlaceholder: 'Search...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null | undefined]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const highlightedIndex = ref(-1)

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options
  }
  const query = searchQuery.value.toLowerCase()
  return props.options.filter((opt) =>
    opt.label.toLowerCase().includes(query)
  )
})

const enabledOptions = computed(() => {
  return filteredOptions.value.filter(opt => !opt.disabled)
})

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3 text-lg'
}

// Reset highlighted index when filtered options change
watch(filteredOptions, () => {
  highlightedIndex.value = -1
})

function toggleDropdown() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      highlightedIndex.value = -1
      if (props.searchable) {
        searchQuery.value = ''
        nextTick(() => {
          searchInputRef.value?.focus()
        })
      }
    }
  }
}

function openDropdown() {
  if (!props.disabled && !isOpen.value) {
    isOpen.value = true
    highlightedIndex.value = -1
    if (props.searchable) {
      searchQuery.value = ''
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  }
}

function selectOption(option: Option) {
  if (!option.disabled) {
    emit('update:modelValue', option.value)
    isOpen.value = false
    searchQuery.value = ''
    highlightedIndex.value = -1
    triggerRef.value?.focus()
  }
}

function selectHighlighted() {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < enabledOptions.value.length) {
    selectOption(enabledOptions.value[highlightedIndex.value])
  }
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function highlightNext() {
  if (!isOpen.value) {
    openDropdown()
    return
  }
  if (enabledOptions.value.length === 0) return
  highlightedIndex.value = (highlightedIndex.value + 1) % enabledOptions.value.length
  scrollToHighlighted()
}

function highlightPrev() {
  if (!isOpen.value) {
    openDropdown()
    return
  }
  if (enabledOptions.value.length === 0) return
  highlightedIndex.value = highlightedIndex.value <= 0
    ? enabledOptions.value.length - 1
    : highlightedIndex.value - 1
  scrollToHighlighted()
}

function scrollToHighlighted() {
  nextTick(() => {
    const highlighted = document.querySelector('.neu-option.is-highlighted')
    highlighted?.scrollIntoView({ block: 'nearest' })
  })
}

function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      highlightNext()
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightPrev()
      break
    case 'Enter':
      e.preventDefault()
      if (isOpen.value && highlightedIndex.value >= 0) {
        selectHighlighted()
      } else if (!isOpen.value) {
        openDropdown()
      }
      break
    case 'Tab':
      if (isOpen.value && highlightedIndex.value >= 0) {
        e.preventDefault()
        selectHighlighted()
      } else {
        closeDropdown()
      }
      break
    case 'Escape':
      e.preventDefault()
      closeDropdown()
      triggerRef.value?.focus()
      break
  }
}

function getOptionIndex(option: Option): number {
  return enabledOptions.value.findIndex(opt => opt.value === option.value)
}
</script>

<template>
  <div
    v-click-outside="closeDropdown"
    class="relative w-full"
    @keydown="handleKeydown"
  >
    <label
      v-if="label"
      class="block text-sm font-medium mb-2 text-[var(--neu-text)]"
    >
      {{ label }}
    </label>
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      :class="[
        'neu-select-trigger w-full rounded-xl text-left transition-all duration-200',
        'bg-[var(--neu-bg)]',
        sizeClasses[size],
        {
          'is-open': isOpen,
          'opacity-50 cursor-not-allowed': disabled,
          'has-error': error
        }
      ]"
      @click="toggleDropdown"
    >
      <div class="flex items-center justify-between">
        <span :class="selectedOption ? 'text-[var(--neu-text)]' : 'text-[var(--neu-text-muted)]'">
          {{ selectedOption?.label || placeholder }}
        </span>
        <svg
          :class="[
            'w-5 h-5 text-[var(--neu-text-muted)] transition-transform duration-200',
            { 'rotate-180': isOpen }
          ]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen"
        class="neu-dropdown absolute z-50 mt-2 w-full rounded-xl bg-[var(--neu-bg)] p-2"
      >
        <!-- Search Input -->
        <div v-if="searchable" class="mb-2">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="neu-search-input w-full px-3 py-2 rounded-lg text-sm bg-[var(--neu-bg-secondary)] text-[var(--neu-text)] placeholder-[var(--neu-text-muted)] outline-none"
            @click.stop
          />
        </div>

        <!-- Options List -->
        <div class="max-h-48 overflow-auto neu-scrollbar space-y-1">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            :disabled="option.disabled"
            :class="[
              'neu-option w-full px-3 py-2 text-left rounded-lg transition-all duration-150',
              {
                'is-selected': option.value === modelValue,
                'is-highlighted': getOptionIndex(option) === highlightedIndex && !option.disabled,
                'opacity-50 cursor-not-allowed': option.disabled
              }
            ]"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = getOptionIndex(option)"
          >
            {{ option.label }}
          </button>
          <div
            v-if="filteredOptions.length === 0"
            class="px-3 py-2 text-sm text-[var(--neu-text-muted)] text-center"
          >
            No results found
          </div>
        </div>
      </div>
    </Transition>

    <p
      v-if="error"
      class="mt-1.5 text-sm text-[var(--neu-danger)]"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.neu-select-trigger {
  box-shadow: var(--neu-shadow-flat);
}

.neu-select-trigger.is-open {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-select-trigger.has-error {
  ring: 2px solid var(--neu-danger);
}

.neu-dropdown {
  box-shadow: var(--neu-shadow-flat);
}

.neu-search-input {
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}

.neu-search-input:focus {
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light), 0 0 0 2px var(--neu-primary);
}

.neu-option {
  color: var(--neu-text);
}

.neu-option:hover:not(.is-selected):not(:disabled),
.neu-option.is-highlighted:not(.is-selected):not(:disabled) {
  background: var(--neu-bg-secondary);
}

.neu-option.is-selected {
  background: var(--neu-primary);
  color: white;
}

.neu-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--neu-text-muted) transparent;
}

.neu-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.neu-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.neu-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--neu-text-muted);
  border-radius: 3px;
}
</style>
