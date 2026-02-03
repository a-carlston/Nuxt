<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { TableColumn, SelectOption } from '~/types/table'

interface Props {
  value: unknown
  column: TableColumn
  isEditing?: boolean
  isPendingEdit?: boolean
  isPendingDelete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  isPendingEdit: false,
  isPendingDelete: false
})

const emit = defineEmits<{
  'update:value': [value: unknown]
  'start-edit': []
  'cancel-edit': []
  'save-edit': []
}>()

const editValue = ref<unknown>(props.value)
const inputRef = ref<HTMLInputElement | HTMLSelectElement | null>(null)
const isSelectOpen = ref(false)

// Sync editValue when value prop changes or entering edit mode
watch(() => props.value, (newVal) => {
  if (!props.isEditing) {
    editValue.value = newVal
  }
})

watch(() => props.isEditing, (editing) => {
  if (editing) {
    editValue.value = props.value
    nextTick(() => {
      inputRef.value?.focus()
      if (inputRef.value instanceof HTMLInputElement) {
        inputRef.value.select()
      }
    })
  }
})

// Computed properties for display formatting
const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return props.column.placeholder || '-'
  }

  const type = props.column.type || 'text'

  // Use custom format function if provided
  if (typeof props.column.format === 'function') {
    return props.column.format(props.value, {} as any)
  }

  switch (type) {
    case 'date':
      return formatDate(props.value)
    case 'datetime':
      return formatDateTime(props.value)
    case 'number':
      return formatNumber(props.value)
    case 'currency':
      return formatCurrency(props.value)
    case 'boolean':
      return props.value ? 'Yes' : 'No'
    case 'select':
    case 'badge':
      return getOptionLabel(props.value)
    case 'email':
    case 'phone':
    case 'url':
    case 'text':
    default:
      return String(props.value)
  }
})

const badgeVariant = computed(() => {
  const val = String(props.value).toLowerCase()

  // Check if column has options with color defined
  if (props.column.options) {
    const option = props.column.options.find(opt => opt.value === props.value)
    if (option?.color) {
      return option.color
    }
  }

  // Default status mappings
  if (val === 'active' || val === 'success' || val === 'completed' || val === 'approved') {
    return 'success'
  }
  if (val === 'invited' || val === 'pending' || val === 'warning' || val === 'review') {
    return 'warning'
  }
  if (val === 'inactive' || val === 'danger' || val === 'error' || val === 'rejected' || val === 'deleted') {
    return 'danger'
  }
  return 'default'
})

const inputType = computed(() => {
  const type = props.column.type || 'text'
  switch (type) {
    case 'number':
    case 'currency':
      return 'number'
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    case 'url':
      return 'url'
    case 'date':
      return 'date'
    case 'datetime':
      return 'datetime-local'
    default:
      return 'text'
  }
})

// Helper functions
function formatDate(value: unknown): string {
  if (!value) return '-'
  try {
    const date = new Date(value as string)
    return date.toLocaleDateString()
  } catch {
    return String(value)
  }
}

function formatDateTime(value: unknown): string {
  if (!value) return '-'
  try {
    const date = new Date(value as string)
    return date.toLocaleString()
  } catch {
    return String(value)
  }
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return '-'
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return num.toLocaleString()
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '-'
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num)
}

function getOptionLabel(value: unknown): string {
  if (!props.column.options) return String(value)
  const option = props.column.options.find(opt => opt.value === value)
  return option?.label || String(value)
}

// Event handlers
function handleDoubleClick() {
  if (props.column.editable !== false) {
    emit('start-edit')
  }
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  const type = props.column.type || 'text'

  if (type === 'number' || type === 'currency') {
    editValue.value = target.value ? Number(target.value) : null
  } else if (type === 'boolean') {
    editValue.value = (target as HTMLInputElement).checked
  } else {
    editValue.value = target.value
  }

  emit('update:value', editValue.value)
}

function handleSelectChange(option: SelectOption) {
  editValue.value = option.value
  emit('update:value', editValue.value)
  isSelectOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('save-edit')
  } else if (e.key === 'Escape') {
    e.preventDefault()
    editValue.value = props.value
    emit('cancel-edit')
  }
}

function toggleSelect() {
  isSelectOpen.value = !isSelectOpen.value
}

function closeSelect() {
  isSelectOpen.value = false
}
</script>

