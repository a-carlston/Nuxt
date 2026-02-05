/**
 * RBAC Permission Constants
 *
 * Field classifications, permission codes, and default configurations
 */

import type { DataLevel, PermissionScope, PermissionCode } from '~/types/permissions'

// ============================================================================
// Field Data Level Classifications
// ============================================================================

/**
 * Maps field names to their data sensitivity levels
 * Used for automatic data masking and permission checks
 */
export const FIELD_DATA_LEVELS: Record<string, DataLevel> = {
  // Basic - Always visible (company directory info)
  personal_first_name: 'basic',
  personal_preferred_name: 'basic',
  personal_last_name: 'basic',
  personal_avatar_url: 'basic',
  company_email: 'basic',
  company_title: 'basic',
  company_department: 'basic',
  company_division: 'basic',
  company_location: 'basic',
  company_avatar_url: 'basic',
  company_employee_id: 'basic',

  // Personal - Requires elevated access
  personal_email: 'personal',
  personal_phone: 'personal',
  personal_phone_country_code: 'personal',
  personal_date_of_birth: 'personal',
  personal_gender: 'personal',
  personal_nationality: 'personal',
  personal_address_country_code: 'personal',
  personal_address_state_code: 'personal',
  personal_address_city: 'personal',
  personal_address_line1: 'personal',
  personal_address_line2: 'personal',
  personal_address_postal_code: 'personal',
  emergency_contact_name: 'personal',
  emergency_contact_relationship: 'personal',
  emergency_contact_phone: 'personal',
  emergency_contact_email: 'personal',
  emergency_contact_address: 'personal',
  company_phone: 'personal',
  company_phone_ext: 'personal',
  company_start_date: 'personal',
  company_hire_date: 'personal',
  company_termination_date: 'personal',
  company_employment_type: 'personal',

  // Sensitive - Requires specific permissions (HIPAA/SOC2)
  personal_ssn: 'sensitive',
  tax_ssn: 'sensitive',
  tax_id: 'sensitive',
  tax_id_type: 'sensitive',
  tax_country: 'sensitive',
  tax_w4_filing_status: 'sensitive',
  tax_w4_allowances: 'sensitive',
  tax_w4_additional_withholding: 'sensitive',
  tax_w4_exempt: 'sensitive',
  tax_state_filing_status: 'sensitive',
  tax_state_allowances: 'sensitive',
  bank_account_type: 'sensitive',
  bank_name: 'sensitive',
  bank_routing_number: 'sensitive',
  bank_account_number: 'sensitive',
  bank_account_holder_name: 'sensitive',
  pay_type: 'sensitive',
  pay_rate: 'sensitive',
  pay_currency: 'sensitive',
  pay_frequency: 'sensitive',
  pay_effective_date: 'sensitive',
  pay_end_date: 'sensitive',
  config_overtime_eligible: 'sensitive',
  config_overtime_rate: 'sensitive',
}

/**
 * Fields that are always visible regardless of permissions (for display purposes)
 */
export const ALWAYS_VISIBLE_FIELDS = new Set([
  'meta_id',
  'meta_status',
  'personal_first_name',
  'personal_preferred_name',
  'personal_last_name',
  'personal_avatar_url',
  'company_email',
  'company_title',
  'company_avatar_url',
])

// ============================================================================
// Masking Configurations
// ============================================================================

/**
 * Masking types for different field types
 */
export type MaskingType = 'full' | 'partial' | 'last4' | 'email' | 'phone' | 'date'

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
  pay_rate: 'full',
}

// ============================================================================
// Permission Code Templates
// ============================================================================

/**
 * Standard permission codes for common operations
 */
