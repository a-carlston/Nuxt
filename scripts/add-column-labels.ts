import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

async function addColumnLabels() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  // Check if column exists
  const check = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'settings_company'
    AND column_name = 'config_column_labels'
  `

  if (check.length > 0) {
    console.log('✅ Column config_column_labels already exists')
    return
  }

  // Add the column
  await sql`
    ALTER TABLE settings_company
    ADD COLUMN IF NOT EXISTS config_column_labels jsonb
  `

  console.log('✅ Added config_column_labels column to settings_company')
}

addColumnLabels().catch(console.error)
