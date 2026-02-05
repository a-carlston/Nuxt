import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

/**
 * Seed field sensitivity configurations for a tenant
 * Usage: npx tsx scripts/seed-field-sensitivity.ts <tenant-slug>
 *
 * This script creates the default field sensitivity levels:
 * - Level 1-3: Highly Sensitive (SSN, banking, tax, pay)
 * - Level 4-6: Personal (contact info, dates, addresses)
 * - Level 7-10: Basic (name, title, department)
 *
 * It also sets config_max_sensitivity_level on roles:
 * - super_admin: level 1 (sees everything)
 * - admin: level 2
 * - hr_manager: level 2
 * - payroll_admin: level 1
 * - manager: level 5
 * - employee: level 8
 */

// Field sensitivity definitions
// Structure: { tableName: { fieldName: { level, masking, displayName, description, minLevel?, isSystem? } } }
const FIELD_SENSITIVITY: Record<
  string,
  Record<
    string,
    {
      level: number
      masking: string
      displayName: string
      description?: string
      minLevel?: number
      isSystem?: boolean
    }
  >
> = {
  core_users: {
    // Level 1 - Highly Sensitive (SSN)
    personal_ssn: {
      level: 1,
      masking: 'last4',
      displayName: 'Social Security Number',
      description: 'Most sensitive identifier, requires highest clearance',
      minLevel: 1,
      isSystem: true,
    },
    tax_ssn: {
      level: 1,
      masking: 'last4',
      displayName: 'Tax SSN',
      description: 'Social Security Number for tax purposes',
      minLevel: 1,
      isSystem: true,
    },
    tax_id: {
      level: 1,
      masking: 'last4',
      displayName: 'Tax ID',
      description: 'Federal tax identification number',
      minLevel: 1,
      isSystem: true,
    },

    // Level 4 - Personal (contact info, addresses)
    personal_date_of_birth: {
      level: 4,
      masking: 'date',
      displayName: 'Date of Birth',
      description: 'Personal date of birth',
    },
    personal_address_line1: {
      level: 4,
      masking: 'partial',
      displayName: 'Address Line 1',
      description: 'Primary street address',
    },
    personal_address_line2: {
      level: 4,
      masking: 'partial',
      displayName: 'Address Line 2',
      description: 'Secondary address line',
    },
    personal_address_city: {
      level: 4,
      masking: 'partial',
      displayName: 'City',
      description: 'City of residence',
    },
    personal_address_state_code: {
      level: 4,
      masking: 'none',
      displayName: 'State',
      description: 'State code',
    },
    personal_address_postal_code: {
      level: 4,
      masking: 'partial',
      displayName: 'Postal Code',
      description: 'ZIP or postal code',
    },
    personal_address_country_code: {
      level: 4,
      masking: 'none',
      displayName: 'Country',
      description: 'Country code',
    },

    // Level 5 - Personal Contact
    personal_email: {
      level: 5,
      masking: 'email',
      displayName: 'Personal Email',
      description: 'Personal email address',
    },
    personal_phone: {
      level: 5,
      masking: 'phone',
      displayName: 'Personal Phone',
      description: 'Personal phone number',
    },
    personal_phone_country_code: {
      level: 5,
      masking: 'none',
      displayName: 'Phone Country Code',
      description: 'Country code for personal phone',
    },
    personal_gender: {
      level: 5,
      masking: 'full',
      displayName: 'Gender',
      description: 'Gender identity',
    },
    personal_nationality: {
      level: 5,
      masking: 'full',
      displayName: 'Nationality',
      description: 'National origin',
    },

    // Level 5 - Emergency Contact
    emergency_contact_name: {
      level: 5,
      masking: 'partial',
      displayName: 'Emergency Contact Name',
      description: 'Name of emergency contact',
    },
    emergency_contact_relationship: {
      level: 5,
      masking: 'none',
      displayName: 'Emergency Contact Relationship',
      description: 'Relationship to emergency contact',
    },
    emergency_contact_phone: {
      level: 5,
      masking: 'phone',
      displayName: 'Emergency Contact Phone',
      description: 'Phone number of emergency contact',
    },
    emergency_contact_email: {
      level: 5,
      masking: 'email',
      displayName: 'Emergency Contact Email',
      description: 'Email of emergency contact',
    },
    emergency_contact_address: {
      level: 5,
      masking: 'partial',
      displayName: 'Emergency Contact Address',
      description: 'Address of emergency contact',
    },

    // Level 6 - Employment Details
    company_start_date: {
      level: 6,
      masking: 'date',
      displayName: 'Start Date',
      description: 'Employment start date',
    },
    company_hire_date: {
      level: 6,
      masking: 'date',
      displayName: 'Hire Date',
      description: 'Original hire date',
    },
    company_termination_date: {
      level: 6,
      masking: 'date',
      displayName: 'Termination Date',
      description: 'Employment end date',
    },
    company_employment_type: {
      level: 6,
      masking: 'none',
      displayName: 'Employment Type',
      description: 'Full-time, part-time, contractor, etc.',
    },
    company_phone: {
      level: 6,
      masking: 'phone',
      displayName: 'Work Phone',
      description: 'Office phone number',
    },
    company_phone_ext: {
      level: 6,
      masking: 'none',
      displayName: 'Work Phone Extension',
      description: 'Office phone extension',
    },

    // Level 7 - Basic Company Info
    company_email: {
      level: 7,
      masking: 'none',
      displayName: 'Work Email',
      description: 'Company email address',
    },
    company_title: {
      level: 7,
      masking: 'none',
      displayName: 'Job Title',
      description: 'Current job title',
    },
    company_department: {
      level: 7,
      masking: 'none',
      displayName: 'Department',
      description: 'Department assignment',
    },
    company_division: {
      level: 7,
      masking: 'none',
      displayName: 'Division',
      description: 'Division assignment',
    },
    company_location: {
      level: 7,
      masking: 'none',
      displayName: 'Work Location',
      description: 'Office location',
    },
    company_employee_id: {
      level: 7,
      masking: 'none',
      displayName: 'Employee ID',
      description: 'Internal employee identifier',
    },
    company_avatar_url: {
      level: 7,
      masking: 'none',
      displayName: 'Company Avatar',
      description: 'Company profile picture URL',
    },

    // Level 8 - Public/Basic Info
    personal_first_name: {
      level: 8,
      masking: 'none',
      displayName: 'First Name',
      description: 'Legal first name',
    },
    personal_preferred_name: {
      level: 8,
      masking: 'none',
      displayName: 'Preferred Name',
      description: 'Preferred name or nickname',
    },
    personal_last_name: {
      level: 8,
      masking: 'none',
      displayName: 'Last Name',
      description: 'Legal last name',
    },
    personal_avatar_url: {
      level: 8,
      masking: 'none',
      displayName: 'Personal Avatar',
      description: 'Personal profile picture URL',
    },
  },

  core_user_compensation: {
    // Level 2 - Banking (system minimum level 2)
    bank_account_type: {
      level: 2,
      masking: 'full',
      displayName: 'Bank Account Type',
      description: 'Checking, savings, etc.',
      minLevel: 2,
      isSystem: true,
    },
    bank_name: {
      level: 2,
      masking: 'partial',
      displayName: 'Bank Name',
      description: 'Name of financial institution',
      minLevel: 2,
      isSystem: true,
    },
    bank_routing_number: {
      level: 2,
      masking: 'partial',
      displayName: 'Routing Number',
      description: 'Bank routing number',
      minLevel: 2,
      isSystem: true,
    },
    bank_account_number: {
      level: 2,
      masking: 'last4',
      displayName: 'Account Number',
      description: 'Bank account number',
      minLevel: 2,
      isSystem: true,
    },
    bank_account_holder_name: {
      level: 2,
      masking: 'partial',
      displayName: 'Account Holder Name',
      description: 'Name on bank account',
      minLevel: 2,
      isSystem: true,
    },

    // Level 3 - Compensation (system minimum level 3)
    pay_type: {
      level: 3,
      masking: 'full',
      displayName: 'Pay Type',
      description: 'Salary, hourly, etc.',
      minLevel: 3,
      isSystem: true,
    },
    pay_rate: {
      level: 3,
      masking: 'currency',
      displayName: 'Pay Rate',
      description: 'Compensation rate',
      minLevel: 3,
      isSystem: true,
    },
    pay_currency: {
      level: 3,
      masking: 'none',
      displayName: 'Pay Currency',
      description: 'Currency code (USD, EUR, etc.)',
      minLevel: 3,
      isSystem: true,
    },
    pay_frequency: {
      level: 3,
      masking: 'none',
      displayName: 'Pay Frequency',
      description: 'Weekly, bi-weekly, monthly, etc.',
      minLevel: 3,
      isSystem: true,
    },
    config_overtime_rate: {
      level: 3,
      masking: 'currency',
      displayName: 'Overtime Rate',
      description: 'Overtime pay multiplier or rate',
      minLevel: 3,
      isSystem: true,
    },
  },

  core_user_tax: {
    tax_w4_filing_status: {
      level: 2,
      masking: 'full',
      displayName: 'Filing Status',
      description: 'W-4 filing status',
      minLevel: 2,
      isSystem: true,
    },
    tax_w4_additional_withholding: {
      level: 2,
      masking: 'currency',
      displayName: 'Additional Withholding',
      description: 'Extra tax withholding amount',
      minLevel: 2,
      isSystem: true,
    },
    tax_w4_allowances: {
      level: 2,
      masking: 'full',
      displayName: 'Tax Allowances',
      description: 'Number of allowances claimed',
      minLevel: 2,
      isSystem: true,
    },
    tax_state_withholding: {
      level: 2,
      masking: 'currency',
      displayName: 'State Withholding',
      description: 'State tax withholding',
      minLevel: 2,
      isSystem: true,
    },
  },

  core_user_deductions: {
    config_flat_amount: {
      level: 3,
      masking: 'currency',
      displayName: 'Flat Amount',
      description: 'Fixed deduction amount',
      minLevel: 3,
    },
    config_percentage: {
      level: 3,
      masking: 'full',
      displayName: 'Percentage',
      description: 'Percentage-based deduction',
      minLevel: 3,
    },
  },
}