export const PERMISSION_CODES = {
  // User management
  USERS_VIEW_BASIC_SELF: 'users.view.basic.self',
  USERS_VIEW_BASIC_DIRECT_REPORTS: 'users.view.basic.direct_reports',
  USERS_VIEW_BASIC_DEPARTMENT: 'users.view.basic.department',
  USERS_VIEW_BASIC_COMPANY: 'users.view.basic.company',

  USERS_VIEW_PERSONAL_SELF: 'users.view.personal.self',
  USERS_VIEW_PERSONAL_DIRECT_REPORTS: 'users.view.personal.direct_reports',
  USERS_VIEW_PERSONAL_DEPARTMENT: 'users.view.personal.department',
  USERS_VIEW_PERSONAL_COMPANY: 'users.view.personal.company',

  USERS_VIEW_SENSITIVE_SELF: 'users.view.sensitive.self',
  USERS_VIEW_SENSITIVE_DIRECT_REPORTS: 'users.view.sensitive.direct_reports',
  USERS_VIEW_SENSITIVE_DEPARTMENT: 'users.view.sensitive.department',
  USERS_VIEW_SENSITIVE_COMPANY: 'users.view.sensitive.company',

  USERS_EDIT_BASIC_SELF: 'users.edit.basic.self',
  USERS_EDIT_BASIC_DIRECT_REPORTS: 'users.edit.basic.direct_reports',
  USERS_EDIT_BASIC_DEPARTMENT: 'users.edit.basic.department',
  USERS_EDIT_BASIC_COMPANY: 'users.edit.basic.company',

  USERS_EDIT_PERSONAL_SELF: 'users.edit.personal.self',
  USERS_EDIT_PERSONAL_DIRECT_REPORTS: 'users.edit.personal.direct_reports',
  USERS_EDIT_PERSONAL_DEPARTMENT: 'users.edit.personal.department',
  USERS_EDIT_PERSONAL_COMPANY: 'users.edit.personal.company',

  USERS_EDIT_SENSITIVE_SELF: 'users.edit.sensitive.self',
  USERS_EDIT_SENSITIVE_DIRECT_REPORTS: 'users.edit.sensitive.direct_reports',
  USERS_EDIT_SENSITIVE_DEPARTMENT: 'users.edit.sensitive.department',
  USERS_EDIT_SENSITIVE_COMPANY: 'users.edit.sensitive.company',

  USERS_CREATE: 'users.create',
  USERS_DELETE: 'users.delete',
  USERS_EXPORT: 'users.export',

  // Compensation (sensitive by default)
  COMPENSATION_VIEW_SELF: 'compensation.view.self',
  COMPENSATION_VIEW_DIRECT_REPORTS: 'compensation.view.direct_reports',
  COMPENSATION_VIEW_DEPARTMENT: 'compensation.view.department',
  COMPENSATION_VIEW_COMPANY: 'compensation.view.company',

  COMPENSATION_EDIT_DIRECT_REPORTS: 'compensation.edit.direct_reports',
  COMPENSATION_EDIT_DEPARTMENT: 'compensation.edit.department',
  COMPENSATION_EDIT_COMPANY: 'compensation.edit.company',

  // Banking (sensitive by default)
  BANKING_VIEW_SELF: 'banking.view.self',
  BANKING_VIEW_COMPANY: 'banking.view.company',
  BANKING_EDIT_SELF: 'banking.edit.self',
  BANKING_EDIT_COMPANY: 'banking.edit.company',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  // RBAC Management
  RBAC_VIEW: 'rbac.view',
  RBAC_MANAGE: 'rbac.manage',
  RBAC_ASSIGN_ROLES: 'rbac.assign_roles',

  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_EXPORT: 'reports.export',
} as const

// ============================================================================
// Scope Utilities
// ============================================================================

/**
 * Ordered list of scopes from narrowest to broadest
 */
export const SCOPE_ORDER: PermissionScope[] = [
  'self',
  'direct_reports',
  'department',
  'lob',
  'division',
  'company',
]

/**
 * Check if scope A includes scope B (A >= B in hierarchy)
 */
export function scopeIncludes(scopeA: PermissionScope, scopeB: PermissionScope): boolean {
  const indexA = SCOPE_ORDER.indexOf(scopeA)
  const indexB = SCOPE_ORDER.indexOf(scopeB)
  return indexA >= indexB
}

/**
 * Get all scopes included by a given scope
 */
export function getIncludedScopes(scope: PermissionScope): PermissionScope[] {
  const index = SCOPE_ORDER.indexOf(scope)
  return SCOPE_ORDER.slice(0, index + 1)
}

// ============================================================================
// Data Level Utilities
// ============================================================================

/**
 * Ordered list of data levels from least to most sensitive
 */
export const DATA_LEVEL_ORDER: DataLevel[] = ['basic', 'personal', 'sensitive']

/**
 * Check if data level A includes data level B (A >= B in hierarchy)
 */
