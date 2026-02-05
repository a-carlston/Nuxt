/**
 * Migration Script: Convert numeric sensitivity to 4-tier system
 *
 * This script:
 * 1. Adds config_sensitivity and config_order columns to rbac_field_sensitivity
 * 2. Converts config_max_sensitivity_level to config_sensitivity_access in rbac_roles
 * 3. Maps existing numeric levels to tiers:
 *    - 1-2 → sensitive
 *    - 3-4 → company
 *    - 5-6 → personal
 *    - 7-10 → basic
 *
 * Usage: npx tsx scripts/migrate-sensitivity-tiers.ts
 */

import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

const parentConnectionString = process.env.DATABASE_URL
if (!parentConnectionString) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const parentSql = neon(parentConnectionString)
const parentDb = drizzle(parentSql, { schema: parentSchema })

async function migrateTenant(connectionString: string, tenantSlug: string) {
  console.log(`\n--- Migrating tenant: ${tenantSlug} ---`)

  const sql = neon(connectionString)

  try {
    // 1. Add new columns to rbac_field_sensitivity if they don't exist
    console.log('  Adding config_sensitivity and config_order columns...')
    await sql`
      ALTER TABLE rbac_field_sensitivity
      ADD COLUMN IF NOT EXISTS config_sensitivity VARCHAR(20) DEFAULT 'basic',
      ADD COLUMN IF NOT EXISTS config_order INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS config_min_sensitivity VARCHAR(20)
    `

    // 2. Migrate existing numeric levels to tiers
    console.log('  Converting numeric levels to tiers...')
    await sql`
      UPDATE rbac_field_sensitivity
      SET config_sensitivity = CASE
        WHEN config_sensitivity_level <= 2 THEN 'sensitive'
        WHEN config_sensitivity_level <= 4 THEN 'company'
        WHEN config_sensitivity_level <= 6 THEN 'personal'
        ELSE 'basic'
      END,
      config_min_sensitivity = CASE
        WHEN config_min_level IS NOT NULL THEN
          CASE
            WHEN config_min_level <= 2 THEN 'sensitive'
            WHEN config_min_level <= 4 THEN 'company'
            WHEN config_min_level <= 6 THEN 'personal'
            ELSE 'basic'
          END
        ELSE NULL
      END
      WHERE config_sensitivity_level IS NOT NULL
    `

    // 3. Add config_sensitivity_access to rbac_roles if it doesn't exist
    console.log('  Adding config_sensitivity_access to rbac_roles...')
    await sql`
      ALTER TABLE rbac_roles
      ADD COLUMN IF NOT EXISTS config_sensitivity_access VARCHAR(20) DEFAULT 'basic'
    `

    // 4. Migrate existing numeric levels to tiers in roles
    console.log('  Converting role sensitivity levels to tiers...')
    await sql`
      UPDATE rbac_roles
      SET config_sensitivity_access = CASE
        WHEN config_max_sensitivity_level <= 2 THEN 'sensitive'
        WHEN config_max_sensitivity_level <= 4 THEN 'company'
        WHEN config_max_sensitivity_level <= 6 THEN 'personal'
        ELSE 'basic'
      END
      WHERE config_max_sensitivity_level IS NOT NULL
    `

    // 5. Create index on new columns
    console.log('  Creating indexes...')
    await sql`
      CREATE INDEX IF NOT EXISTS rbac_field_sensitivity_sensitivity_idx
      ON rbac_field_sensitivity(config_sensitivity)
    `

    console.log(`  ✓ Tenant ${tenantSlug} migrated successfully`)
  } catch (error) {
    console.error(`  ✗ Error migrating tenant ${tenantSlug}:`, error)
    throw error
  }
}

async function main() {
  console.log('=== Sensitivity Tier Migration ===')
  console.log('Converting numeric sensitivity levels (1-10) to 4-tier system')

  // Get all active tenants
  const tenants = await parentDb
    .select({
      slug: parentSchema.parentTenants.info_company_slug,
      connectionString: parentSchema.parentTenants.connection_string,
      status: parentSchema.parentTenants.meta_status,
    })
    .from(parentSchema.parentTenants)
    .where(eq(parentSchema.parentTenants.meta_status, 'active'))

  console.log(`Found ${tenants.length} active tenants`)

  let successCount = 0
  let errorCount = 0

  for (const tenant of tenants) {
    if (!tenant.connectionString) {
      console.log(`  Skipping ${tenant.slug}: No connection string`)
      continue
    }

    try {
      await migrateTenant(tenant.connectionString, tenant.slug)
      successCount++
    } catch {
      errorCount++
    }
  }

  console.log('\n=== Migration Complete ===')
  console.log(`  Success: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
}

main().catch(console.error)
