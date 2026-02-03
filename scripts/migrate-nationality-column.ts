/**
 * Migration script to update personal_nationality column from varchar(10) to varchar(50)
 * Run with: npx tsx scripts/migrate-nationality-column.ts
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { config } from 'dotenv'

// Load environment variables
config()

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log('Connecting to parent database...')
  const parentSql = neon(databaseUrl)

  // Get all tenant connection strings
  console.log('Fetching tenant databases...')
  const tenants = await parentSql`
    SELECT info_company_slug, connection_string
    FROM parent_tenants
    WHERE connection_string IS NOT NULL
  `

  console.log(`Found ${tenants.length} tenant(s)`)

  for (const tenant of tenants) {
    console.log(`\nMigrating tenant: ${tenant.info_company_slug}`)

    try {
      const tenantSql = neon(tenant.connection_string)

      // Check current column size
      const columnInfo = await tenantSql`
        SELECT character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'core_users'
        AND column_name = 'personal_nationality'
      `

      if (columnInfo.length > 0) {
        const currentLength = columnInfo[0].character_maximum_length
        console.log(`  Current column length: ${currentLength}`)

        if (currentLength < 50) {
          console.log('  Updating column to varchar(50)...')
          await tenantSql`
            ALTER TABLE core_users
            ALTER COLUMN personal_nationality TYPE varchar(50)
          `
          console.log('  Done!')
        } else {
          console.log('  Column already has sufficient length, skipping.')
        }
      } else {
        console.log('  Column not found, skipping.')
      }
    } catch (error) {
      console.error(`  Error migrating ${tenant.info_company_slug}:`, error)
    }
  }

  console.log('\nMigration complete!')
}

migrate().catch(console.error)
