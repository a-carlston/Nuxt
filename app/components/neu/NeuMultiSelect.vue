<script setup lang="ts">
import { ref, computed } from 'vue'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

interface Props {
  modelValue?: (string | number)[]
  options: Option[]
  placeholder?: string
  disabled?: boolean
  label?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  max?: number
  searchable?: boolean
  maxDisplay?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  placeholder: 'Select options...',
  disabled: false,
  size: 'md',
  max: Infinity,
  searchable: true,
  maxDisplay: 3
})

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[]]
}>()

const isOpen = ref(false)
const searchQuery = ref('')

const selectedOptions = computed(() => {
  return props.options.filter((opt) => props.modelValue.includes(opt.value))
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter((opt) =>
    opt.label.toLowerCase().includes(query)
  )
})

const canSelectMore = computed(() => {
  return props.modelValue.length < props.max
})

const sizeClasses = {
  sm: 'min-h-[34px] text-sm',
  md: 'min-h-[42px] text-base',
  lg: 'min-h-[50px] text-lg'
}

const tagSizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
}

function toggleDropdown() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (!isOpen.value) {
      searchQuery.value = ''
    }
  }
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function isSelected(value: string | number) {
  return props.modelValue.includes(value)
}

function toggleOption(option: Option) {
  if (option.disabled) return

  const newValue = [...props.modelValue]
  const index = newValue.indexOf(option.value)

  if (index > -1) {
    newValue.splice(index, 1)
  } else if (canSelectMore.value) {
    newValue.push(option.value)
  }

  emit('update:modelValue', newValue)
}

function removeOption(value: string | number) {
  const newValue = props.modelValue.filter((v) => v !== value)
  emit('update:modelValue', newValue)
}

function clearAll() {
  emit('update:modelValue', [])
}

const allSelected = computed(() => {
  const selectableOptions = filteredOptions.value.filter(opt => !opt.disabled)
  return selectableOptions.length > 0 && selectableOptions.every(opt => props.modelValue.includes(opt.value))
})

function selectAll() {
  const selectableValues = filteredOptions.value
    .filter(opt => !opt.disabled)
    .map(opt => opt.value)

  const maxToSelect = props.max === Infinity ? selectableValues.length : props.max
  const newValues = [...new Set([...props.modelValue, ...selectableValues])].slice(0, maxToSelect)
  emit('update:modelValue', newValues)
}

function toggleSelectAll() {
  if (allSelected.value) {
    clearAll()
  } else {
    selectAll()
  }
}

function handleSearch(e: Event) {
  const target = e.target as HTMLInputElement
  searchQuery.value = target.value
}
</script>

