<script setup lang="ts">
interface Props {
  showSearch?: boolean
  showExport?: boolean
  showImport?: boolean
  showBulkDelete?: boolean
  selectedCount?: number
  searchValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  showExport: true,
  showImport: true,
  showBulkDelete: true,
  selectedCount: 0,
  searchValue: ''
})

const emit = defineEmits<{
  search: [value: string]
  export: []
  import: []
  'bulk-delete': []
}>()

const localSearchValue = ref(props.searchValue)

// Sync local search value with prop
watch(() => props.searchValue, (newVal) => {
  localSearchValue.value = newVal
})

function handleSearchInput(e: Event) {
  const target = e.target as HTMLInputElement
  localSearchValue.value = target.value
  emit('search', target.value)
}

function handleClearSearch() {
  localSearchValue.value = ''
  emit('search', '')
}
</script>

<template>
  <div class="neu-table-toolbar">
    <!-- Left side: Search -->
    <div class="neu-toolbar-left">
      <div
        v-if="showSearch"
        class="neu-toolbar-search"
      >
        <div class="neu-search-icon">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          :value="localSearchValue"
          placeholder="Search..."
          class="neu-toolbar-search-input"
          @input="handleSearchInput"
        />
        <button
          v-if="localSearchValue"
          type="button"
          class="neu-search-clear"
          @click="handleClearSearch"
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
      </div>
    </div>

    <!-- Right side: Actions -->
    <div class="neu-toolbar-right">
      <!-- Custom actions slot -->
      <slot name="actions" />

      <!-- Export button -->
      <button
        v-if="showExport"
        type="button"
        class="neu-toolbar-btn"
        title="Export"
        @click="emit('export')"
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span class="neu-btn-label">Export</span>
      </button>

      <!-- Import button -->
      <button
        v-if="showImport"
        type="button"
        class="neu-toolbar-btn"
        title="Import"
        @click="emit('import')"
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
        <span class="neu-btn-label">Import</span>
      </button>

      <!-- Bulk Delete button (shown when items are selected) -->
      <button
        v-if="showBulkDelete && selectedCount > 0"
        type="button"
        class="neu-toolbar-btn neu-toolbar-btn-danger"
        title="Delete Selected"
        @click="emit('bulk-delete')"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span class="neu-btn-label">Delete ({{ selectedCount }})</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.neu-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--neu-bg-secondary);
  border-radius: 0.75rem 0.75rem 0 0;
  box-shadow: var(--neu-shadow-flat);
}

.neu-toolbar-left {
  flex: 1;
  min-width: 0;
}

.neu-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Search Input */
.neu-toolbar-search {
  display: flex;
  align-items: center;
  max-width: 320px;
  background: var(--neu-bg);
  border-radius: 0.625rem;
  box-shadow: var(--neu-shadow-pressed);
  transition: all 0.2s ease;
}

.neu-toolbar-search:focus-within {
  box-shadow: var(--neu-shadow-pressed), 0 0 0 2px var(--neu-primary);
}

.neu-search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0.75rem;
  color: var(--neu-text-muted);
}

.neu-toolbar-search-input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: var(--neu-text);
}

.neu-toolbar-search-input::placeholder {
  color: var(--neu-text-muted);
}

.neu-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: var(--neu-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.neu-search-clear:hover {
  color: var(--neu-text);
}

/* Toolbar Buttons */
.neu-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--neu-text);
  background: var(--neu-bg);
  border: none;
  border-radius: 0.625rem;
  box-shadow: var(--neu-shadow-flat);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.neu-toolbar-btn:hover {
  background: var(--neu-bg-secondary);
  box-shadow: var(--neu-shadow-raised);
}

.neu-toolbar-btn:active {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-toolbar-btn-danger {
  color: var(--neu-danger);
}

.neu-toolbar-btn-danger:hover {
  background: color-mix(in srgb, var(--neu-danger) 10%, var(--neu-bg) 90%);
}

.neu-btn-label {
  display: none;
}

/* Show labels on larger screens */
@media (min-width: 640px) {
  .neu-btn-label {
    display: inline;
  }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .neu-table-toolbar {
    flex-wrap: wrap;
  }

  .neu-toolbar-left {
    flex: 1 1 100%;
    order: 2;
    margin-top: 0.5rem;
  }

  .neu-toolbar-right {
    flex: 1 1 100%;
    order: 1;
    justify-content: flex-end;
  }

  .neu-toolbar-search {
    max-width: none;
  }
}
</style>