export function dataLevelIncludes(levelA: DataLevel, levelB: DataLevel): boolean {
  const indexA = DATA_LEVEL_ORDER.indexOf(levelA)
  const indexB = DATA_LEVEL_ORDER.indexOf(levelB)
  return indexA >= indexB
}

/**
 * Get all data levels included by a given level
 */
export function getIncludedDataLevels(level: DataLevel): DataLevel[] {
  const index = DATA_LEVEL_ORDER.indexOf(level)
  return DATA_LEVEL_ORDER.slice(0, index + 1)
}

// ============================================================================
// Permission Parsing
// ============================================================================

/**
 * Parse a permission code into its components
 */
export function parsePermission(code: PermissionCode): {
  resource: string
  action: string
  dataLevel?: DataLevel
  scope?: PermissionScope
} {
  const parts = code.split('.')

  if (parts.length < 2) {
    throw new Error(`Invalid permission code: ${code}`)
  }

  const result: {
    resource: string
    action: string
    dataLevel?: DataLevel
    scope?: PermissionScope
  } = {
    resource: parts[0] ?? '',
    action: parts[1] ?? '',
  }

  if (parts.length >= 3) {
    const third = parts[2] as DataLevel | PermissionScope

    // Check if it's a data level or scope
    if (DATA_LEVEL_ORDER.includes(third as DataLevel)) {
      result.dataLevel = third as DataLevel
      if (parts.length >= 4 && parts[3]) {
        result.scope = parts[3] as PermissionScope
      }
    } else if (SCOPE_ORDER.includes(third as PermissionScope)) {
      result.scope = third as PermissionScope
    }
  }

  return result
}

/**
 * Build a permission code from components
 */
export function buildPermission(
  resource: string,
  action: string,
  dataLevel?: DataLevel,
  scope?: PermissionScope
): PermissionCode {
  let code = `${resource}.${action}`
  if (dataLevel) code += `.${dataLevel}`
  if (scope) code += `.${scope}`
  return code
}

// ============================================================================
// Default Role Configurations
// ============================================================================

/**
 * Default role hierarchy levels
 * Lower number = higher authority
 */
export const DEFAULT_ROLE_LEVELS = {
  super_admin: 1,
  admin: 2,
  hr_manager: 3,
  payroll_admin: 3,
  manager: 4,
  employee: 5,
} as const

/**
 * Default permissions for each role (used in seeding)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  super_admin: [
    // Super admin gets everything
    'users.*.*.company',
    'compensation.*.company',
    'banking.*.company',
    'settings.manage',
    'rbac.manage',
    'audit.view',
    'audit.export',
    'reports.*',
  ],

  admin: [
    'users.view.*.company',
    'users.edit.basic.company',
    'users.edit.personal.company',
    'users.create',
    'users.delete',
    'users.export',
    'settings.manage',
    'rbac.view',
    'rbac.assign_roles',
    'audit.view',
    'reports.view',
    'reports.create',
  ],

  hr_manager: [
    'users.view.*.company',
    'users.edit.basic.company',
    'users.edit.personal.company',
    'users.edit.sensitive.company',
    'users.create',
    'users.export',
    'audit.view',
    'reports.view',
    'reports.create',
  ],

  payroll_admin: [
    'users.view.basic.company',
    'users.view.sensitive.company',
    'compensation.view.company',
    'compensation.edit.company',
    'banking.view.company',
    'banking.edit.company',
    'audit.view',
    'reports.view',
    'reports.export',
  ],

  manager: [
    'users.view.basic.company',
    'users.view.personal.direct_reports',
    'users.edit.basic.direct_reports',
    'compensation.view.direct_reports',
    'reports.view',
  ],

  employee: [
    'users.view.basic.company',
    'users.view.personal.self',
    'users.view.sensitive.self',
    'users.edit.basic.self',
    'users.edit.personal.self',
    'compensation.view.self',
    'banking.view.self',
    'banking.edit.self',
  ],
}

// ============================================================================
// Permission Cache Configuration
// ============================================================================

/**
 * Cache TTL in milliseconds (5 minutes)
 */
export const PERMISSION_CACHE_TTL = 5 * 60 * 1000

/**
 * Poll interval for permission updates (5 minutes)
 */
export const PERMISSION_POLL_INTERVAL = 5 * 60 * 1000
