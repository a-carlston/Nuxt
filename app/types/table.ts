/**
 * CRUD Table System Type Definitions
 *
 * This module provides TypeScript interfaces for a collaborative
 * CRUD table system with pending edits, bulk operations, and
 * real-time collaboration support.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Supported column data types for rendering and validation
 */
export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'email'
  | 'phone'
  | 'url'
  | 'badge'
  | 'avatar'
  | 'actions'

/**
 * Sort direction for table columns
 */
export type SortDirection = 'asc' | 'desc' | null

/**
 * Actions that can be performed on imported data
 */
export type ImportAction = 'edit' | 'delete'

// ============================================================================
// Column Configuration
// ============================================================================

/**
 * Configuration for a select column's options
 */
export interface SelectOption {
  /** Display label for the option */
  label: string
  /** Stored value for the option */
  value: string | number
  /** Optional color/variant for badge display */
  color?: string
  /** Optional icon to display with the option */
  icon?: string
}

/**
 * Defines a column in the CRUD table
 */
export interface TableColumn {
  /** Unique identifier for the column */
  id: string
  /** Display label shown in the header */
  label: string
  /** Field path to access data from row (supports dot notation, e.g., 'user.name') */
  field: string
  /** Whether the column can be sorted */
  sortable?: boolean
  /** Whether the column can be filtered */
  filterable?: boolean
  /** Whether the column data can be edited inline */
  editable?: boolean
  /** Data type for rendering and validation */
  type?: ColumnType
  /** Column width (CSS value, e.g., '150px', '20%', 'auto') */
  width?: string
  /** Minimum width for resizable columns */
  minWidth?: string
  /** Maximum width for resizable columns */
  maxWidth?: string
  /** Options for select-type columns */
  options?: SelectOption[]
  /** Whether the column is visible (default: true) */
  visible?: boolean
  /** Whether the column is pinned to left or right */
  pinned?: 'left' | 'right' | null
  /** Custom CSS class for the column */
  className?: string
  /** Placeholder text for empty cells or edit inputs */
  placeholder?: string
  /** Format string or function for displaying the value */
  format?: string | ((value: unknown, row: TableRow) => string)
  /** Validation function returning error message or null if valid */
  validate?: (value: unknown, row: TableRow) => string | null
  /** Whether this column is required (used in validation) */
  required?: boolean
}

// ============================================================================
// Row Types
// ============================================================================

/**
 * Base interface for table row data
 * All rows must have a unique identifier
 */
export interface TableRow {
  /** Unique identifier for the row */
  id: string | number
  /** Allow additional properties */
  [key: string]: unknown
}

// ============================================================================
// Pending Changes (Optimistic Updates)
// ============================================================================

/**
 * Represents a pending edit that hasn't been saved to the server
 * Used for optimistic UI updates and conflict resolution
 */
export interface PendingEdit {
  /** ID of the row being edited */
  rowId: string | number
  /** Field/column being modified */
  field: string
  /** Original value before the edit */
  oldValue: unknown
  /** New value after the edit */
  newValue: unknown
  /** Timestamp when the edit was made (ISO 8601) */
  timestamp: string
  /** ID of the user who made the edit */
  userId: string
  /** Optional: User's display name for collaboration UI */
  userName?: string
  /** Optional: Display name for the row being edited (e.g., person's name) */
  rowName?: string
  /** Optional: Avatar URL for the row being edited */
  rowAvatarUrl?: string
  /** Optional: Validation error if the edit is invalid */
  error?: string
}

/**
 * Represents a pending deletion that hasn't been saved to the server
 * Stores row data for potential undo and display purposes
 */
export interface PendingDelete {
  /** ID of the row to be deleted */
  rowId: string | number
  /** Timestamp when the deletion was requested (ISO 8601) */
  timestamp: string
  /** ID of the user who requested the deletion */
  userId: string
  /** Optional: User's display name for collaboration UI */
  userName?: string
  /** Copy of the row data for undo functionality and confirmation display */
  rowData: TableRow
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Represents a change imported from an external source (e.g., CSV, Excel)
 * Used to batch process imported modifications
 */
export interface ImportedChange {
  /** Type of action to perform */
  action: ImportAction
  /** ID of the row to modify (must exist for edit/delete) */
  rowId: string | number
  /** For edits: object containing field names and their new values */
  changes?: Record<string, unknown>
  /** Optional: Original row data from the import source */
  sourceData?: Record<string, unknown>
  /** Optional: Line number from the import file for error reporting */
  lineNumber?: number
  /** Optional: Validation errors found during import processing */
  errors?: string[]
}

// ============================================================================
// Table State
// ============================================================================

/**
 * Current sorting state of the table
 */
export interface SortState {
  /** Field/column currently being sorted */
  field: string | null
  /** Sort direction */
  direction: SortDirection
}

/**
 * Filter state using a Map for efficient lookups
 * Keys are field names, values are the filter criteria
 */
export type FilterState = Map<string, FilterValue>

/**
 * Supported filter value types
 */
export type FilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | { min?: number | string; max?: number | string }
  | { operator: FilterOperator; value: unknown }

/**
 * Filter operators for advanced filtering
 */
export type FilterOperator =
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'contains'  // string contains
  | 'startsWith'
  | 'endsWith'
  | 'in'        // value in array
  | 'notIn'     // value not in array
  | 'between'   // between two values
  | 'isNull'
  | 'isNotNull'

/**
 * Pagination state for the table
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  page: number
  /** Number of items per page */
  pageSize: number
  /** Total number of items across all pages */
  total: number
  /** Available page size options */
  pageSizeOptions?: number[]
}

