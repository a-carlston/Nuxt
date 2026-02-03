<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableColumn } from '~/types/table'

interface Props {
  isOpen: boolean
  columns: TableColumn[]
  totalRows: number
}

interface ExportOptions {
  format: 'csv' | 'xlsx'
  columns: string[]
  scope: 'all' | 'filtered'
  includeHeaders: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  export: [options: ExportOptions]
}>()

// Export format
const format = ref<'csv' | 'xlsx'>('csv')

// Selected columns (column ids)
const selectedColumns = ref<string[]>([])

// Export scope
const scope = ref<'all' | 'filtered'>('all')

// Include headers toggle
const includeHeaders = ref(true)

// Initialize selected columns when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      // Select all columns by default
      selectedColumns.value = props.columns.map(col => col.id)
    }
  },
  { immediate: true }
)

// Computed: All columns selected
const allColumnsSelected = computed(() => {
  return selectedColumns.value.length === props.columns.length
})

// Computed: No columns selected
const noColumnsSelected = computed(() => {
  return selectedColumns.value.length === 0
})

// Toggle a single column
function toggleColumn(columnId: string) {
  const index = selectedColumns.value.indexOf(columnId)
  if (index === -1) {
    selectedColumns.value.push(columnId)
  } else {
    selectedColumns.value.splice(index, 1)
  }
}

// Select all columns
function selectAllColumns() {
  selectedColumns.value = props.columns.map(col => col.id)
}

// Deselect all columns
function selectNoneColumns() {
  selectedColumns.value = []
}

// Handle close
function handleClose() {
  emit('close')
}

// Handle export
function handleExport() {
  emit('export', {
    format: format.value,
    columns: selectedColumns.value,
    scope: scope.value,
    includeHeaders: includeHeaders.value
  })
}

// Keyboard escape handler
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

