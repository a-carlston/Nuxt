<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableColumn, ImportedChange, ImportAction } from '~/types/table'

interface Props {
  /** Whether the modal is open */
  isOpen: boolean
  /** Column definitions for mapping */
  columns: TableColumn[]
}

interface ParsedRow {
  _action?: ImportAction
  [key: string]: unknown
}

interface ColumnMapping {
  csvColumn: string
  tableColumn: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Emitted when modal is closed */
  close: []
  /** Emitted when import is confirmed with parsed data */
  import: [data: ImportedChange[]]
}>()

// State
const isDragging = ref(false)
const file = ref<File | null>(null)
const fileError = ref<string | null>(null)
const isProcessing = ref(false)
const csvHeaders = ref<string[]>([])
const csvData = ref<ParsedRow[]>([])
const columnMappings = ref<ColumnMapping[]>([])

// Computed
const previewRows = computed(() => csvData.value.slice(0, 10))

const hasData = computed(() => csvData.value.length > 0)

const totalRows = computed(() => csvData.value.length)

const editCount = computed(() => {
  return csvData.value.filter(row => row._action === 'edit' || !row._action).length
})

const deleteCount = computed(() => {
  return csvData.value.filter(row => row._action === 'delete').length
})

const mappedColumns = computed(() => {
  return columnMappings.value.filter(m => m.tableColumn !== null)
})

const unmappedRequired = computed(() => {
  const mappedFields = new Set(columnMappings.value.map(m => m.tableColumn).filter(Boolean))
  return props.columns.filter(col => col.required && !mappedFields.has(col.field))
})

const isValid = computed(() => {
  return hasData.value && unmappedRequired.value.length === 0 && !fileError.value
})

const availableTableColumns = computed(() => {
  const mapped = new Set(columnMappings.value.map(m => m.tableColumn).filter(Boolean))
  return props.columns.filter(col => !mapped.has(col.field))
})

// Methods
function handleClose() {
  resetState()
  emit('close')
}

function resetState() {
  file.value = null
  fileError.value = null
  isProcessing.value = false
  csvHeaders.value = []
  csvData.value = []
  columnMappings.value = []
  isDragging.value = false
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false

  const files = e.dataTransfer?.files
  const firstFile = files?.[0]
  if (firstFile) {
    processFile(firstFile)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const firstFile = input.files?.[0]
  if (firstFile) {
    processFile(firstFile)
  }
}

function processFile(selectedFile: File) {
  fileError.value = null

  // Validate file type
  if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
    fileError.value = 'Please select a CSV file'
    return
  }

  // Validate file size (max 10MB)
  if (selectedFile.size > 10 * 1024 * 1024) {
    fileError.value = 'File size must be less than 10MB'
    return
  }

  file.value = selectedFile
  isProcessing.value = true

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const content = event.target?.result as string
      parseCSV(content)
    } catch (err) {
      fileError.value = 'Failed to read file'
      console.error('File read error:', err)
    } finally {
      isProcessing.value = false
    }
  }
  reader.onerror = () => {
    fileError.value = 'Failed to read file'
    isProcessing.value = false
  }
  reader.readAsText(selectedFile)
}

function parseCSV(content: string) {
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  if (lines.length === 0) {
    fileError.value = 'File is empty'
    return
  }

  // Parse header row
  const headerLine = lines[0]
  if (!headerLine) {
    fileError.value = 'File is empty'
    return
  }
  const headers = parseCSVLine(headerLine)
  if (headers.length === 0) {
    fileError.value = 'No columns found in file'
    return
  }

  csvHeaders.value = headers

  // Parse data rows
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = parseCSVLine(line)
    if (values.length === 0) continue

    const row: ParsedRow = {}
    headers.forEach((header, index) => {
      const value = values[index] ?? ''
      if (header.toLowerCase() === '_action') {
        row._action = (value.toLowerCase() === 'delete' ? 'delete' : 'edit') as ImportAction
      } else {
        row[header] = value
      }
    })
    rows.push(row)
  }

  if (rows.length === 0) {
    fileError.value = 'No data rows found in file'
    return
  }

  csvData.value = rows

  // Auto-detect column mappings
  autoDetectMappings()
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  values.push(current.trim())
  return values
}

