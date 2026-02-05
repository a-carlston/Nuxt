import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

/**
 * Migrate tenant database to add field sensitivity features
 * Usage: npx tsx scripts/migrate-field-sensitivity.ts <tenant-slug>
 *
 * This script:
 * 1. Adds config_max_sensitivity_level column to rbac_roles
 * 2. Creates rbac_field_sensitivity table
 * 3. Seeds default field sensitivity configurations
 */

async function main() {
  const slug = process.argv[2]

  if (!slug) {
    console.error('Usage: npx tsx scripts/migrate-field-sensitivity.ts <tenant-slug>')
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

  // Step 1: Add config_max_sensitivity_level to rbac_roles if it doesn't exist
  console.log('\n📋 Step 1: Adding config_max_sensitivity_level to rbac_roles...')
  try {
    await tenantSql`
      ALTER TABLE rbac_roles
      ADD COLUMN IF NOT EXISTS config_max_sensitivity_level INTEGER NOT NULL DEFAULT 7
    `
    console.log('   ✅ Column added (or already exists)')
  } catch (error) {
    console.log('   ⚠️ Column may already exist:', error)
  }

  // Step 2: Create rbac_field_sensitivity table
  console.log('\n📋 Step 2: Creating rbac_field_sensitivity table...')
  await tenantSql`
    CREATE TABLE IF NOT EXISTS rbac_field_sensitivity (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      info_table_name VARCHAR(100) NOT NULL,
      info_field_name VARCHAR(100) NOT NULL,
      info_display_name VARCHAR(150),
      info_description TEXT,
      config_sensitivity_level INTEGER NOT NULL DEFAULT 7,
      config_masking_type VARCHAR(20) DEFAULT 'full',
      config_is_system BOOLEAN NOT NULL DEFAULT FALSE,
      config_min_level INTEGER,
      ref_updated_by UUID,
      CONSTRAINT rbac_field_sensitivity_unique UNIQUE(info_table_name, info_field_name)
    )
  `
  console.log('   ✅ Table created (or already exists)')

  // Step 3: Create indexes
  console.log('\n📋 Step 3: Creating indexes...')
  try {
    await tenantSql`
      CREATE INDEX IF NOT EXISTS rbac_field_sensitivity_table_idx
      ON rbac_field_sensitivity(info_table_name)
    `
    await tenantSql`
      CREATE INDEX IF NOT EXISTS rbac_field_sensitivity_level_idx
      ON rbac_field_sensitivity(config_sensitivity_level)
    `
    console.log('   ✅ Indexes created')
  } catch (error) {
    console.log('   ⚠️ Indexes may already exist')
  }

  // Step 4: Update default sensitivity levels for system roles
  console.log('\n📋 Step 4: Setting default sensitivity levels for roles...')
  const roleDefaults = [
    { code: 'super_admin', level: 1 },
    { code: 'admin', level: 2 },
    { code: 'hr_manager', level: 3 },
    { code: 'payroll_admin', level: 3 },
    { code: 'manager', level: 5 },
    { code: 'employee', level: 7 },
  ]

  for (const { code, level } of roleDefaults) {
    const result = await tenantSql`
      UPDATE rbac_roles
      SET config_max_sensitivity_level = ${level}
      WHERE info_code = ${code}
      RETURNING info_name
    `
    if (result.length > 0) {
      console.log(`   ✅ ${result[0].info_name}: level ${level}`)
    }
  }

  // Step 5: Seed default field sensitivity configurations
  console.log('\n📋 Step 5: Seeding default field sensitivity configurations...')

  const defaultFields = [
    // Sensitive (level 1-3)
    { table: 'core_users', field: 'personal_ssn', display: 'SSN', level: 1, min: 1, masking: 'last4', system: true },
    { table: 'core_users', field: 'tax_ssn', display: 'Tax SSN', level: 1, min: 1, masking: 'last4', system: true },
    { table: 'core_users', field: 'tax_id', display: 'Tax ID', level: 1, min: 1, masking: 'last4', system: true },
    { table: 'core_user_banking', field: 'bank_account_number', display: 'Account Number', level: 2, min: 2, masking: 'last4', system: true },
    { table: 'core_user_banking', field: 'bank_routing_number', display: 'Routing Number', level: 2, min: 2, masking: 'partial', system: true },
    { table: 'core_user_compensation', field: 'pay_rate', display: 'Pay Rate', level: 3, min: 3, masking: 'currency', system: true },
    { table: 'core_user_compensation', field: 'pay_salary', display: 'Salary', level: 3, min: 3, masking: 'currency', system: true },

    // Personal (level 4-6)
    { table: 'core_users', field: 'personal_dob', display: 'Date of Birth', level: 4, masking: 'date', system: false },
    { table: 'core_users', field: 'personal_address_line1', display: 'Address Line 1', level: 4, masking: 'partial', system: false },
    { table: 'core_users', field: 'personal_address_line2', display: 'Address Line 2', level: 4, masking: 'partial', system: false },
    { table: 'core_users', field: 'personal_email', display: 'Personal Email', level: 5, masking: 'email', system: false },
    { table: 'core_users', field: 'personal_phone', display: 'Personal Phone', level: 5, masking: 'phone', system: false },
    { table: 'core_users', field: 'emergency_contact_name', display: 'Emergency Contact Name', level: 5, masking: 'partial', system: false },
    { table: 'core_users', field: 'emergency_contact_phone', display: 'Emergency Contact Phone', level: 5, masking: 'phone', system: false },

    // Basic (level 7-10)
    { table: 'core_users', field: 'company_title', display: 'Job Title', level: 8, masking: 'none', system: false },
    { table: 'core_users', field: 'company_department', display: 'Department', level: 8, masking: 'none', system: false },
    { table: 'core_users', field: 'personal_first_name', display: 'First Name', level: 9, masking: 'none', system: false },
    { table: 'core_users', field: 'personal_last_name', display: 'Last Name', level: 9, masking: 'none', system: false },
    { table: 'core_users', field: 'company_work_email', display: 'Work Email', level: 9, masking: 'none', system: false },
  ]

  for (const field of defaultFields) {
    await tenantSql`
      INSERT INTO rbac_field_sensitivity (
        info_table_name,
        info_field_name,
        info_display_name,
        config_sensitivity_level,
        config_min_level,
        config_masking_type,
        config_is_system
      )
      VALUES (
        ${field.table},
        ${field.field},
        ${field.display},
        ${field.level},
        ${field.min || null},
        ${field.masking},
        ${field.system}
      )
      ON CONFLICT (info_table_name, info_field_name)
      DO UPDATE SET
        info_display_name = EXCLUDED.info_display_name,
        config_sensitivity_level = COALESCE(
          NULLIF(rbac_field_sensitivity.config_sensitivity_level, 7),
          EXCLUDED.config_sensitivity_level
        )
    `
  }
  console.log(`   ✅ Seeded ${defaultFields.length} field configurations`)

  console.log('\n🎉 Field sensitivity migration completed successfully!')
}

main().catch(console.error)
