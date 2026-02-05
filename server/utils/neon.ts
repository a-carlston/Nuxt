import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as tenantSchema from '../db/schema'

interface NeonBranch {
  id: string
  name: string
  project_id: string
  parent_id: string
  current_state: string
  created_at: string
}

interface NeonEndpoint {
  id: string
  host: string
  branch_id: string
  type: string
}

interface NeonRole {
  name: string
  password?: string
}

interface CreateBranchResponse {
  branch: NeonBranch
  endpoints: NeonEndpoint[]
  roles: NeonRole[]
  connection_uris: { connection_uri: string }[]
}

/**
 * Create a new Neon branch for a tenant
 */
export async function createTenantBranch(
  tenantSlug: string,
  apiKey: string,
  projectId: string
): Promise<{
  branchId: string
  branchName: string
  host: string
  connectionString: string
}> {
  const branchName = `tenant-${tenantSlug}`

  // Create the branch
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: {
          name: branchName,
        },
        endpoints: [
          {
            type: 'read_write',
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Neon branch: ${error}`)
  }

  const data: CreateBranchResponse = await response.json()

  // Get the connection URI
  const endpoint = data.endpoints[0]
  const connectionUri = data.connection_uris[0]?.connection_uri

  if (!endpoint || !connectionUri) {
    throw new Error('No endpoint or connection URI returned from Neon')
  }

  return {
    branchId: data.branch.id,
    branchName: data.branch.name,
    host: endpoint.host,
    connectionString: connectionUri,
  }
}

/**
 * Delete a Neon branch (for cleanup)
 */
export async function deleteTenantBranch(
  branchId: string,
  apiKey: string,
  projectId: string
): Promise<void> {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete Neon branch: ${error}`)
  }
}

/**
 * Get a database connection for a specific tenant
 */
export function getTenantDb(connectionString: string) {
  const sql = neon(connectionString)
  return drizzle(sql, { schema: tenantSchema })
}

/**
 * Run migrations/schema push on a tenant branch
 * This creates all the tenant tables in the new branch
 */
