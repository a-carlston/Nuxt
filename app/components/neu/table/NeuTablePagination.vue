<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => [10, 25, 50, 100]
})

const emit = defineEmits<{
  'page-change': [page: number]
  'page-size-change': [pageSize: number]
}>()

const pageInput = ref(props.page.toString())

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const startItem = computed(() => {
  if (props.total === 0) return 0
  return (props.page - 1) * props.pageSize + 1
})

const endItem = computed(() => Math.min(props.page * props.pageSize, props.total))

const isFirstPage = computed(() => props.page <= 1)
const isLastPage = computed(() => props.page >= totalPages.value)

// Sync pageInput when page prop changes
watch(() => props.page, (newPage) => {
  pageInput.value = newPage.toString()
})

function goToFirst() {
  if (!isFirstPage.value) {
    emit('page-change', 1)
  }
}

function goToPrev() {
  if (!isFirstPage.value) {
    emit('page-change', props.page - 1)
  }
}

function goToNext() {
  if (!isLastPage.value) {
    emit('page-change', props.page + 1)
  }
}

function goToLast() {
  if (!isLastPage.value) {
    emit('page-change', totalPages.value)
  }
}

function handlePageInput(event: Event) {
  const input = event.target as HTMLInputElement
  const value = parseInt(input.value, 10)

  if (!isNaN(value) && value >= 1 && value <= totalPages.value) {
    emit('page-change', value)
  } else {
    // Reset to current page if invalid
    pageInput.value = props.page.toString()
  }
}

function handlePageSizeChange(event: Event) {
  const select = event.target as HTMLSelectElement
  const newSize = parseInt(select.value, 10)
  emit('page-size-change', newSize)
}
</script>

<template>
  <div class="neu-pagination flex flex-wrap items-center justify-between gap-4 px-4 py-3">
    <!-- Page info (left) -->
    <div class="text-sm text-[var(--neu-text-muted)] whitespace-nowrap">
      Showing {{ startItem }}-{{ endItem }} of {{ total }} items
    </div>

    <!-- Page size selector (center) -->
    <div class="flex items-center gap-2">
      <label class="text-sm text-[var(--neu-text-muted)]">Show</label>
      <select
        :value="pageSize"
        class="neu-pagination-select px-2 py-1 text-sm rounded-lg bg-[var(--neu-bg)] text-[var(--neu-text)] outline-none cursor-pointer"
        @change="handlePageSizeChange"
      >
        <option
          v-for="size in pageSizeOptions"
          :key="size"
          :value="size"
        >
          {{ size }}
        </option>
      </select>
    </div>

    <!-- Navigation buttons (right) -->
    <div class="flex items-center gap-2">
      <!-- First page -->
      <button
        type="button"
        class="neu-pagination-btn"
        :disabled="isFirstPage"
        :class="{ 'opacity-40 cursor-not-allowed': isFirstPage }"
        title="First page"
        @click="goToFirst"
      >
        &laquo;
      </button>

      <!-- Previous page -->
      <button
        type="button"
        class="neu-pagination-btn"
        :disabled="isFirstPage"
        :class="{ 'opacity-40 cursor-not-allowed': isFirstPage }"
        title="Previous page"
        @click="goToPrev"
      >
        &lsaquo;
      </button>

      <!-- Page input -->
      <div class="flex items-center gap-1.5 text-sm text-[var(--neu-text)]">
        <input
          v-model="pageInput"
          type="text"
          class="neu-pagination-input w-12 px-2 py-1 text-center rounded-lg bg-[var(--neu-bg)] text-[var(--neu-text)] outline-none"
          @keydown.enter="handlePageInput"
          @blur="handlePageInput"
        />
        <span class="text-[var(--neu-text-muted)]">of {{ totalPages }}</span>
      </div>

      <!-- Next page -->
      <button
        type="button"
        class="neu-pagination-btn"
        :disabled="isLastPage"
        :class="{ 'opacity-40 cursor-not-allowed': isLastPage }"
        title="Next page"
        @click="goToNext"
      >
        &rsaquo;
      </button>

      <!-- Last page -->
      <button
        type="button"
        class="neu-pagination-btn"
        :disabled="isLastPage"
        :class="{ 'opacity-40 cursor-not-allowed': isLastPage }"
        title="Last page"
        @click="goToLast"
      >
        &raquo;
      </button>
    </div>
  </div>
</template>

<style scoped>
.neu-pagination {
  background: var(--neu-bg);
  border-radius: 12px;
  box-shadow: var(--neu-shadow-flat);
}

.neu-pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 1rem;
  font-weight: 500;
  color: var(--neu-text);
  background: var(--neu-bg);
  border: none;
  border-radius: 8px;
  box-shadow: var(--neu-shadow-small);
  cursor: pointer;
  transition: all 0.2s ease;
}

.neu-pagination-btn:hover:not(:disabled) {
  box-shadow: var(--neu-shadow-small-pressed);
}

.neu-pagination-btn:active:not(:disabled) {
  box-shadow: var(--neu-shadow-small-pressed);
}

.neu-pagination-select {
  box-shadow: var(--neu-shadow-small);
  border: none;
  appearance: auto;
}

.neu-pagination-select:focus {
  box-shadow: var(--neu-shadow-small-pressed);
}

.neu-pagination-input {
  box-shadow: var(--neu-shadow-small-pressed);
  border: none;
}

.neu-pagination-input:focus {
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
              inset -1px -1px 4px var(--neu-shadow-light),
              0 0 0 2px var(--neu-primary);
}
</style>
