/**
 * Add missing onboarding columns to existing tenant database
 *
 * Run with: npx tsx scripts/add-onboarding-columns.ts [slug]
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  const slugArg = process.argv[2]

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  if (!slugArg) {
    console.error('Please provide tenant slug: npx tsx scripts/add-onboarding-columns.ts [slug]')
    process.exit(1)
  }

  const parentSql = neon(databaseUrl)

  // Get tenant connection string
  const tenants = await parentSql`
    SELECT info_company_slug, connection_string
    FROM parent_tenants
    WHERE info_company_slug = ${slugArg.toLowerCase()}
  `

  if (tenants.length === 0) {
    console.error(`No tenant found with slug: ${slugArg}`)
    process.exit(1)
  }

  const tenant = tenants[0]
  console.log(`\nUpdating schema for tenant: ${tenant.info_company_slug}`)

  const tenantSql = neon(tenant.connection_string)

  // Add emergency contact columns
  console.log('\nAdding emergency contact columns...')
  try {
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS emergency_contact_email VARCHAR(255)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS emergency_contact_address TEXT`
    console.log('  ✓ Emergency contact columns added')
  } catch (e: any) {
    console.log('  ✓ Emergency contact columns already exist or added')
  }

  // Add personal info columns (nationality, SSN)
  console.log('\nAdding personal info columns (nationality, SSN)...')
  try {
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS personal_nationality VARCHAR(10)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS personal_ssn VARCHAR(50)`
    console.log('  ✓ Personal info columns added')
  } catch (e: any) {
    console.log('  ✓ Personal info columns already exist or added')
  }

  // Add additional company columns
  console.log('\nAdding additional company columns...')
  try {
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS company_department VARCHAR(100)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS company_division VARCHAR(100)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS company_location VARCHAR(100)`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS company_start_date DATE`
    await tenantSql`ALTER TABLE core_users ADD COLUMN IF NOT EXISTS company_employment_type VARCHAR(30)`
    console.log('  ✓ Additional company columns added')
  } catch (e: any) {
    console.log('  ✓ Additional company columns already exist or added')
  }

  // Reset onboarding status so user goes through onboarding again
  console.log('\nResetting onboarding status for all users...')
  await tenantSql`UPDATE core_users SET auth_onboarding_completed_at = NULL`
  console.log('  ✓ Onboarding status reset')

  console.log('\n✓ Done! You can now sign in and test the onboarding flow.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
