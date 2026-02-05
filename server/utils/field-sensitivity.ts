/**
 * Field Sensitivity Utilities
 *
 * Server-side utilities for managing field-level sensitivity and access control.
 * Uses a simplified 4-tier system:
 * - 'sensitive' = Highly restricted (SSN, bank info)
 * - 'company' = Company-sensitive (pay rates, IDs)
 * - 'personal' = Personal employee data (contact info, DOB)
 * - 'basic' = Visible to all users (name, title)
 */

// ============================================================================
// Types
// ============================================================================

export type SensitivityTier = 'basic' | 'personal' | 'company' | 'sensitive'

export interface FieldSensitivityConfig {
  sensitivity: SensitivityTier
  masking: string
  order?: number
}

export interface FieldSensitivityCache {
  [tableName: string]: {
    [fieldName: string]: FieldSensitivityConfig
  }
}

// Tier ordering for comparison (higher index = more restricted)
const TIER_ORDER: SensitivityTier[] = ['basic', 'personal', 'company', 'sensitive']

// ============================================================================
// Constants
// ============================================================================

/**
 * System minimum sensitivity tiers - these fields cannot be made less sensitive.
 */
export const SYSTEM_MINIMUM_TIERS: Record<string, SensitivityTier> = {
  // SSN and tax IDs - must be sensitive
  personal_ssn: 'sensitive',
  tax_ssn: 'sensitive',
  tax_id: 'sensitive',

  // Bank fields - must be at least sensitive
  bank_account_number: 'sensitive',
  bank_routing_number: 'sensitive',
  bank_account_type: 'sensitive',
  bank_name: 'sensitive',
  bank_account_holder_name: 'sensitive',

  // Pay and compensation fields - must be at least company
  pay_type: 'company',
  pay_rate: 'company',
  pay_currency: 'company',
  pay_frequency: 'company',
  compensation_base: 'company',
  compensation_bonus: 'company',
  compensation_equity: 'company',
  compensation_total: 'company',
}

/**
 * Default sensitivity and masking for fields based on field names/prefixes.
 */
export const DEFAULT_FIELD_CONFIGS: Record<string, FieldSensitivityConfig> = {
  // Sensitive tier (SSN, tax IDs, bank info)
  personal_ssn: { sensitivity: 'sensitive', masking: 'last4' },
  tax_ssn: { sensitivity: 'sensitive', masking: 'last4' },
  tax_id: { sensitivity: 'sensitive', masking: 'last4' },
  bank_account_number: { sensitivity: 'sensitive', masking: 'last4' },
  bank_routing_number: { sensitivity: 'sensitive', masking: 'last4' },
  bank_account_type: { sensitivity: 'sensitive', masking: 'full' },
  bank_name: { sensitivity: 'sensitive', masking: 'full' },
  bank_account_holder_name: { sensitivity: 'sensitive', masking: 'full' },

  // Company tier (pay, compensation, IDs)
  pay_type: { sensitivity: 'company', masking: 'none' },
  pay_rate: { sensitivity: 'company', masking: 'currency' },
  pay_currency: { sensitivity: 'company', masking: 'none' },
  pay_frequency: { sensitivity: 'company', masking: 'none' },
  compensation_base: { sensitivity: 'company', masking: 'currency' },
  compensation_bonus: { sensitivity: 'company', masking: 'currency' },
  compensation_equity: { sensitivity: 'company', masking: 'currency' },
  compensation_total: { sensitivity: 'company', masking: 'currency' },
  company_employee_id: { sensitivity: 'company', masking: 'none' },
  company_start_date: { sensitivity: 'company', masking: 'none' },
  company_hire_date: { sensitivity: 'company', masking: 'none' },
  company_termination_date: { sensitivity: 'company', masking: 'none' },

  // Personal tier (contact info, DOB, address)
  personal_dob: { sensitivity: 'personal', masking: 'partial' },
  personal_date_of_birth: { sensitivity: 'personal', masking: 'partial' },
  personal_email: { sensitivity: 'personal', masking: 'email' },
  personal_phone: { sensitivity: 'personal', masking: 'phone' },
  personal_phone_country_code: { sensitivity: 'personal', masking: 'none' },
  personal_address_line1: { sensitivity: 'personal', masking: 'partial' },
  personal_address_line2: { sensitivity: 'personal', masking: 'partial' },
  personal_address_city: { sensitivity: 'personal', masking: 'partial' },
  personal_address_state: { sensitivity: 'personal', masking: 'none' },
  personal_address_state_code: { sensitivity: 'personal', masking: 'none' },
  personal_address_postal_code: { sensitivity: 'personal', masking: 'partial' },
  personal_address_country: { sensitivity: 'personal', masking: 'none' },
  personal_address_country_code: { sensitivity: 'personal', masking: 'none' },
  emergency_contact_name: { sensitivity: 'personal', masking: 'partial' },
  emergency_contact_relationship: { sensitivity: 'personal', masking: 'none' },
  emergency_contact_phone: { sensitivity: 'personal', masking: 'phone' },
  emergency_contact_email: { sensitivity: 'personal', masking: 'email' },
  emergency_contact_address: { sensitivity: 'personal', masking: 'partial' },

  // Basic tier (names, company info visible to all)
  personal_first_name: { sensitivity: 'basic', masking: 'none' },
  personal_last_name: { sensitivity: 'basic', masking: 'none' },
  personal_preferred_name: { sensitivity: 'basic', masking: 'none' },
  personal_avatar_url: { sensitivity: 'basic', masking: 'none' },
  company_work_email: { sensitivity: 'basic', masking: 'none' },
  company_phone: { sensitivity: 'basic', masking: 'none' },
  company_phone_ext: { sensitivity: 'basic', masking: 'none' },
  company_title: { sensitivity: 'basic', masking: 'none' },
  company_department: { sensitivity: 'basic', masking: 'none' },
  company_division: { sensitivity: 'basic', masking: 'none' },
  company_location: { sensitivity: 'basic', masking: 'none' },
  company_employment_type: { sensitivity: 'basic', masking: 'none' },
  company_avatar_url: { sensitivity: 'basic', masking: 'none' },
  meta_id: { sensitivity: 'basic', masking: 'none' },
  meta_status: { sensitivity: 'basic', masking: 'none' },
}