export async function initializeTenantSchema(connectionString: string): Promise<void> {
  const sql = neon(connectionString)

  // Create tables one at a time (Neon doesn't support multiple statements)

  // CORE_USER_TYPES
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_types (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_code VARCHAR(30) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      config_is_billable BOOLEAN NOT NULL DEFAULT true,
      config_requires_w2 BOOLEAN NOT NULL DEFAULT false,
      config_requires_1099 BOOLEAN NOT NULL DEFAULT false,
      config_is_system BOOLEAN NOT NULL DEFAULT false
    )
  `

  // CORE_USERS
  await sql`
    CREATE TABLE IF NOT EXISTS core_users (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'invited',
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      ref_user_type_id UUID REFERENCES core_user_types(meta_id),
      auth_password_hash VARCHAR(255),
      auth_email_verified_at TIMESTAMPTZ,
      auth_last_login_at TIMESTAMPTZ,
      auth_mfa_enabled BOOLEAN NOT NULL DEFAULT false,
      auth_mfa_secret VARCHAR(255),
      auth_onboarding_completed_at TIMESTAMPTZ,
      personal_first_name VARCHAR(100) NOT NULL,
      personal_preferred_name VARCHAR(100),
      personal_last_name VARCHAR(100) NOT NULL,
      personal_maiden_name VARCHAR(100),
      personal_email VARCHAR(255) NOT NULL,
      personal_phone VARCHAR(30),
      personal_phone_country_code VARCHAR(5),
      personal_avatar_url VARCHAR(500),
      personal_date_of_birth DATE,
      personal_gender VARCHAR(20),
      personal_nationality VARCHAR(10),
      personal_ssn VARCHAR(50),
      personal_address_country_code VARCHAR(2),
      personal_address_state_code VARCHAR(10),
      personal_address_city VARCHAR(100),
      personal_address_line1 VARCHAR(255),
      personal_address_line2 VARCHAR(255),
      personal_address_postal_code VARCHAR(20),
      emergency_contact_name VARCHAR(100),
      emergency_contact_relationship VARCHAR(50),
      emergency_contact_phone VARCHAR(30),
      emergency_contact_email VARCHAR(255),
      emergency_contact_address TEXT,
      company_email VARCHAR(255) UNIQUE,
      company_phone VARCHAR(30),
      company_phone_ext VARCHAR(10),
      company_employee_id VARCHAR(50),
      company_title VARCHAR(100),
      company_department VARCHAR(100),
      company_division VARCHAR(100),
      company_location VARCHAR(100),
      company_start_date DATE,
      company_employment_type VARCHAR(30),
      company_hire_date DATE,
      company_termination_date DATE,
      company_avatar_url VARCHAR(500)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_users_personal_email ON core_users(personal_email)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_users_meta_status ON core_users(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_users_ref_user_type_id ON core_users(ref_user_type_id)`

  // CORE_USER_LANGUAGES
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_languages (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      info_language_code VARCHAR(10) NOT NULL,
      info_proficiency VARCHAR(20) NOT NULL,
      config_is_primary BOOLEAN NOT NULL DEFAULT false
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_languages_ref_user_id ON core_user_languages(ref_user_id)`

  // CORE_USER_BANKING
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_banking (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'pending_verification',
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      bank_account_type VARCHAR(20) NOT NULL,
      bank_name VARCHAR(100),
      bank_routing_number VARCHAR(20) NOT NULL,
      bank_account_number VARCHAR(30) NOT NULL,
      bank_account_holder_name VARCHAR(255) NOT NULL,
      bank_verified_at TIMESTAMPTZ,
      config_is_primary BOOLEAN NOT NULL DEFAULT true,
      config_percentage DECIMAL(5,2),
      config_flat_amount DECIMAL(10,2)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_banking_ref_user_id ON core_user_banking(ref_user_id)`

  // CORE_USER_COMPENSATION
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_compensation (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      pay_type VARCHAR(20) NOT NULL,
      pay_rate DECIMAL(12,2) NOT NULL,
      pay_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      pay_frequency VARCHAR(20) NOT NULL,
      pay_effective_date DATE NOT NULL,
      pay_end_date DATE,
      config_overtime_eligible BOOLEAN NOT NULL DEFAULT false,
      config_overtime_rate DECIMAL(5,2),
      info_notes TEXT
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_compensation_ref_user_id ON core_user_compensation(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_compensation_pay_effective_date ON core_user_compensation(pay_effective_date)`

  // CORE_USER_TAX
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_tax (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL UNIQUE REFERENCES core_users(meta_id) ON DELETE CASCADE,
      tax_ssn VARCHAR(50),
      tax_id VARCHAR(50),
      tax_id_type VARCHAR(20),
      tax_country VARCHAR(2),
      tax_w4_filing_status VARCHAR(20),
      tax_w4_allowances INTEGER,
      tax_w4_additional_withholding DECIMAL(10,2),
      tax_w4_exempt BOOLEAN DEFAULT false,
      tax_state_filing_status VARCHAR(20),
      tax_state_allowances INTEGER,
      tax_i9_verified_at TIMESTAMPTZ,
      tax_i9_document_type VARCHAR(50)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_tax_ref_user_id ON core_user_tax(ref_user_id)`

  // CORE_LOCATIONS
  await sql`
    CREATE TABLE IF NOT EXISTS core_locations (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      info_code VARCHAR(20) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      address_country_code VARCHAR(2),
      address_state_code VARCHAR(10),
      address_city VARCHAR(100),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      address_postal_code VARCHAR(20),
      geo_timezone VARCHAR(50),
      geo_latitude DECIMAL(10,8),
      geo_longitude DECIMAL(11,8),
      geo_geofence_radius_m INTEGER,
      config_is_headquarters BOOLEAN NOT NULL DEFAULT false,
      config_is_active BOOLEAN NOT NULL DEFAULT true
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_locations_info_code ON core_locations(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_locations_config_is_active ON core_locations(config_is_active)`

  // CORE_DIVISIONS
  await sql`
    CREATE TABLE IF NOT EXISTS core_divisions (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      info_code VARCHAR(20) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      info_color VARCHAR(7),
      config_is_active BOOLEAN NOT NULL DEFAULT true
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_divisions_info_code ON core_divisions(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_divisions_config_is_active ON core_divisions(config_is_active)`

  // CORE_DEPARTMENTS
  await sql`
    CREATE TABLE IF NOT EXISTS core_departments (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      ref_parent_id UUID,
      ref_location_id UUID REFERENCES core_locations(meta_id),
      ref_manager_user_id UUID REFERENCES core_users(meta_id),
      info_code VARCHAR(20) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      info_cost_center VARCHAR(50),
      config_is_active BOOLEAN NOT NULL DEFAULT true
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_departments_info_code ON core_departments(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_departments_ref_parent_id ON core_departments(ref_parent_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_departments_ref_location_id ON core_departments(ref_location_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_departments_config_is_active ON core_departments(config_is_active)`

  // CORE_LINES_OF_BUSINESS
  await sql`
    CREATE TABLE IF NOT EXISTS core_lines_of_business (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      ref_division_id UUID REFERENCES core_divisions(meta_id),
      info_code VARCHAR(20) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      info_color VARCHAR(7),
      config_is_active BOOLEAN NOT NULL DEFAULT true
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_lines_of_business_info_code ON core_lines_of_business(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_lines_of_business_ref_division_id ON core_lines_of_business(ref_division_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_lines_of_business_config_is_active ON core_lines_of_business(config_is_active)`

  // CORE_USER_ASSIGNMENTS
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_assignments (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      ref_location_id UUID REFERENCES core_locations(meta_id),
      ref_department_id UUID REFERENCES core_departments(meta_id),
      ref_division_id UUID REFERENCES core_divisions(meta_id),
      ref_lob_id UUID REFERENCES core_lines_of_business(meta_id),
      config_is_primary BOOLEAN NOT NULL DEFAULT false,
      info_start_date DATE,
      info_end_date DATE
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_assignments_ref_user_id ON core_user_assignments(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_assignments_ref_location_id ON core_user_assignments(ref_location_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_assignments_ref_department_id ON core_user_assignments(ref_department_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_assignments_ref_division_id ON core_user_assignments(ref_division_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_assignments_ref_lob_id ON core_user_assignments(ref_lob_id)`

  // CORE_SKILLS
  await sql`
    CREATE TABLE IF NOT EXISTS core_skills (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      info_code VARCHAR(50) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      info_category VARCHAR(50),
      config_proficiency_scale VARCHAR(20),
      config_requires_expiration BOOLEAN NOT NULL DEFAULT false,
      config_is_active BOOLEAN NOT NULL DEFAULT true
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_skills_info_code ON core_skills(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_skills_info_category ON core_skills(info_category)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_skills_config_is_active ON core_skills(config_is_active)`

  // CORE_USER_SKILLS
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_skills (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      ref_skill_id UUID NOT NULL REFERENCES core_skills(meta_id) ON DELETE CASCADE,
      info_proficiency_numeric INTEGER,
      info_proficiency_text VARCHAR(20),
      info_certified_at DATE,
      info_expires_at DATE,
      info_notes TEXT,
      config_is_verified BOOLEAN NOT NULL DEFAULT false,
      ref_verified_by UUID REFERENCES core_users(meta_id),
      info_verified_at TIMESTAMPTZ,
      UNIQUE(ref_user_id, ref_skill_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_skills_ref_user_id ON core_user_skills(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_skills_ref_skill_id ON core_user_skills(ref_skill_id)`

  // CORE_DEPARTMENT_SKILLS
  await sql`
    CREATE TABLE IF NOT EXISTS core_department_skills (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_department_id UUID NOT NULL REFERENCES core_departments(meta_id) ON DELETE CASCADE,
      ref_skill_id UUID NOT NULL REFERENCES core_skills(meta_id) ON DELETE CASCADE,
      info_min_proficiency_numeric INTEGER,
      info_min_proficiency_text VARCHAR(20),
      config_is_required BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(ref_department_id, ref_skill_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_department_skills_ref_department_id ON core_department_skills(ref_department_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_department_skills_ref_skill_id ON core_department_skills(ref_skill_id)`

  // CORE_PASSWORD_HISTORY
  await sql`
    CREATE TABLE IF NOT EXISTS core_password_history (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      auth_password_hash VARCHAR(255) NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_password_history_ref_user_id_created ON core_password_history(ref_user_id, meta_created_at)`

  // CORE_CUSTOM_FIELD_DEFINITIONS
  await sql`
    CREATE TABLE IF NOT EXISTS core_custom_field_definitions (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_deleted_at TIMESTAMPTZ,
      info_code VARCHAR(50) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      info_field_type VARCHAR(20) NOT NULL,
      info_options JSONB,
      info_entity_type VARCHAR(50) NOT NULL,
      config_is_required BOOLEAN NOT NULL DEFAULT false,
      config_is_searchable BOOLEAN NOT NULL DEFAULT false,
      config_is_visible_to_user BOOLEAN NOT NULL DEFAULT true,
      config_is_editable_by_user BOOLEAN NOT NULL DEFAULT false,
      config_display_order INTEGER NOT NULL DEFAULT 0,
      config_validation_regex VARCHAR(255)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_custom_field_definitions_info_code ON core_custom_field_definitions(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_custom_field_definitions_info_entity_type ON core_custom_field_definitions(info_entity_type)`

  // CORE_USER_CUSTOM_FIELDS
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_custom_fields (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      ref_field_id UUID NOT NULL REFERENCES core_custom_field_definitions(meta_id) ON DELETE CASCADE,
      info_value_text TEXT,
      info_value_number DECIMAL(15,4),
      info_value_date DATE,
      info_value_boolean BOOLEAN,
      info_value_json JSONB,
      UNIQUE(ref_user_id, ref_field_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_custom_fields_ref_user_id ON core_user_custom_fields(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_custom_fields_ref_field_id ON core_user_custom_fields(ref_field_id)`

  // SETTINGS_COMPANY
  await sql`
    CREATE TABLE IF NOT EXISTS settings_company (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_company_name VARCHAR(255) NOT NULL,
      info_company_slug VARCHAR(30) NOT NULL UNIQUE,
      info_tagline VARCHAR(500),
      info_industry VARCHAR(50),
      info_company_size VARCHAR(20),
      info_website VARCHAR(255),
      info_tax_id VARCHAR(100),
      brand_logo_url VARCHAR(500),
      brand_header_image_url VARCHAR(500),
      brand_use_custom_header BOOLEAN NOT NULL DEFAULT false,
      config_default_timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
      config_date_format VARCHAR(20) NOT NULL DEFAULT 'MM/DD/YYYY',
      config_time_format VARCHAR(10) NOT NULL DEFAULT '12h',
      config_week_start VARCHAR(10) NOT NULL DEFAULT 'sunday',
      config_fiscal_year_start VARCHAR(5) NOT NULL DEFAULT '01-01',
      config_location_mode VARCHAR(10) NOT NULL DEFAULT 'single',
      config_department_mode VARCHAR(10) NOT NULL DEFAULT 'single',
      config_division_mode VARCHAR(10) NOT NULL DEFAULT 'single',
      config_lob_mode VARCHAR(10) NOT NULL DEFAULT 'single',
      config_retention_days INTEGER DEFAULT 30,
      config_password_history_count INTEGER NOT NULL DEFAULT 12,
      config_password_min_length INTEGER NOT NULL DEFAULT 12,
      config_password_require_special BOOLEAN NOT NULL DEFAULT true,
      config_session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
      config_mfa_required BOOLEAN NOT NULL DEFAULT false
    )
  `

  // SETTINGS_USER
  await sql`
    CREATE TABLE IF NOT EXISTS settings_user (
      ref_user_id UUID PRIMARY KEY REFERENCES core_users(meta_id) ON DELETE CASCADE,
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      pref_theme VARCHAR(20) NOT NULL DEFAULT 'system',
      pref_color_palette VARCHAR(20) NOT NULL DEFAULT 'corporate',
      pref_timezone VARCHAR(50),
      pref_date_format VARCHAR(20),
      pref_time_format VARCHAR(10),
      pref_language VARCHAR(10) NOT NULL DEFAULT 'en',
      notif_email BOOLEAN NOT NULL DEFAULT true,
      notif_push BOOLEAN NOT NULL DEFAULT true,
      notif_sms BOOLEAN NOT NULL DEFAULT false
    )
  `

  // BILLING_SUBSCRIPTION
  await sql`
    CREATE TABLE IF NOT EXISTS billing_subscription (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'trialing',
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_plan VARCHAR(20) NOT NULL,
      info_billing_cycle VARCHAR(10) NOT NULL,
      info_estimated_seats VARCHAR(20),
      info_price_per_seat DECIMAL(10,2),
      info_trial_ends_at TIMESTAMPTZ,
      info_current_period_start TIMESTAMPTZ,
      info_current_period_end TIMESTAMPTZ,
      stripe_customer_id VARCHAR(100),
      stripe_subscription_id VARCHAR(100)
    )
  `

  // BILLING_COMPLIANCE
  await sql`
    CREATE TABLE IF NOT EXISTS billing_compliance (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_subscription_id UUID NOT NULL REFERENCES billing_subscription(meta_id) ON DELETE CASCADE,
      info_compliance_type VARCHAR(20) NOT NULL,
      info_price_per_seat DECIMAL(10,2),
      info_baa_signed_at TIMESTAMPTZ,
      info_dpa_signed_at TIMESTAMPTZ
    )
  `

  // BILLING_ADDRESSES
  await sql`
    CREATE TABLE IF NOT EXISTS billing_addresses (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      config_same_as_company BOOLEAN DEFAULT false,
      address_country_code VARCHAR(2),
      address_state_code VARCHAR(10),
      address_city VARCHAR(100),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      address_postal_code VARCHAR(20)
    )
  `

  // BILLING_PAYMENT_METHODS
  await sql`
    CREATE TABLE IF NOT EXISTS billing_payment_methods (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      stripe_payment_method_id VARCHAR(100),
      info_card_brand VARCHAR(20),
      info_card_last4 VARCHAR(4),
      info_card_exp_month INTEGER,
      info_card_exp_year INTEGER,
      info_cardholder_name VARCHAR(255),
      config_is_default BOOLEAN DEFAULT false
    )
  `

  // BILLING_INVOICES
  await sql`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'draft',
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      stripe_invoice_id VARCHAR(100),
      info_number VARCHAR(50),
      info_amount DECIMAL(10,2),
      info_currency VARCHAR(3) DEFAULT 'USD',
      info_period_start DATE,
      info_period_end DATE,
      info_due_date DATE,
      info_paid_at TIMESTAMPTZ,
      info_pdf_url VARCHAR(500)
    )
  `

  // RBAC_ROLES
  await sql`
    CREATE TABLE IF NOT EXISTS rbac_roles (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_code VARCHAR(50) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      config_hierarchy_level INTEGER NOT NULL,
      config_is_system BOOLEAN NOT NULL DEFAULT false,
      config_is_active BOOLEAN NOT NULL DEFAULT true
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS rbac_roles_info_code_idx ON rbac_roles(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_roles_config_hierarchy_level_idx ON rbac_roles(config_hierarchy_level)`

  // RBAC_PERMISSIONS
  await sql`
    CREATE TABLE IF NOT EXISTS rbac_permissions (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_code VARCHAR(100) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_category VARCHAR(50) NOT NULL,
      info_description TEXT,
      config_is_system BOOLEAN NOT NULL DEFAULT false
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS rbac_permissions_info_code_idx ON rbac_permissions(info_code)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_permissions_info_category_idx ON rbac_permissions(info_category)`

  // RBAC_ROLE_PERMISSIONS (composite primary key)
  await sql`
    CREATE TABLE IF NOT EXISTS rbac_role_permissions (
      ref_role_id UUID NOT NULL REFERENCES rbac_roles(meta_id) ON DELETE CASCADE,
      ref_permission_id UUID NOT NULL REFERENCES rbac_permissions(meta_id) ON DELETE CASCADE,
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (ref_role_id, ref_permission_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS rbac_role_permissions_ref_role_id_idx ON rbac_role_permissions(ref_role_id)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_role_permissions_ref_permission_id_idx ON rbac_role_permissions(ref_permission_id)`

  // RBAC_USER_ROLES
  await sql`
    CREATE TABLE IF NOT EXISTS rbac_user_roles (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      ref_role_id UUID NOT NULL REFERENCES rbac_roles(meta_id) ON DELETE CASCADE,
      ref_assigned_by UUID REFERENCES core_users(meta_id) ON DELETE SET NULL,
      info_scope_type VARCHAR(20) NOT NULL DEFAULT 'global',
      info_scope_id UUID,
      info_assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_expires_at TIMESTAMPTZ,
      UNIQUE(ref_user_id, ref_role_id, info_scope_type, info_scope_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_roles_ref_user_id_idx ON rbac_user_roles(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_roles_ref_role_id_idx ON rbac_user_roles(ref_role_id)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_roles_info_scope_type_idx ON rbac_user_roles(info_scope_type)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_roles_info_scope_id_idx ON rbac_user_roles(info_scope_id)`

  // RBAC_USER_TAGS
  await sql`
    CREATE TABLE IF NOT EXISTS rbac_user_tags (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      info_tag VARCHAR(50) NOT NULL,
      info_category VARCHAR(30) NOT NULL,
      UNIQUE(ref_user_id, info_tag)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_tags_ref_user_id_idx ON rbac_user_tags(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_tags_info_tag_idx ON rbac_user_tags(info_tag)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_user_tags_info_category_idx ON rbac_user_tags(info_category)`

  // RBAC_TAG_PERMISSIONS
  await sql`
    CREATE TABLE IF NOT EXISTS rbac_tag_permissions (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_tag VARCHAR(50) NOT NULL,
      info_target_tags TEXT[],
      ref_permission_id UUID NOT NULL REFERENCES rbac_permissions(meta_id) ON DELETE CASCADE,
      config_effect VARCHAR(10) NOT NULL DEFAULT 'grant',
      config_priority INTEGER NOT NULL DEFAULT 0
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS rbac_tag_permissions_info_tag_idx ON rbac_tag_permissions(info_tag)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_tag_permissions_ref_permission_id_idx ON rbac_tag_permissions(ref_permission_id)`
  await sql`CREATE INDEX IF NOT EXISTS rbac_tag_permissions_config_effect_idx ON rbac_tag_permissions(config_effect)`

  // CORE_USER_SUPERVISORS
  await sql`
    CREATE TABLE IF NOT EXISTS core_user_supervisors (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      ref_supervisor_id UUID NOT NULL REFERENCES core_users(meta_id) ON DELETE CASCADE,
      info_relationship_type VARCHAR(20) NOT NULL DEFAULT 'direct',
      info_effective_date DATE,
      info_end_date DATE,
      config_is_primary BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(ref_user_id, ref_supervisor_id, info_relationship_type)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_supervisors_ref_user_id ON core_user_supervisors(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_core_user_supervisors_ref_supervisor_id ON core_user_supervisors(ref_supervisor_id)`

  // AUDIT_SESSIONS
  await sql`
    CREATE TABLE IF NOT EXISTS audit_sessions (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID NOT NULL REFERENCES core_users(meta_id),
      auth_token_hash VARCHAR(255) NOT NULL,
      audit_ip_address INET,
      audit_user_agent TEXT,
      audit_device_fingerprint VARCHAR(255),
      info_last_active_at TIMESTAMPTZ,
      info_expires_at TIMESTAMPTZ,
      info_revoked_at TIMESTAMPTZ,
      info_revoked_reason VARCHAR(100)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS audit_sessions_ref_user_id_idx ON audit_sessions(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS audit_sessions_info_expires_at_idx ON audit_sessions(info_expires_at)`

  // AUDIT_LOGS
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_user_id UUID REFERENCES core_users(meta_id),
      ref_session_id UUID REFERENCES audit_sessions(meta_id),
      audit_action VARCHAR(50) NOT NULL,
      audit_resource_type VARCHAR(50) NOT NULL,
      audit_resource_id UUID,
      audit_changes JSONB,
      audit_ip_address INET,
      audit_user_agent TEXT,
      audit_data_level VARCHAR(20),
      audit_fields_accessed JSONB
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_meta_created_at_idx ON audit_logs(meta_created_at)`
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_ref_user_id_idx ON audit_logs(ref_user_id)`
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_audit_resource_type_idx ON audit_logs(audit_resource_type)`
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_audit_action_idx ON audit_logs(audit_action)`

  // INSERT DEFAULT DATA
  await sql`
    INSERT INTO core_user_types (info_code, info_name, info_description, config_is_billable, config_is_system)
    VALUES ('admin', 'Administrator', 'Company administrator with full access', true, true)
    ON CONFLICT (info_code) DO NOTHING
  `

  await sql`
    INSERT INTO rbac_roles (info_code, info_name, info_description, config_hierarchy_level, config_is_system)
    VALUES ('admin', 'Administrator', 'Full system access', 1, true)
    ON CONFLICT (info_code) DO NOTHING
  `
}
