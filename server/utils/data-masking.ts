/**
 * Data Masking Utilities
 *
 * Server-side utilities for masking sensitive user data based on
 * permission levels. Supports multiple masking strategies for
 * different field types.
 */

import type { PermissionCache, DataLevel } from './permissions'
import { FIELD_DATA_LEVELS, getFieldDataLevel, canAccessDataLevel, isSelfAccess } from './permissions'

// ============================================================================
// Masking Types
// ============================================================================

export type MaskingType = 'full' | 'partial' | 'last4' | 'email' | 'phone' | 'date' | 'currency'

/**
 * Field-specific masking configurations
 */
export const FIELD_MASKING: Record<string, MaskingType> = {
  personal_email: 'email',
  company_email: 'email',
  emergency_contact_email: 'email',
  personal_phone: 'phone',
  company_phone: 'phone',
  emergency_contact_phone: 'phone',
  personal_ssn: 'last4',
  tax_ssn: 'last4',
  tax_id: 'last4',
  bank_account_number: 'last4',
  bank_routing_number: 'partial',
  personal_date_of_birth: 'date',
  personal_address_line1: 'partial',
  personal_address_line2: 'partial',
  pay_rate: 'currency',
  config_overtime_rate: 'currency',
  tax_w4_additional_withholding: 'currency',
  config_flat_amount: 'currency',
}

/**
 * Masked value placeholder
 */
export const MASKED_VALUE = '••••••••'

// ============================================================================
// Masking Functions
// ============================================================================

/**
 * Mask a value based on masking type
 */
export function maskValue(value: unknown, maskingType: MaskingType): string {
  if (value === null || value === undefined) {
    return ''
  }

  const strValue = String(value)

  switch (maskingType) {
    case 'full':
      return MASKED_VALUE

    case 'partial':
      if (strValue.length <= 4) return MASKED_VALUE
      return strValue.slice(0, 2) + '••••' + strValue.slice(-2)

    case 'last4':
      if (strValue.length <= 4) return '••••' + strValue
      return '••••••' + strValue.slice(-4)

    case 'email':
      return maskEmail(strValue)

    case 'phone':
      return maskPhone(strValue)

    case 'date':
      return maskDate(strValue)

    case 'currency':
      return '$•••••'

    default:
      return MASKED_VALUE
  }
}

/**
 * Mask an email address (show first char and domain)
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return MASKED_VALUE

  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex)

  if (local.length <= 2) {
    return local.charAt(0) + '••••' + domain
  }

  return local.charAt(0) + '••••' + local.slice(-1) + domain
}

/**
 * Mask a phone number (show last 4 digits)
 */
function maskPhone(phone: string): string {
  // Remove non-digits for processing
  const digits = phone.replace(/\D/g, '')

  if (digits.length < 4) return MASKED_VALUE

  // Show format hint with masked digits
  if (digits.length === 10) {
    return `(•••) •••-${digits.slice(-4)}`
  } else if (digits.length === 11) {
    return `+• (•••) •••-${digits.slice(-4)}`
  }

  return `•••-${digits.slice(-4)}`
}

/**
 * Mask a date (show only year)
 */
function maskDate(date: string): string {
  // Try to extract year
  const match = date.match(/\d{4}/)
  if (match) {
    return `••/••/${match[0]}`
  }
  return '••/••/••••'
}

// ============================================================================
// User Data Masking
// ============================================================================

/**
 * Configuration for masking user data
 */
export interface MaskingConfig {
  /** Permission cache for the requesting user */
  permissionCache: PermissionCache

  /** The data level the user is allowed to see */
  allowedDataLevel: DataLevel

  /** Whether the user is viewing their own data */
  isSelf: boolean

  /** Fields to always show regardless of permission (for display purposes) */
  alwaysShowFields?: string[]

  /** Fields to completely omit from output (not just mask) */
  omitFields?: string[]
}

/**
 * Mask user data based on permissions
 */
export function maskUserData<T extends Record<string, unknown>>(
  user: T,
  config: MaskingConfig
): Partial<T> {
  const { allowedDataLevel, isSelf, alwaysShowFields = [], omitFields = [] } = config

  const result: Partial<T> = {}

  // Always include meta fields
  const metaFields = ['meta_id', 'meta_status', 'meta_created_at', 'meta_updated_at']

  for (const [field, value] of Object.entries(user)) {
    // Skip omitted fields
    if (omitFields.includes(field)) {
      continue
    }

    // Always include meta fields
    if (metaFields.includes(field)) {
      result[field as keyof T] = value as T[keyof T]
      continue
    }

    // Always show certain fields
    if (alwaysShowFields.includes(field)) {
      result[field as keyof T] = value as T[keyof T]
      continue
    }

    // Get the data level required for this field
    const fieldLevel = getFieldDataLevel(field)
    const levelHierarchy: Record<DataLevel, number> = {
      basic: 1,
      personal: 2,
      sensitive: 3,
    }

    // Self exception: users can always see their own personal data
    // (but not necessarily edit it - that's a separate permission)
    const canSeePersonal = isSelf && fieldLevel === 'personal'

    // Check if user has permission to see this field
    if (levelHierarchy[allowedDataLevel] >= levelHierarchy[fieldLevel] || canSeePersonal) {
      // User can see the unmasked value
      result[field as keyof T] = value as T[keyof T]
    } else {
      // User cannot see the value - apply masking or omit
      const maskingType = FIELD_MASKING[field]
      if (maskingType && value !== null && value !== undefined) {
        result[field as keyof T] = maskValue(value, maskingType) as T[keyof T]
      } else if (fieldLevel === 'sensitive') {
        // Completely omit sensitive fields if no masking type defined
        // (don't even show the field exists)
        continue
      } else {
        // For personal fields without masking, show masked placeholder
        result[field as keyof T] = MASKED_VALUE as T[keyof T]
      }
    }
  }

  return result
}