/**
 * Prefix patterns for matching fields that don't have exact matches.
 * Ordered from most specific (longest) to least specific.
 */
const PREFIX_PATTERNS: Array<{ prefix: string; config: FieldSensitivityConfig }> = [
  // Sensitive patterns
  { prefix: 'personal_ssn', config: { sensitivity: 'sensitive', masking: 'last4' } },
  { prefix: 'tax_ssn', config: { sensitivity: 'sensitive', masking: 'last4' } },
  { prefix: 'tax_id', config: { sensitivity: 'sensitive', masking: 'last4' } },
  { prefix: 'bank_', config: { sensitivity: 'sensitive', masking: 'last4' } },

  // Company patterns
  { prefix: 'pay_', config: { sensitivity: 'company', masking: 'currency' } },
  { prefix: 'compensation_', config: { sensitivity: 'company', masking: 'currency' } },

  // Personal patterns
  { prefix: 'personal_dob', config: { sensitivity: 'personal', masking: 'partial' } },
  { prefix: 'personal_date_of_birth', config: { sensitivity: 'personal', masking: 'partial' } },
  { prefix: 'personal_address_', config: { sensitivity: 'personal', masking: 'partial' } },
  { prefix: 'personal_email', config: { sensitivity: 'personal', masking: 'email' } },
  { prefix: 'personal_phone', config: { sensitivity: 'personal', masking: 'phone' } },
  { prefix: 'emergency_', config: { sensitivity: 'personal', masking: 'partial' } },

  // Basic patterns (catch-all for company_ and personal_)
  { prefix: 'company_', config: { sensitivity: 'basic', masking: 'none' } },
  { prefix: 'personal_first_name', config: { sensitivity: 'basic', masking: 'none' } },
  { prefix: 'personal_last_name', config: { sensitivity: 'basic', masking: 'none' } },
  { prefix: 'personal_preferred_name', config: { sensitivity: 'basic', masking: 'none' } },
  { prefix: 'personal_', config: { sensitivity: 'basic', masking: 'none' } },
  { prefix: 'meta_', config: { sensitivity: 'basic', masking: 'none' } },
]

// Sort patterns by length descending for most specific match first
PREFIX_PATTERNS.sort((a, b) => b.prefix.length - a.prefix.length)

// Default fallback for unknown fields
const DEFAULT_SENSITIVITY: FieldSensitivityConfig = { sensitivity: 'basic', masking: 'none' }

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the tier index for comparison (higher = more restricted)
 */