// ============================================================================
// Table Configuration
// ============================================================================

/**
 * Configuration options for sorting behavior
 */
export interface SortingConfig {
  /** Enable/disable sorting globally */
  enabled?: boolean
  /** Allow sorting by multiple columns */
  multiSort?: boolean
  /** Maximum number of columns to sort by (if multiSort enabled) */
  maxSortColumns?: number
  /** Default sort state */
  defaultSort?: SortState
}

/**
 * Configuration options for filtering behavior
 */
export interface FilteringConfig {
  /** Enable/disable filtering globally */
  enabled?: boolean
  /** Debounce delay for filter input (ms) */
  debounceMs?: number
  /** Show filter row below header */
  showFilterRow?: boolean
  /** Enable global search across all columns */
  globalSearch?: boolean
  /** Columns to include in global search (default: all filterable) */
  globalSearchFields?: string[]
}

/**
 * Configuration options for pagination behavior
 */
export interface PaginationConfig {
  /** Enable/disable pagination */
  enabled?: boolean
  /** Default page size */
  defaultPageSize?: number
  /** Available page size options */
  pageSizeOptions?: number[]
  /** Show page size selector */
  showPageSizeSelector?: boolean
  /** Show total count */
  showTotal?: boolean
  /** Show page jump input */
  showPageJump?: boolean
}

/**
 * Configuration options for selection behavior
 */
export interface SelectionConfig {
  /** Enable row selection */
  enabled?: boolean
  /** Selection mode */
  mode?: 'single' | 'multiple'
  /** Show checkbox column */
  showCheckbox?: boolean
  /** Allow select all */
  selectAll?: boolean
}

/**
 * Configuration options for editing behavior
 */
export interface EditingConfig {
  /** Enable inline editing */
  enabled?: boolean
  /** Edit mode */
  mode?: 'cell' | 'row'
  /** Auto-save changes */
  autoSave?: boolean
  /** Auto-save debounce delay (ms) */
  autoSaveDelay?: number
  /** Show confirmation before discarding changes */
  confirmDiscard?: boolean
}

/**
 * Complete table configuration
 */
export interface TableConfig {
  /** Column definitions */
  columns: TableColumn[]
  /** Pagination configuration */
  pagination?: PaginationConfig
  /** Sorting configuration */
  sorting?: SortingConfig
  /** Filtering configuration */
  filtering?: FilteringConfig
  /** Selection configuration */
  selection?: SelectionConfig
  /** Editing configuration */
  editing?: EditingConfig
  /** Enable row reordering via drag and drop */
  reorderable?: boolean
  /** Enable column resizing */
  resizableColumns?: boolean
  /** Enable column reordering */
  reorderableColumns?: boolean
  /** Show row numbers */
  showRowNumbers?: boolean
  /** Row height in pixels (for virtual scrolling) */
  rowHeight?: number
  /** Enable virtual scrolling for large datasets */
  virtualScroll?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Loading state message */
  loadingMessage?: string
  /** Unique identifier field for rows (default: 'id') */
  rowKey?: string
}

// ============================================================================
// API Payloads
// ============================================================================

/**
 * Payload for bulk operations API endpoint
 * Combines multiple edits and deletes into a single request
 */
export interface BulkPayload {
  /** Array of pending edits to apply */
  edits: PendingEdit[]
  /** Array of pending deletions to apply */
  deletes: PendingDelete[]
  /** Optional: Request metadata */
  meta?: {
    /** Client-generated request ID for idempotency */
    requestId?: string
    /** Timestamp when the bulk operation was initiated */
    timestamp?: string
    /** User ID initiating the bulk operation */
    userId?: string
  }
}

/**
 * Response from bulk operations API endpoint
 */
export interface BulkResponse {
  /** Whether the operation was fully successful */
  success: boolean
  /** Counts of applied operations */
  applied: {
    edits: number
    deletes: number
  }
  /** Optional request ID for tracking */
  requestId?: string
  /** Errors that occurred during the operation */
  errors?: Array<{
    type: 'edit' | 'delete'
    rowId: string
    field?: string
    message: string
  }>
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event emitted when a cell value changes
 */
export interface CellChangeEvent {
  /** Row containing the changed cell */
  row: TableRow
  /** Column definition for the changed cell */
  column: TableColumn
  /** Value before the change */
  oldValue: unknown
  /** Value after the change */
  newValue: unknown
}

/**
 * Event emitted when rows are selected/deselected
 */
export interface SelectionChangeEvent {
  /** Currently selected row IDs */
  selectedIds: Array<string | number>
  /** Currently selected rows */
  selectedRows: TableRow[]
  /** Whether all rows are selected */
  allSelected: boolean
}

/**
 * Event emitted when sort state changes
 */
export interface SortChangeEvent {
  /** Previous sort state */
  previousSort: SortState
  /** New sort state */
  currentSort: SortState
}

/**
 * Event emitted when pagination changes
 */
export interface PageChangeEvent {
  /** Previous page number */
  previousPage: number
  /** New page number */
  currentPage: number
  /** Current page size */
  pageSize: number
}