<template>
  <div
    v-click-outside="closeDropdown"
    class="relative w-full"
  >
    <label
      v-if="label"
      class="block text-sm font-medium mb-2 text-[var(--neu-text)]"
    >
      {{ label }}
    </label>

    <!-- Trigger -->
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'neu-multiselect-trigger w-full rounded-xl text-left transition-all duration-200 px-3 py-2',
        'bg-[var(--neu-bg)]',
        sizeClasses[size],
        {
          'is-open': isOpen,
          'opacity-50 cursor-not-allowed': disabled,
          'ring-2 ring-[var(--neu-danger)]': error
        }
      ]"
      @click="toggleDropdown"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex-1 flex flex-wrap gap-1.5">
          <!-- Show "X selected" when too many -->
          <span
            v-if="selectedOptions.length > maxDisplay"
            :class="[
              'neu-tag inline-flex items-center gap-1 rounded-lg',
              'bg-[var(--neu-bg)] text-[var(--neu-text)]',
              tagSizeClasses[size]
            ]"
          >
            {{ selectedOptions.length }} selected
          </span>

          <!-- Selected Tags (when within limit) -->
          <template v-else>
            <span
              v-for="option in selectedOptions"
              :key="option.value"
              :class="[
                'neu-tag inline-flex items-center gap-1 rounded-lg',
                'bg-[var(--neu-bg)] text-[var(--neu-text)]',
                tagSizeClasses[size]
              ]"
              @click.stop
            >
              {{ option.label }}
              <button
                type="button"
                class="hover:text-[var(--neu-danger)] transition-colors"
                @click.stop="removeOption(option.value)"
              >
                <svg
                  class="w-3 h-3"
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
            </span>
          </template>

          <!-- Placeholder -->
          <span
            v-if="selectedOptions.length === 0"
            class="text-[var(--neu-text-muted)]"
          >
            {{ placeholder }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Clear All -->
          <button
            v-if="selectedOptions.length > 0"
            type="button"
            class="text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] transition-colors"
            @click.stop="clearAll"
          >
            <svg
              class="w-4 h-4"
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

          <!-- Chevron -->
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
      </div>
    </button>

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
        v-if="isOpen"
        class="neu-dropdown absolute z-50 mt-2 w-full rounded-xl bg-[var(--neu-bg)] p-2"
      >
        <!-- Search Input -->
        <div
          v-if="searchable"
          class="mb-2"
        >
          <div class="neu-search-box flex items-center rounded-lg bg-[var(--neu-bg)] px-3 py-2">
            <svg
              class="w-4 h-4 text-[var(--neu-text-muted)] mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              :value="searchQuery"
              placeholder="Search..."
              class="flex-1 bg-transparent border-none outline-none text-sm text-[var(--neu-text)]"
              @input="handleSearch"
            />
          </div>
        </div>

        <!-- Select All / Clear All -->
        <button
          type="button"
          class="w-full px-3 py-2 text-left rounded-lg transition-all duration-150 flex items-center gap-3 text-[var(--neu-primary)] hover:bg-[var(--neu-bg-secondary)] mb-1"
          @click="toggleSelectAll"
        >
          <span
            :class="[
              'neu-checkbox w-5 h-5 rounded flex items-center justify-center transition-all',
              { 'is-checked': allSelected }
            ]"
          >
            <svg
              v-if="allSelected"
              class="w-3 h-3 text-white"
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
          <span class="font-medium">
            {{ allSelected ? 'Clear All' : 'Select All' }}
          </span>
        </button>

        <!-- Options -->
        <div class="max-h-56 overflow-auto neu-scrollbar space-y-1">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            :disabled="option.disabled || (!isSelected(option.value) && !canSelectMore)"
            :class="[
              'neu-option w-full px-3 py-2 text-left rounded-lg transition-all duration-150 flex items-center gap-3',
              {
                'is-selected': isSelected(option.value),
                'opacity-50 cursor-not-allowed': option.disabled || (!isSelected(option.value) && !canSelectMore)
              }
            ]"
            @click="toggleOption(option)"
          >
            <!-- Checkbox -->
            <span
              :class="[
                'neu-checkbox w-5 h-5 rounded flex items-center justify-center transition-all',
                { 'is-checked': isSelected(option.value) }
              ]"
            >
              <svg
                v-if="isSelected(option.value)"
                class="w-3 h-3 text-white"
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
            <span :class="{ 'font-medium': isSelected(option.value) }">
              {{ option.label }}
            </span>
          </button>

          <!-- No Results -->
          <div
            v-if="filteredOptions.length === 0"
            class="px-3 py-4 text-center text-[var(--neu-text-muted)]"
          >
            No results found
          </div>
        </div>

        <!-- Footer -->
        <div
          v-if="max !== Infinity"
          class="mt-2 pt-2 border-t border-[var(--neu-shadow-dark)]/10 text-xs text-[var(--neu-text-muted)] text-center"
        >
          {{ modelValue.length }} / {{ max }} selected
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
.neu-multiselect-trigger {
  box-shadow: var(--neu-shadow-flat);
}

.neu-multiselect-trigger.is-open {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-tag {
  box-shadow: var(--neu-shadow-small);
}

.neu-dropdown {
  box-shadow: var(--neu-shadow-flat);
}

.neu-search-box {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-option {
  color: var(--neu-text);
}

.neu-option:hover:not(.is-selected):not(:disabled) {
  background: var(--neu-bg-secondary);
}

.neu-option.is-selected {
  background: var(--neu-bg-secondary);
  color: var(--neu-primary);
}

.neu-checkbox {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-small);
}

.neu-checkbox.is-checked {
  background: var(--neu-primary);
  box-shadow: var(--neu-shadow-small-pressed);
}
</style>
