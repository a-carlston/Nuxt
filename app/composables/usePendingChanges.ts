import { ref, computed } from 'vue'
import type {
  PendingEdit,
  PendingDelete,
  ImportedChange,
  BulkPayload,
  TableRow
} from '~/types/table'

/**
 * Groups changes by user for sidebar display
 */
export interface UserChanges {
  edits: PendingEdit[]
  deletes: PendingDelete[]
  imports: ImportedChange[]
}

export interface ChangesByUser {
  [userId: string]: UserChanges
}

// Reactive state - shared across composable instances
const edits = ref<Map<string | number, PendingEdit[]>>(new Map())
const deletes = ref<Map<string | number, PendingDelete>>(new Map())
const imports = ref<ImportedChange[]>([])

export function usePendingChanges() {
  // Group all changes by userId for sidebar display
  const changesByUser = computed<ChangesByUser>(() => {
    const grouped: ChangesByUser = {}

    // Group edits by user
    edits.value.forEach((editList) => {
      editList.forEach((edit) => {
        const userId = edit.userId
        if (!grouped[userId]) {
          grouped[userId] = { edits: [], deletes: [], imports: [] }
        }
        grouped[userId]!.edits.push(edit)
      })
    })

    // Group deletes by user
    deletes.value.forEach((del) => {
      const userId = del.userId
      if (!grouped[userId]) {
        grouped[userId] = { edits: [], deletes: [], imports: [] }
      }
      grouped[userId]!.deletes.push(del)
    })

    // Note: imports don't have userId in the current type definition
    // but we could extend this if needed

    return grouped
  })

  // Total count of all pending changes
  const totalChanges = computed(() => {
    let count = 0

    // Count all individual edits
    edits.value.forEach((editList) => {
      count += editList.length
    })

    // Count all deletes
    count += deletes.value.size

    // Count all imports
    count += imports.value.length

    return count
  })

  // Whether there are any pending changes
  const hasChanges = computed(() => totalChanges.value > 0)

  // Add an edit for a specific row and field
  function addEdit(
    rowId: string | number,
    field: string,
    oldValue: unknown,
    newValue: unknown,
    userId: string,
    userName?: string,
    rowName?: string,
    rowAvatarUrl?: string
  ): void {
    const rowEdits = edits.value.get(rowId) || []

    // Check if there's already an edit for this field
    const existingIndex = rowEdits.findIndex((e) => e.field === field)

    const edit: PendingEdit = {
      rowId,
      field,
      oldValue,
      newValue,
      userId,
      userName,
      rowName,
      rowAvatarUrl,
      timestamp: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      const existingEdit = rowEdits[existingIndex]!
      // If the new value equals the original old value, remove the edit entirely
      if (existingEdit.oldValue === newValue) {
        rowEdits.splice(existingIndex, 1)
        if (rowEdits.length === 0) {
          edits.value.delete(rowId)
        } else {
          edits.value.set(rowId, [...rowEdits])
        }
      } else {
        // Update existing edit but keep original oldValue
        rowEdits[existingIndex] = {
          ...edit,
          oldValue: existingEdit.oldValue
        }
        edits.value.set(rowId, [...rowEdits])
      }
    } else {
      // Add new edit
      edits.value.set(rowId, [...rowEdits, edit])
    }

    // Trigger reactivity
    edits.value = new Map(edits.value)
  }

  // Add a delete for a specific row
  function addDelete(
    rowId: string | number,
    rowData: TableRow,
    userId: string,
    userName?: string
  ): void {
    const pendingDelete: PendingDelete = {
      rowId,
      rowData,
      userId,
      userName,
      timestamp: new Date().toISOString()
    }

    deletes.value.set(rowId, pendingDelete)

    // Trigger reactivity
    deletes.value = new Map(deletes.value)
  }

  // Revert edit(s) for a row
  function revertEdit(rowId: string | number, field?: string): void {
    if (field) {
      // Revert specific field edit
      const rowEdits = edits.value.get(rowId)
      if (rowEdits) {
        const filtered = rowEdits.filter((e) => e.field !== field)
        if (filtered.length === 0) {
          edits.value.delete(rowId)
        } else {
          edits.value.set(rowId, filtered)
        }
      }
    } else {
      // Revert all edits for the row
      edits.value.delete(rowId)
    }

    // Trigger reactivity
    edits.value = new Map(edits.value)
  }

  // Revert a pending delete
  function revertDelete(rowId: string | number): void {
    deletes.value.delete(rowId)

    // Trigger reactivity
    deletes.value = new Map(deletes.value)
  }

  // Revert all pending changes
  function revertAll(): void {
    edits.value = new Map()
    deletes.value = new Map()
    imports.value = []
  }

  // Clear all pending changes (alias for revertAll, used after successful save)
  function clearAll(): void {
    revertAll()
  }

  // Add imported changes from CSV
  function addImportedChanges(changes: ImportedChange[]): void {
    imports.value = [...imports.value, ...changes]
  }

  // Get the changes payload for API bulk operations
  function getChangesPayload(): BulkPayload {
    const allEdits: PendingEdit[] = []
    const allDeletes: PendingDelete[] = []

    // Collect all edits
    edits.value.forEach((editList) => {
      allEdits.push(...editList)
    })

    // Collect all deletes
    deletes.value.forEach((del) => {
      allDeletes.push(del)
    })

    return {
      edits: allEdits,
      deletes: allDeletes,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }
  }

  // Get edits for a specific row
  function getRowEdits(rowId: string | number): PendingEdit[] {
    return edits.value.get(rowId) || []
  }

  // Check if a row has pending delete
  function isRowPendingDelete(rowId: string | number): boolean {
    return deletes.value.has(rowId)
  }

  // Check if a specific field has a pending edit
  function hasFieldEdit(rowId: string | number, field: string): boolean {
    const rowEdits = edits.value.get(rowId)
    if (!rowEdits) return false
    return rowEdits.some((e) => e.field === field)
  }

  // Get the pending value for a field (if edited)
  function getPendingValue(rowId: string | number, field: string): unknown | undefined {
    const rowEdits = edits.value.get(rowId)
    if (!rowEdits) return undefined
    const edit = rowEdits.find((e) => e.field === field)
    return edit?.newValue
  }

  // Get the pending delete for a row
  function getPendingDelete(rowId: string | number): PendingDelete | undefined {
    return deletes.value.get(rowId)
  }

  return {
    // Reactive state
    edits: computed(() => edits.value),
    deletes: computed(() => deletes.value),
    imports: computed(() => imports.value),

    // Computed properties
    changesByUser,
    totalChanges,
    hasChanges,

    // Actions
    addEdit,
    addDelete,
    revertEdit,
    revertDelete,
    revertAll,
    clearAll,
    addImportedChanges,
    getChangesPayload,

    // Helper methods
    getRowEdits,
    isRowPendingDelete,
    hasFieldEdit,
    getPendingValue,
    getPendingDelete
  }
}
