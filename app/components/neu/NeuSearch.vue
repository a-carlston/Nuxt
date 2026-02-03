<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

interface Props {
  modelValue?: string | number | null | undefined
  options?: Option[]
  placeholder?: string
  disabled?: boolean
  label?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  clearable?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  placeholder: 'Search...',
  disabled: false,
  size: 'md',
  clearable: true,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null | undefined]
  search: [query: string]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const inputRef = ref<HTMLInputElement>()
const highlightedIndex = ref(-1)

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter((opt) =>
    opt.label.toLowerCase().includes(query)
  )
})

const enabledOptions = computed(() => {
  return filteredOptions.value.filter(opt => !opt.disabled)
})

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',   // ~30px - compact
  md: 'px-3 py-2 text-sm',     // ~38px - standard
  lg: 'px-4 py-2.5 text-base'  // ~44px - large
}

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

// Reset highlighted index when filtered options change
watch(filteredOptions, () => {
  highlightedIndex.value = -1
})

function openDropdown() {
  if (!props.disabled) {
    isOpen.value = true
    highlightedIndex.value = -1
  }
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function selectOption(option: Option) {
  if (!option.disabled) {
    emit('update:modelValue', option.value)
    closeDropdown()
  }
}

function selectHighlighted() {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < enabledOptions.value.length) {
    selectOption(enabledOptions.value[highlightedIndex.value])
  }
}

function clearSelection() {
  emit('update:modelValue', null)
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  searchQuery.value = target.value
  emit('search', target.value)
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
      break
  }
}

function getOptionIndex(option: Option): number {
  return enabledOptions.value.findIndex(opt => opt.value === option.value)
}

watch(searchQuery, (val) => {
  if (val && !isOpen.value) {
    isOpen.value = true
  }
})
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
    <div
      :class="[
        'neu-search-input relative flex items-center rounded-lg transition-all duration-200',
        'bg-[var(--neu-bg)]',
        {
          'is-open': isOpen,
          'opacity-50 cursor-not-allowed': disabled,
          'ring-2 ring-[var(--neu-danger)]': error
        }
      ]"
    >
      <!-- Search Icon -->
      <div :class="['pl-3 text-[var(--neu-text-muted)]', iconSizeClasses[size]]">
        <svg
          v-if="!loading"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          class="w-full h-full"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <svg
          v-else
          class="animate-spin w-full h-full"
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
      </div>

      <!-- Input -->
      <input
        ref="inputRef"
        type="text"
        :value="isOpen ? searchQuery : (selectedOption?.label || '')"
        :placeholder="selectedOption ? selectedOption.label : placeholder"
        :disabled="disabled"
        :class="[
          'flex-1 bg-transparent border-none outline-none text-[var(--neu-text)]',
          sizeClasses[size]
        ]"
        @focus="openDropdown"
        @input="handleInput"
      />

      <!-- Clear Button -->
      <button
        v-if="clearable && (modelValue !== null || searchQuery)"
        type="button"
        class="pr-3 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] transition-colors"
        @click.stop="clearSelection"
      >
        <svg
          :class="iconSizeClasses[size]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && filteredOptions.length > 0"
        class="neu-dropdown absolute z-50 mt-2 w-full rounded-lg bg-[var(--neu-bg)] p-2 max-h-60 overflow-auto neu-scrollbar space-y-1"
      >
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
      </div>
    </Transition>

    <!-- No Results -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && searchQuery && filteredOptions.length === 0"
        class="neu-dropdown absolute z-50 mt-2 w-full rounded-lg bg-[var(--neu-bg)] p-4 text-center text-[var(--neu-text-muted)]"
      >
        No results found
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
.neu-search-input {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-dropdown {
  box-shadow: var(--neu-shadow-flat);
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
