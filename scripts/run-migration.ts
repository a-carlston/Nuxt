import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as parentSchema from '../server/db/schema/parent'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Run a migration SQL file against a tenant database
 * Usage: npx tsx scripts/run-migration.ts <tenant-slug> <migration-file>
 *
 * Example: npx tsx scripts/run-migration.ts lawnstarter 0003_role_groups_tags.sql
 */

async function main() {
  const slug = process.argv[2]
  const migrationFile = process.argv[3]

  if (!slug || !migrationFile) {
    console.error('Usage: npx tsx scripts/run-migration.ts <tenant-slug> <migration-file>')
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

  // Read migration file
  const migrationPath = path.join(__dirname, '../server/db/migrations', migrationFile)
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
  console.log(`\nRunning migration: ${migrationFile}`)

  // Connect to tenant database
  const tenantSql = neon(tenant.connectionString)

  // Split by statement breakpoint and run each statement
  const statements = migrationSql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  console.log(`Found ${statements.length} statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    // Skip comments-only statements
    const cleanStmt = stmt.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim()
    if (!cleanStmt) continue

    try {
      console.log(`[${i + 1}/${statements.length}] Executing...`)
      await tenantSql.unsafe(cleanStmt)
      console.log(`   ✅ Success`)
    } catch (e: any) {
      // Ignore "already exists" errors for IF NOT EXISTS statements
      if (e.code === '42P07' || e.code === '42710' || e.message?.includes('already exists')) {
        console.log(`   ⚠️ Already exists (skipping)`)
      } else {
        console.error(`   ❌ Error:`, e.message || e)
      }
    }
  }

  console.log('\n🎉 Migration completed!')
}

main().catch(console.error)