/**
 * Mask multiple users' data
 */
export function maskUsersData<T extends Record<string, unknown>>(
  users: T[],
  permissionCache: PermissionCache,
  getTargetContext: (user: T) => { targetUserId: string; targetDepartmentId?: string }
): Partial<T>[] {
  return users.map((user) => {
    const context = getTargetContext(user)
    const isSelf = isSelfAccess(permissionCache, context.targetUserId)

    // Determine allowed data level for this specific user
    let allowedDataLevel: DataLevel = 'basic'

    // Check from most sensitive to least
    const levels: DataLevel[] = ['sensitive', 'personal', 'basic']
    for (const level of levels) {
      if (canAccessDataLevel(permissionCache, 'users', 'view', level, context)) {
        allowedDataLevel = level
        break
      }
    }

    return maskUserData(user, {
      permissionCache,
      allowedDataLevel,
      isSelf,
      alwaysShowFields: [
        'personal_first_name',
        'personal_preferred_name',
        'personal_last_name',
        'personal_avatar_url',
        'company_email',
        'company_title',
        'company_avatar_url',
      ],
      omitFields: [
        // Never include sensitive auth data in API responses
        'auth_password_hash',
        'auth_mfa_secret',
      ],
    })
  })
}

// ============================================================================
// Field-Level Permission Checking
// ============================================================================

/**
 * Get fields that a user is allowed to see for a target
 */
export function getAllowedFields(
  permissionCache: PermissionCache,
  targetUserId: string,
  allFields: string[],
  context?: { targetDepartmentId?: string }
): string[] {
  const isSelf = isSelfAccess(permissionCache, targetUserId)
  const fullContext = { targetUserId, ...context }

  // Determine max data level
  let maxLevel: DataLevel = 'basic'
  const levels: DataLevel[] = ['sensitive', 'personal', 'basic']
  for (const level of levels) {
    if (canAccessDataLevel(permissionCache, 'users', 'view', level, fullContext)) {
      maxLevel = level
      break
    }
  }

  const levelHierarchy: Record<DataLevel, number> = {
    basic: 1,
    personal: 2,
    sensitive: 3,
  }

  return allFields.filter((field) => {
    const fieldLevel = getFieldDataLevel(field)

    // Self exception for personal data
    if (isSelf && fieldLevel === 'personal') {
      return true
    }

    return levelHierarchy[maxLevel] >= levelHierarchy[fieldLevel]
  })
}

/**
 * Get fields that a user is allowed to edit for a target
 */
export function getEditableFields(
  permissionCache: PermissionCache,
  targetUserId: string,
  allFields: string[],
  context?: { targetDepartmentId?: string }
): string[] {
  const fullContext = { targetUserId, ...context }

  // Determine max data level for editing
  let maxLevel: DataLevel | null = null
  const levels: DataLevel[] = ['sensitive', 'personal', 'basic']
  for (const level of levels) {
    if (canAccessDataLevel(permissionCache, 'users', 'edit', level, fullContext)) {
      maxLevel = level
      break
    }
  }

  if (!maxLevel) {
    return []
  }

  const levelHierarchy: Record<DataLevel, number> = {
    basic: 1,
    personal: 2,
    sensitive: 3,
  }

  return allFields.filter((field) => {
    const fieldLevel = getFieldDataLevel(field)
    return levelHierarchy[maxLevel!] >= levelHierarchy[fieldLevel]
  })
}

// ============================================================================
// Compensation & Banking Masking
// ============================================================================

/**
 * Mask compensation data
 */
export function maskCompensationData<T extends Record<string, unknown>>(
  data: T,
  canView: boolean
): Partial<T> {
  if (canView) {
    return data
  }

  const result: Partial<T> = {}

  for (const [field, value] of Object.entries(data)) {
    if (field.startsWith('meta_') || field.startsWith('ref_')) {
      result[field as keyof T] = value as T[keyof T]
    } else if (field.startsWith('pay_') || field.startsWith('config_')) {
      result[field as keyof T] = MASKED_VALUE as T[keyof T]
    } else {
      result[field as keyof T] = value as T[keyof T]
    }
  }

  return result
}

/**
 * Mask banking data
 */
export function maskBankingData<T extends Record<string, unknown>>(
  data: T,
  canView: boolean
): Partial<T> {
  if (canView) {
    // Even when can view, mask account numbers for security
    const result = { ...data } as Record<string, unknown>
    if ('bank_account_number' in result) {
      result['bank_account_number'] = maskValue(result['bank_account_number'], 'last4')
    }
    if ('bank_routing_number' in result) {
      result['bank_routing_number'] = maskValue(result['bank_routing_number'], 'partial')
    }
    return result as Partial<T>
  }

  const result: Partial<T> = {}

  for (const [field, value] of Object.entries(data)) {
    if (field.startsWith('meta_') || field.startsWith('ref_')) {
      result[field as keyof T] = value as T[keyof T]
    } else if (field.startsWith('bank_') || field.startsWith('config_')) {
      result[field as keyof T] = MASKED_VALUE as T[keyof T]
    } else {
      result[field as keyof T] = value as T[keyof T]
    }
  }

  return result
}