<template>
  <div
    :class="[
      'neu-table-cell relative',
      {
        'is-pending-edit': isPendingEdit && !isEditing,
        'is-pending-delete': isPendingDelete,
        'is-editing': isEditing
      }
    ]"
    @dblclick="handleDoubleClick"
  >
    <!-- Edit Mode -->
    <template v-if="isEditing">
      <!-- Select/Badge Type - Custom Dropdown -->
      <div
        v-if="column.type === 'select' || column.type === 'badge'"
        v-click-outside="closeSelect"
        class="relative"
      >
        <button
          type="button"
          class="neu-cell-select w-full text-left px-2 py-1 rounded-lg"
          @click="toggleSelect"
          @keydown="handleKeydown"
        >
          <span v-if="editValue !== null && editValue !== undefined">
            {{ getOptionLabel(editValue) }}
          </span>
          <span v-else class="text-[var(--neu-text-muted)]">
            {{ column.placeholder || 'Select...' }}
          </span>
          <svg
            :class="[
              'absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neu-text-muted)] transition-transform',
              { 'rotate-180': isSelectOpen }
            ]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="isSelectOpen"
            class="neu-cell-dropdown absolute z-50 mt-1 w-full min-w-[120px] rounded-lg bg-[var(--neu-bg)] p-1"
          >
            <button
              v-for="option in column.options"
              :key="String(option.value)"
              type="button"
              :class="[
                'w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors',
                option.value === editValue
                  ? 'bg-[var(--neu-primary)] text-white'
                  : 'text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)]'
              ]"
              @click="handleSelectChange(option)"
            >
              {{ option.label }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Boolean Type - Checkbox -->
      <label
        v-else-if="column.type === 'boolean'"
        class="flex items-center justify-center cursor-pointer"
      >
        <input
          ref="inputRef"
          type="checkbox"
          :checked="Boolean(editValue)"
          class="neu-cell-checkbox"
          @change="handleInput"
          @keydown="handleKeydown"
        />
      </label>

      <!-- Text/Number/Date Types - Input -->
      <input
        v-else
        ref="inputRef"
        :type="inputType"
        :value="editValue"
        :placeholder="column.placeholder"
        class="neu-cell-input w-full px-2 py-1 rounded-lg text-sm"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="$emit('save-edit')"
      />
    </template>

    <!-- Display Mode -->
    <template v-else>
      <!-- Badge Type -->
      <span
        v-if="column.type === 'badge'"
        :class="[
          'neu-cell-badge inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          `variant-${badgeVariant}`
        ]"
      >
        {{ displayValue }}
      </span>

      <!-- Email Type -->
      <a
        v-else-if="column.type === 'email' && value"
        :href="`mailto:${value}`"
        class="text-[var(--neu-primary)] hover:underline"
      >
        {{ displayValue }}
      </a>

      <!-- Phone Type -->
      <a
        v-else-if="column.type === 'phone' && value"
        :href="`tel:${value}`"
        class="text-[var(--neu-primary)] hover:underline"
      >
        {{ displayValue }}
      </a>

      <!-- URL Type -->
      <a
        v-else-if="column.type === 'url' && value"
        :href="String(value)"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[var(--neu-primary)] hover:underline"
      >
        {{ displayValue }}
      </a>

      <!-- Boolean Type -->
      <span
        v-else-if="column.type === 'boolean'"
        :class="[
          'inline-flex items-center justify-center w-5 h-5 rounded',
          value ? 'bg-[var(--neu-success)] text-white' : 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)]'
        ]"
      >
        <svg v-if="value" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>

      <!-- Default Text Display -->
      <span
        v-else
        :class="[
          'cell-text',
          { 'text-[var(--neu-text-muted)]': !value && value !== 0 }
        ]"
      >
        {{ displayValue }}
      </span>
    </template>

    <!-- Pending Edit Indicator -->
    <span
      v-if="isPendingEdit && !isEditing"
      class="pending-indicator absolute top-0 right-0 w-2 h-2 rounded-full bg-[var(--neu-warning)]"
      title="Pending changes"
    />
  </div>
</template>

<style scoped>
.neu-table-cell {
  padding: 0.5rem 0.75rem;
  color: var(--neu-text);
  transition: all 0.2s ease;
}

.neu-table-cell.is-pending-edit {
  background: color-mix(in srgb, var(--neu-warning) 10%, transparent);
  border-left: 2px solid var(--neu-warning);
}

.neu-table-cell.is-pending-delete {
  opacity: 0.5;
  background: color-mix(in srgb, var(--neu-danger) 10%, transparent);
  text-decoration: line-through;
}

.neu-table-cell.is-editing {
  padding: 0.25rem 0.5rem;
}

.neu-cell-input {
  background: var(--neu-bg);
  color: var(--neu-text);
  border: none;
  outline: none;
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
              inset -2px -2px 4px var(--neu-shadow-light);
}

.neu-cell-input:focus {
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
              inset -2px -2px 4px var(--neu-shadow-light),
              0 0 0 2px var(--neu-primary);
}

.neu-cell-input::placeholder {
  color: var(--neu-text-muted);
}

.neu-cell-select {
  background: var(--neu-bg);
  color: var(--neu-text);
  border: none;
  outline: none;
  box-shadow: var(--neu-shadow-flat);
  padding-right: 2rem;
}

.neu-cell-select:focus {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-cell-dropdown {
  box-shadow: var(--neu-shadow-flat);
}

.neu-cell-checkbox {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.375rem;
  background: var(--neu-bg);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
              inset -2px -2px 4px var(--neu-shadow-light);
  cursor: pointer;
  position: relative;
}

.neu-cell-checkbox:checked {
  background: var(--neu-primary);
  box-shadow: var(--neu-shadow-small);
}

.neu-cell-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 0.35rem;
  height: 0.6rem;
  border: solid white;
  border-width: 0 2px 2px 0;
}

.neu-cell-checkbox:focus {
  outline: none;
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
              inset -2px -2px 4px var(--neu-shadow-light),
              0 0 0 2px var(--neu-primary);
}

.neu-cell-badge {
  box-shadow: var(--neu-shadow-small);
}

.neu-cell-badge.variant-default {
  background: var(--neu-bg-secondary);
  color: var(--neu-text);
}

.neu-cell-badge.variant-primary {
  background: var(--neu-primary);
  color: white;
}

.neu-cell-badge.variant-success {
  background: var(--neu-success);
  color: white;
}

.neu-cell-badge.variant-warning {
  background: var(--neu-warning);
  color: white;
}

.neu-cell-badge.variant-danger {
  background: var(--neu-danger);
  color: white;
}

.pending-indicator {
  box-shadow: 0 0 4px var(--neu-warning);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.cell-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