function autoDetectMappings() {
  const mappings: ColumnMapping[] = []

  csvHeaders.value.forEach(csvHeader => {
    // Skip the _action column
    if (csvHeader.toLowerCase() === '_action') return

    // Try to find a matching table column
    const normalizedCsvHeader = csvHeader.toLowerCase().replace(/[_\s-]/g, '')

    let matchedColumn: TableColumn | undefined

    // Exact match on field
    matchedColumn = props.columns.find(col => col.field === csvHeader)

    // Exact match on label
    if (!matchedColumn) {
      matchedColumn = props.columns.find(col => col.label === csvHeader)
    }

    // Normalized match on field
    if (!matchedColumn) {
      matchedColumn = props.columns.find(col =>
        col.field.toLowerCase().replace(/[_\s-]/g, '') === normalizedCsvHeader
      )
    }

    // Normalized match on label
    if (!matchedColumn) {
      matchedColumn = props.columns.find(col =>
        col.label.toLowerCase().replace(/[_\s-]/g, '') === normalizedCsvHeader
      )
    }

    // Check if this column is already mapped
    const alreadyMapped = mappings.some(m => m.tableColumn === matchedColumn?.field)

    mappings.push({
      csvColumn: csvHeader,
      tableColumn: matchedColumn && !alreadyMapped ? matchedColumn.field : null
    })
  })

  columnMappings.value = mappings
}

function updateMapping(csvColumn: string, tableField: string | null) {
  const mapping = columnMappings.value.find(m => m.csvColumn === csvColumn)
  if (mapping) {
    mapping.tableColumn = tableField
  }
}

function getColumnLabel(field: string): string {
  const column = props.columns.find(col => col.field === field)
  return column?.label || field
}

function getCellValue(row: ParsedRow, csvColumn: string): unknown {
  return row[csvColumn]
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  const str = String(value)
  return str.length > 50 ? str.substring(0, 47) + '...' : str
}

function handleImport() {
  if (!isValid.value) return

  const changes: ImportedChange[] = csvData.value.map((row, index) => {
    const action: ImportAction = row._action || 'edit'
    const changes: Record<string, unknown> = {}
    let rowId: string | number = ''

    columnMappings.value.forEach(mapping => {
      if (mapping.tableColumn) {
        const value = row[mapping.csvColumn]
        if (mapping.tableColumn === 'id') {
          rowId = value as string | number
        } else {
          changes[mapping.tableColumn] = value
        }
      }
    })

    return {
      action,
      rowId,
      changes: action === 'edit' ? changes : undefined,
      sourceData: { ...row },
      lineNumber: index + 2 // +2 because CSV line 1 is header, and we're 0-indexed
    }
  })

  emit('import', changes)
  handleClose()
}

function removeFile() {
  file.value = null
  csvHeaders.value = []
  csvData.value = []
  columnMappings.value = []
  fileError.value = null
}

// Watch for modal close
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    resetState()
  }
})
</script>

