import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

async function main() {
  const slug = 'lawnstarter'
  const parentDbUrl = process.env.DATABASE_URL!
  const parentSql = neon(parentDbUrl)
  const parentDb = drizzle(parentSql, { schema: parentSchema })

  const [tenant] = await parentDb
    .select({ connectionString: parentSchema.parentTenants.connection_string })
    .from(parentSchema.parentTenants)
    .where(eq(parentSchema.parentTenants.info_company_slug, slug))
    .limit(1)

  if (!tenant?.connectionString) {
    console.error('Tenant not found')
    return
  }

  const tenantSql = neon(tenant.connectionString)

  // Check which tables exist
  const tables = await tenantSql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `

  console.log('=== Tables in database ===')
  tables.forEach(t => console.log('-', t.table_name))

  // Check specifically for the ones we need
  const neededTables = ['core_user_assignments', 'core_user_supervisors', 'rbac_user_tags', 'rbac_tag_permissions']
  console.log('\n=== Checking required tables ===')
  for (const table of neededTables) {
    const exists = tables.some(t => t.table_name === table)
    console.log(`${exists ? '✅' : '❌'} ${table}`)
  }
}

main().catch(console.error)