// Role sensitivity level assignments
const ROLE_SENSITIVITY_LEVELS: Record<string, number> = {
  super_admin: 1, // Can see everything
  admin: 2, // Can see most things except SSN
  hr_manager: 2, // Full HR access
  payroll_admin: 1, // Needs to see banking and pay
  manager: 5, // Can see personal contact info of reports
  employee: 8, // Can only see basic info
}

async function main() {
  const slug = process.argv[2]

  if (!slug) {
    console.error('Usage: npx tsx scripts/seed-field-sensitivity.ts <tenant-slug>')
    process.exit(1)
  }

  const parentDbUrl = process.env.DATABASE_URL
  if (!parentDbUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`Looking up tenant: ${slug}`)

  // Get tenant connection string from parent DB
  const parentSql = neon(parentDbUrl)
  const parentDb = drizzle(parentSql, { schema: parentSchema })

  const [tenant] = await parentDb
    .select({
      connectionString: parentSchema.parentTenants.connection_string,
      companyName: parentSchema.parentTenants.info_company_name,
    })
    .from(parentSchema.parentTenants)
    .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
    .limit(1)

  if (!tenant || !tenant.connectionString) {
    console.error(`Tenant "${slug}" not found or has no connection string`)
    process.exit(1)
  }

  console.log(`Found tenant: ${tenant.companyName}`)
  console.log('Connecting to tenant database...')

  // Connect to tenant database
  const tenantSql = neon(tenant.connectionString)

  // Seed field sensitivity configurations
  console.log('\n📊 Seeding field sensitivity configurations...')
  let totalFields = 0

  for (const [tableName, fields] of Object.entries(FIELD_SENSITIVITY)) {
    console.log(`\n   Table: ${tableName}`)

    for (const [fieldName, config] of Object.entries(fields)) {
      await tenantSql`
        INSERT INTO rbac_field_sensitivity (
          info_table_name,
          info_field_name,
          info_display_name,
          info_description,
          config_sensitivity_level,
          config_masking_type,
          config_is_system,
          config_min_level
        ) VALUES (
          ${tableName},
          ${fieldName},
          ${config.displayName},
          ${config.description || null},
          ${config.level},
          ${config.masking},
          ${config.isSystem || false},
          ${config.minLevel || null}
        )
        ON CONFLICT (info_table_name, info_field_name) DO UPDATE SET
          info_display_name = EXCLUDED.info_display_name,
          info_description = EXCLUDED.info_description,
          config_sensitivity_level = EXCLUDED.config_sensitivity_level,
          config_masking_type = EXCLUDED.config_masking_type,
          config_is_system = EXCLUDED.config_is_system,
          config_min_level = EXCLUDED.config_min_level,
          meta_updated_at = NOW()
      `
      totalFields++
    }

    console.log(`      ✅ ${Object.keys(fields).length} fields`)
  }

  console.log(`\n   Total fields configured: ${totalFields}`)

  // Update role sensitivity levels
  console.log('\n👤 Updating role sensitivity levels...')

  for (const [roleCode, level] of Object.entries(ROLE_SENSITIVITY_LEVELS)) {
    const result = await tenantSql`
      UPDATE rbac_roles
      SET config_max_sensitivity_level = ${level}
      WHERE info_code = ${roleCode}
      RETURNING info_code, info_name
    `

    if (result.length > 0) {
      console.log(`   ✅ ${roleCode}: level ${level}`)
    } else {
      console.log(`   ⚠️ ${roleCode}: not found (skipped)`)
    }
  }

  // Build and update the JSONB cache in settings_company
  console.log('\n📦 Building sensitivity cache...')

  const allFields = await tenantSql`
    SELECT info_table_name, info_field_name, config_sensitivity_level, config_masking_type
    FROM rbac_field_sensitivity
    ORDER BY info_table_name, info_field_name
  `

  const cache: Record<string, Record<string, { level: number; masking: string }>> = {}

  for (const field of allFields) {
    if (!cache[field.info_table_name]) {
      cache[field.info_table_name] = {}
    }
    cache[field.info_table_name][field.info_field_name] = {
      level: field.config_sensitivity_level,
      masking: field.config_masking_type,
    }
  }

  await tenantSql`
    UPDATE settings_company
    SET config_field_sensitivity = ${JSON.stringify(cache)}::jsonb
  `

  console.log(`   ✅ Cache built with ${allFields.length} fields`)

  console.log('\n🎉 Field sensitivity seeding completed successfully!')
}

main().catch(console.error)