<template>
  <NeuModal
    :model-value="isOpen"
    title="Import Data"
    size="xl"
    @update:model-value="!$event && handleClose()"
    @close="handleClose"
  >
    <div class="space-y-6">
      <!-- File Upload Area -->
      <div v-if="!hasData">
        <div
          class="neu-upload-zone"
          :class="{
            'is-dragging': isDragging,
            'has-error': fileError
          }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <input
            type="file"
            accept=".csv"
            class="hidden"
            :id="`file-input-${$.uid}`"
            @change="handleFileSelect"
          />

          <div v-if="isProcessing" class="flex flex-col items-center gap-3">
            <svg
              class="animate-spin w-10 h-10 text-[var(--neu-primary)]"
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
            <span class="text-[var(--neu-text-muted)]">Processing file...</span>
          </div>

          <div v-else class="flex flex-col items-center gap-3">
            <!-- Upload Icon -->
            <div class="neu-upload-icon">
              <svg
                class="w-8 h-8 text-[var(--neu-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div class="text-center">
              <p class="text-[var(--neu-text)] font-medium">
                Drag and drop your CSV file here
              </p>
              <p class="text-sm text-[var(--neu-text-muted)] mt-1">
                or
                <label
                  :for="`file-input-${$.uid}`"
                  class="text-[var(--neu-primary)] cursor-pointer hover:underline"
                >
                  browse to upload
                </label>
              </p>
            </div>

            <p class="text-xs text-[var(--neu-text-muted)]">
              Supported format: CSV (max 10MB)
            </p>
          </div>
        </div>

        <!-- File Error -->
        <p
          v-if="fileError"
          class="mt-2 text-sm text-[var(--neu-danger)] flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {{ fileError }}
        </p>
      </div>

      <!-- Preview Section -->
      <div v-else class="space-y-4">
        <!-- File Info -->
        <div class="neu-file-info">
          <div class="flex items-center gap-3">
            <div class="neu-file-icon">
              <svg
                class="w-5 h-5 text-[var(--neu-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[var(--neu-text)] font-medium truncate">
                {{ file?.name }}
              </p>
              <p class="text-sm text-[var(--neu-text-muted)]">
                {{ totalRows }} rows found
              </p>
            </div>
            <button
              type="button"
              class="p-2 rounded-lg text-[var(--neu-text-muted)] hover:text-[var(--neu-danger)] hover:bg-[var(--neu-bg-secondary)] transition-colors"
              @click="removeFile"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        <!-- Column Mapping -->
        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-[var(--neu-text)]">
            Column Mapping
          </h4>

          <div class="grid gap-2 max-h-48 overflow-y-auto neu-scrollbar pr-2">
            <div
              v-for="mapping in columnMappings"
              :key="mapping.csvColumn"
              class="neu-mapping-row"
            >
              <span class="text-sm text-[var(--neu-text)] truncate">
                {{ mapping.csvColumn }}
              </span>
              <svg
                class="w-4 h-4 text-[var(--neu-text-muted)] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
              <select
                :value="mapping.tableColumn || ''"
                class="neu-mapping-select"
                @change="updateMapping(mapping.csvColumn, ($event.target as HTMLSelectElement).value || null)"
              >
                <option value="">-- Skip column --</option>
                <option
                  v-if="mapping.tableColumn"
                  :value="mapping.tableColumn"
                >
                  {{ getColumnLabel(mapping.tableColumn) }}
                </option>
                <option
                  v-for="col in availableTableColumns"
                  :key="col.field"
                  :value="col.field"
                >
                  {{ col.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Required column warning -->
          <div
            v-if="unmappedRequired.length > 0"
            class="neu-warning"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span class="text-sm">
              Required columns not mapped: {{ unmappedRequired.map(c => c.label).join(', ') }}
            </span>
          </div>
        </div>

        <!-- Preview Table -->
        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-[var(--neu-text)]">
            Preview (first {{ previewRows.length }} rows)
          </h4>

          <div class="neu-preview-table-wrapper">
            <table class="neu-preview-table">
              <thead>
                <tr>
                  <th
                    v-for="mapping in mappedColumns"
                    :key="mapping.csvColumn"
                    class="neu-preview-th"
                  >
                    {{ mapping.tableColumn ? getColumnLabel(mapping.tableColumn) : mapping.csvColumn }}
                  </th>
                  <th v-if="deleteCount > 0" class="neu-preview-th">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in previewRows"
                  :key="index"
                  class="neu-preview-row"
                  :class="{ 'is-delete': row._action === 'delete' }"
                >
                  <td
                    v-for="mapping in mappedColumns"
                    :key="mapping.csvColumn"
                    class="neu-preview-td"
                  >
                    {{ formatCellValue(getCellValue(row, mapping.csvColumn)) }}
                  </td>
                  <td v-if="deleteCount > 0" class="neu-preview-td">
                    <span
                      v-if="row._action === 'delete'"
                      class="text-[var(--neu-danger)] text-xs font-medium"
                    >
                      Delete
                    </span>
                    <span
                      v-else
                      class="text-[var(--neu-text-muted)] text-xs"
                    >
                      Edit
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Import Summary -->
        <div class="neu-summary">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--neu-text-muted)]">Total rows:</span>
              <span class="text-sm font-semibold text-[var(--neu-text)]">{{ totalRows }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--neu-text-muted)]">Edits:</span>
              <span class="text-sm font-semibold text-[var(--neu-primary)]">{{ editCount }}</span>
            </div>
            <div v-if="deleteCount > 0" class="flex items-center gap-2">
              <span class="text-sm text-[var(--neu-text-muted)]">Deletes:</span>
              <span class="text-sm font-semibold text-[var(--neu-danger)]">{{ deleteCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <NeuButton
          variant="ghost"
          @click="handleClose"
        >
          Cancel
        </NeuButton>
        <NeuButton
          variant="primary"
          :disabled="!isValid"
          @click="handleImport"
        >
          Import {{ totalRows }} rows
        </NeuButton>
      </div>
    </template>
  </NeuModal>
</template>

<style scoped>
.neu-upload-zone {
  border: 2px dashed color-mix(in srgb, var(--neu-text-muted) 40%, transparent);
  border-radius: 1rem;
  padding: 2.5rem 1.5rem;
  background: var(--neu-bg-secondary);
  transition: all 0.2s ease;
}

.neu-upload-zone.is-dragging {
  border-color: var(--neu-primary);
  background: color-mix(in srgb, var(--neu-primary) 5%, var(--neu-bg-secondary));
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--neu-primary) 20%, transparent);
}