export function getTierIndex(tier: SensitivityTier): number {
  return TIER_ORDER.indexOf(tier)
}

/**
 * Check if tier A is more or equally restrictive as tier B
 */
export function isMoreRestrictive(tierA: SensitivityTier, tierB: SensitivityTier): boolean {
  return getTierIndex(tierA) >= getTierIndex(tierB)
}

/**
 * Get the sensitivity configuration for a field.
 * Checks cache first, then falls back to defaults.
 */
export function getFieldSensitivity(
  tableName: string,
  fieldName: string,
  configCache?: FieldSensitivityCache
): FieldSensitivityConfig {
  // Check custom configuration cache first
  if (configCache) {
    const tableConfig = configCache[tableName]
    if (tableConfig) {
      const fieldConfig = tableConfig[fieldName]
      if (fieldConfig) {
        return fieldConfig
      }
    }
  }

  // Fall back to default sensitivity based on field name
  return getDefaultSensitivity(fieldName)
}

/**
 * Check if a user can access a field based on sensitivity tiers.
 * User's tier represents the most sensitive data they can access.
 *
 * @param userTier - The user's access tier
 * @param fieldTier - The field's sensitivity tier
 * @returns True if user can access the field
 */
export function canAccessField(userTier: SensitivityTier, fieldTier: SensitivityTier): boolean {
  // User can access if their tier is >= the field's tier
  return getTierIndex(userTier) >= getTierIndex(fieldTier)
}

/**
 * Get the default sensitivity configuration for a field based on prefix patterns.
 */
export function getDefaultSensitivity(fieldName: string): FieldSensitivityConfig {
  // Check exact match first
  const exactMatch = DEFAULT_FIELD_CONFIGS[fieldName]
  if (exactMatch) {
    return exactMatch
  }

  // Check prefix patterns (already sorted by length descending)
  for (const pattern of PREFIX_PATTERNS) {
    if (fieldName.startsWith(pattern.prefix)) {
      return pattern.config
    }
  }

  // Return default for unknown fields
  return DEFAULT_SENSITIVITY
}

/**
 * Validate that a sensitivity tier respects the system minimum for a field.
 */
export function validateSensitivityTier(
  fieldName: string,
  tier: SensitivityTier
): { valid: boolean; minimumTier?: SensitivityTier; message?: string } {
  // Check exact match in system minimums
  const exactMinimum = SYSTEM_MINIMUM_TIERS[fieldName]
  if (exactMinimum !== undefined) {
    if (!isMoreRestrictive(tier, exactMinimum)) {
      return {
        valid: false,
        minimumTier: exactMinimum,
        message: `Field "${fieldName}" must be at least "${exactMinimum}" sensitivity`,
      }
    }
    return { valid: true }
  }

  // Check prefix patterns for system minimums
  if (fieldName.startsWith('bank_')) {
    if (!isMoreRestrictive(tier, 'sensitive')) {
      return {
        valid: false,
        minimumTier: 'sensitive',
        message: `Bank fields must be "sensitive"`,
      }
    }
  }

  if (fieldName.startsWith('pay_') || fieldName.startsWith('compensation_')) {
    if (!isMoreRestrictive(tier, 'company')) {
      return {
        valid: false,
        minimumTier: 'company',
        message: `Pay/compensation fields must be at least "company" sensitivity`,
      }
    }
  }

  // No minimum restriction for this field
  return { valid: true }
}

/**
 * Get the masking type for a field.
 */
export function getFieldMasking(
  fieldName: string,
  tableName?: string,
  configCache?: FieldSensitivityCache
): string {
  if (configCache && tableName) {
    const tableConfig = configCache[tableName]
    if (tableConfig) {
      const fieldConfig = tableConfig[fieldName]
      if (fieldConfig) {
        return fieldConfig.masking
      }
    }
  }

  return getDefaultSensitivity(fieldName).masking
}

/**
 * Get all available sensitivity tiers with their metadata.
 */
export function getSensitivityTiers() {
  return [
    { value: 'basic' as const, label: 'Basic', description: 'Visible to all users' },
    { value: 'personal' as const, label: 'Personal', description: 'Personal employee data' },
    { value: 'company' as const, label: 'Company', description: 'Company-sensitive data' },
    { value: 'sensitive' as const, label: 'Sensitive', description: 'Highly restricted' },
  ]
}