// Body scroll lock
watch(
  () => props.isOpen,
  (isOpen) => {
    if (import.meta.client) {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', handleKeydown)
      } else {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleKeydown)
      }
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- Modal -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            class="relative w-full max-w-md rounded-2xl bg-[var(--neu-bg)] shadow-[var(--neu-shadow-flat)]"
          >
            <!-- Header -->
            <div class="flex items-center justify-between p-5 border-b border-[var(--neu-shadow-dark)]/10">
              <h3 class="text-lg font-semibold text-[var(--neu-text)]">
                Export Data
              </h3>
              <button
                type="button"
                class="p-2 rounded-lg text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors"
                @click="handleClose"
              >
                <svg
                  class="w-5 h-5"
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

            <!-- Body -->
            <div class="p-5 space-y-6">
              <!-- Export Format -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-[var(--neu-text)]">
                  Export Format
                </label>
                <div class="flex gap-4">
                  <label
                    class="inline-flex items-center gap-3 cursor-pointer"
                  >
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="format === 'csv'"
                      :class="[
                        'relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200',
                        format === 'csv'
                          ? 'bg-[var(--neu-primary)] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                          : 'bg-[var(--neu-bg)] shadow-[var(--neu-shadow-small)]'
                      ]"
                      @click="format = 'csv'"
                    >
                      <span
                        v-if="format === 'csv'"
                        class="w-2.5 h-2.5 rounded-full bg-white"
                      />
                    </button>
                    <span class="text-[var(--neu-text)]">CSV</span>
                  </label>
                  <label
                    class="inline-flex items-center gap-3 cursor-pointer"
                  >
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="format === 'xlsx'"
                      :class="[
                        'relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200',
                        format === 'xlsx'
                          ? 'bg-[var(--neu-primary)] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                          : 'bg-[var(--neu-bg)] shadow-[var(--neu-shadow-small)]'
                      ]"
                      @click="format = 'xlsx'"
                    >
                      <span
                        v-if="format === 'xlsx'"
                        class="w-2.5 h-2.5 rounded-full bg-white"
                      />
                    </button>
                    <span class="text-[var(--neu-text)]">XLSX (Excel)</span>
                  </label>
                </div>
              </div>

              <!-- Column Selection -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-medium text-[var(--neu-text)]">
                    Columns to Export
                  </label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="text-xs text-[var(--neu-primary)] hover:underline"
                      @click="selectAllColumns"
                    >
                      Select All
                    </button>
                    <span class="text-[var(--neu-text-muted)]">|</span>
                    <button
                      type="button"
                      class="text-xs text-[var(--neu-primary)] hover:underline"
                      @click="selectNoneColumns"
                    >
                      Select None
                    </button>
                  </div>
                </div>
                <div class="neu-column-list max-h-48 overflow-y-auto rounded-xl p-3 space-y-2">
                  <label
                    v-for="column in columns"
                    :key="column.id"
                    class="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedColumns.includes(column.id)"
                      class="sr-only peer"
                      @change="toggleColumn(column.id)"
                    />
                    <span
                      :class="[
                        'neu-checkbox-box w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0',
                        selectedColumns.includes(column.id) ? 'is-checked' : ''
                      ]"
                    >
                      <svg
                        v-if="selectedColumns.includes(column.id)"
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
                    <span class="text-sm text-[var(--neu-text)]">{{ column.label }}</span>
                  </label>
                </div>
                <p class="text-xs text-[var(--neu-text-muted)]">
                  {{ selectedColumns.length }} of {{ columns.length }} columns selected
                </p>
              </div>

              <!-- Export Scope -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-[var(--neu-text)]">
                  Export Scope
                </label>
                <div class="flex gap-4">
                  <label
                    class="inline-flex items-center gap-3 cursor-pointer"
                  >
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="scope === 'all'"
                      :class="[
                        'relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200',
                        scope === 'all'
                          ? 'bg-[var(--neu-primary)] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                          : 'bg-[var(--neu-bg)] shadow-[var(--neu-shadow-small)]'
                      ]"
                      @click="scope = 'all'"
                    >
                      <span
                        v-if="scope === 'all'"
                        class="w-2.5 h-2.5 rounded-full bg-white"
                      />
                    </button>
                    <span class="text-[var(--neu-text)]">All rows ({{ totalRows }})</span>
                  </label>
                  <label
                    class="inline-flex items-center gap-3 cursor-pointer"
                  >
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="scope === 'filtered'"
                      :class="[
                        'relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200',
                        scope === 'filtered'
                          ? 'bg-[var(--neu-primary)] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                          : 'bg-[var(--neu-bg)] shadow-[var(--neu-shadow-small)]'
                      ]"
                      @click="scope = 'filtered'"
                    >
                      <span
                        v-if="scope === 'filtered'"
                        class="w-2.5 h-2.5 rounded-full bg-white"
                      />
                    </button>
                    <span class="text-[var(--neu-text)]">Current view</span>
                  </label>
                </div>
              </div>

              <!-- Include Headers Toggle -->
              <div class="space-y-3">
                <label
                  class="inline-flex items-center gap-3 cursor-pointer"
                >
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="includeHeaders"
                    :class="[
                      'neu-toggle-track relative w-12 h-6 rounded-full transition-all duration-200',
                      { 'is-active': includeHeaders }
                    ]"
                    @click="includeHeaders = !includeHeaders"
                  >
                    <span
                      :class="[
                        'neu-toggle-thumb absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200',
                        { 'translate-x-6': includeHeaders }
                      ]"
                    />
                  </button>
                  <span class="text-sm text-[var(--neu-text)]">Include column headers</span>
                </label>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-5 border-t border-[var(--neu-shadow-dark)]/10 flex justify-end gap-3">
              <button
                type="button"
                class="neu-btn px-4 py-2.5 text-base font-medium rounded-xl transition-all duration-200"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="noColumnsSelected"
                :class="[
                  'neu-btn neu-btn-primary px-4 py-2.5 text-base font-medium rounded-xl transition-all duration-200 inline-flex items-center gap-2',
                  { 'opacity-50 cursor-not-allowed': noColumnsSelected }
                ]"
                @click="handleExport"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.neu-column-list {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
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
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.neu-toggle-track {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-toggle-track.is-active {
  background: var(--neu-primary);
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.neu-toggle-thumb {
  background: white;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.neu-btn {
  background: var(--neu-bg);
  color: var(--neu-text);
  box-shadow: var(--neu-shadow-small);
}

.neu-btn:hover:not(:disabled) {
  box-shadow: var(--neu-shadow-flat);
}

.neu-btn:active:not(:disabled) {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-btn-primary {
  background: var(--neu-primary);
  color: white;
  box-shadow:
    4px 4px 8px color-mix(in srgb, var(--neu-primary) 50%, black 30%),
    -2px -2px 6px color-mix(in srgb, var(--neu-primary) 50%, white 30%);
}

.neu-btn-primary:hover:not(:disabled) {
  box-shadow:
    6px 6px 12px color-mix(in srgb, var(--neu-primary) 50%, black 30%),
    -3px -3px 8px color-mix(in srgb, var(--neu-primary) 50%, white 30%);
}

.neu-btn-primary:active:not(:disabled) {
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