.neu-upload-zone.has-error {
  border-color: var(--neu-danger);
}

.neu-upload-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-file-info {
  padding: 1rem;
  border-radius: 0.75rem;
  background: var(--neu-bg-secondary);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-file-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-mapping-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--neu-bg-secondary);
}

.neu-mapping-select {
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--neu-bg);
  color: var(--neu-text);
  border: none;
  font-size: 0.875rem;
  box-shadow: var(--neu-shadow-pressed);
  cursor: pointer;
  outline: none;
}

.neu-mapping-select:focus {
  box-shadow: var(--neu-shadow-pressed), 0 0 0 2px var(--neu-primary);
}

.neu-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--neu-warning) 15%, var(--neu-bg));
  color: var(--neu-warning);
}

.neu-preview-table-wrapper {
  overflow-x: auto;
  border-radius: 0.75rem;
  background: var(--neu-bg-secondary);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.neu-preview-th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--neu-text);
  background: var(--neu-bg);
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 20%, transparent);
  white-space: nowrap;
}

.neu-preview-th:first-child {
  border-top-left-radius: 0.75rem;
}

.neu-preview-th:last-child {
  border-top-right-radius: 0.75rem;
}

.neu-preview-td {
  padding: 0.625rem 1rem;
  color: var(--neu-text);
  border-bottom: 1px solid color-mix(in srgb, var(--neu-shadow-dark) 10%, transparent);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.neu-preview-row:last-child .neu-preview-td {
  border-bottom: none;
}

.neu-preview-row.is-delete {
  background: color-mix(in srgb, var(--neu-danger) 10%, transparent);
}

.neu-preview-row.is-delete .neu-preview-td {
  text-decoration: line-through;
  color: var(--neu-text-muted);
}

.neu-summary {
  padding: 1rem;
  border-radius: 0.75rem;
  background: var(--neu-bg-secondary);
}

.neu-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--neu-text-muted) transparent;
}

.neu-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.neu-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.neu-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--neu-text-muted);
  border-radius: 3px;
}
</style>
