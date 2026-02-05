/**
 * Composable for column-level permissions in data tables.
 *
 * Provides column filtering and value masking based on user permissions.
 */

import type { TableColumn } from '~/types/table'
import type { DataLevel, PermissionScope } from '~/types/permissions'
import { FIELD_DATA_LEVELS, FIELD_MASKING, DATA_LEVEL_ORDER } from '~/constants/permissions'

interface ColumnPermissionContext {
  targetUserId?: string
  targetDepartmentId?: string
}

interface MaskedColumn extends TableColumn {
  masked?: boolean
  maskingType?: string
}

export function useColumnPermissions(tableId: string = 'directory') {
  const { can, isSelf, isDirectReport, getMaxDataLevel, permissionState } = usePermissions()

  /**
   * Get the data level required to view a field
   */
  function getFieldDataLevel(field: string): DataLevel {
    return FIELD_DATA_LEVELS[field] ?? 'basic'
  }

  /**
   * Check if a column is visible based on permissions
   */
  function canViewColumn(
    column: TableColumn,
    context?: ColumnPermissionContext
  ): boolean {
    const fieldLevel = getFieldDataLevel(column.field)

    // Basic fields are always visible
    if (fieldLevel === 'basic') {
      return true
    }

    // Self exception: users can always see their own personal data
    if (context?.targetUserId && isSelf(context.targetUserId) && fieldLevel === 'personal') {
      return true
    }

    // Check permission for the data level
    const permission = `users.view.${fieldLevel}`
    return can(permission, context)
  }

  /**
   * Check if a column is editable based on permissions
   */
  function canEditColumn(
    column: TableColumn,
    context?: ColumnPermissionContext
  ): boolean {
    if (!column.editable) {
      return false
    }

    const fieldLevel = getFieldDataLevel(column.field)
    const permission = `users.edit.${fieldLevel}`
    return can(permission, context)
  }

  /**
   * Filter columns based on permissions for a specific target
   */
  function getPermittedColumns(
    columns: TableColumn[],
    context?: ColumnPermissionContext
  ): MaskedColumn[] {
    const maxLevel = getMaxDataLevel('users', 'view', context)

    if (!maxLevel) {
      // No view permission - only show basic columns
      return columns
        .filter((col) => getFieldDataLevel(col.field) === 'basic')
        .map((col) => ({ ...col, masked: false }))
    }

    const levelHierarchy: Record<DataLevel, number> = {
      basic: 1,
      personal: 2,
      sensitive: 3,
    }

    const maxLevelValue = levelHierarchy[maxLevel]

    return columns.map((col) => {
      const fieldLevel = getFieldDataLevel(col.field)
      const fieldLevelValue = levelHierarchy[fieldLevel]

      // Self exception for personal data
      const isSelfAccess = context?.targetUserId && isSelf(context.targetUserId)
      const canSeePersonal = isSelfAccess && fieldLevel === 'personal'

      if (fieldLevelValue <= maxLevelValue || canSeePersonal) {
        return { ...col, masked: false }
      } else {
        // Column should be masked
        return {
          ...col,
          masked: true,
          maskingType: FIELD_MASKING[col.field] || 'full',
        }
      }
    })
  }

  /**
   * Get columns for viewing (excludes columns user cannot see)
   */
  function getViewableColumns(
    columns: TableColumn[],
    context?: ColumnPermissionContext
  ): TableColumn[] {
    return getPermittedColumns(columns, context).filter((col) => !col.masked)
  }

  /**
   * Get columns user can edit
   */
  function getEditableColumns(
    columns: TableColumn[],
    context?: ColumnPermissionContext
  ): TableColumn[] {
    return columns.filter((col) => canEditColumn(col, context))
  }

  /**
   * Apply masking to a value based on field and permissions
   */
  function getMaskedValue(
    field: string,
    value: unknown,
    context?: ColumnPermissionContext
  ): string | unknown {
    const fieldLevel = getFieldDataLevel(field)

    // Basic fields are never masked
    if (fieldLevel === 'basic') {
      return value
    }

    // Self exception for personal data
    if (context?.targetUserId && isSelf(context.targetUserId) && fieldLevel === 'personal') {
      return value
    }

    // Check if user can view this data level
    const permission = `users.view.${fieldLevel}`
    if (can(permission, context)) {
      return value
    }

    // Apply masking
    return applyMask(field, value)
  }

  /**
   * Apply masking to a value
   */
  function applyMask(field: string, value: unknown): string {
    if (value === null || value === undefined) {
      return ''
    }

    const maskingType = FIELD_MASKING[field] || 'full'
    const strValue = String(value)

    switch (maskingType) {
      case 'full':
        return '••••••••'

      case 'partial':
        if (strValue.length <= 4) return '••••••••'
        return strValue.slice(0, 2) + '••••' + strValue.slice(-2)

      case 'last4':
        if (strValue.length <= 4) return '••••' + strValue
        return '••••••' + strValue.slice(-4)

      case 'email': {
        const atIndex = strValue.indexOf('@')
        if (atIndex <= 0) return '••••••••'
        const local = strValue.slice(0, atIndex)
        const domain = strValue.slice(atIndex)
        if (local.length <= 2) {
          return local.charAt(0) + '••••' + domain
        }
        return local.charAt(0) + '••••' + local.slice(-1) + domain
      }

      case 'phone': {
        const digits = strValue.replace(/\D/g, '')
        if (digits.length < 4) return '••••••••'
        if (digits.length === 10) {
          return `(•••) •••-${digits.slice(-4)}`
        }
        return `•••-${digits.slice(-4)}`
      }

      case 'date': {
        const match = strValue.match(/\d{4}/)
        if (match) {
          return `••/••/${match[0]}`
        }
        return '••/••/••••'
      }

      case 'full':
      default:
        return '••••••••'
    }
  }

  /**
   * Process row data and apply masking where needed
   */
  function maskRowData<T extends Record<string, unknown>>(
    row: T,
    columns: TableColumn[],
    context?: ColumnPermissionContext
  ): T {
    const result = { ...row } as T

    for (const column of columns) {
      if (column.field in result) {
        result[column.field as keyof T] = getMaskedValue(
          column.field,
          result[column.field as keyof T],
          context
        ) as T[keyof T]
      }
    }

    return result
  }

  /**
   * Process multiple rows with masking
   */
  function maskTableData<T extends Record<string, unknown>>(
    rows: T[],
    columns: TableColumn[],
    getContext: (row: T) => ColumnPermissionContext
  ): T[] {
    return rows.map((row) => {
      const context = getContext(row)
      return maskRowData(row, columns, context)
    })
  }

  /**
   * Get column configuration with permission info
   */
  function getColumnConfig(
    columns: TableColumn[],
    context?: ColumnPermissionContext
  ): Array<TableColumn & { canView: boolean; canEdit: boolean; dataLevel: DataLevel }> {
    return columns.map((col) => ({
      ...col,
      canView: canViewColumn(col, context),
      canEdit: canEditColumn(col, context),
      dataLevel: getFieldDataLevel(col.field),
    }))
  }

  return {
    // Field utilities
    getFieldDataLevel,

    // Column checking
    canViewColumn,
    canEditColumn,

    // Column filtering
    getPermittedColumns,
    getViewableColumns,
    getEditableColumns,
    getColumnConfig,

    // Value masking
    getMaskedValue,
    applyMask,
    maskRowData,
    maskTableData,
  }
}
