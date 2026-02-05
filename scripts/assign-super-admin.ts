import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

/**
 * Assign super_admin role to a user
 * Usage: npx tsx scripts/assign-super-admin.ts <tenant-slug> <user-id>
 */

async function main() {
  const slug = process.argv[2]
  const userId = process.argv[3]

  if (!slug || !userId) {
    console.error('Usage: npx tsx scripts/assign-super-admin.ts <tenant-slug> <user-id>')
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

  // Connect to tenant database
  const tenantSql = neon(tenant.connectionString)

  // Get super_admin role ID
  const roleResult = await tenantSql`
    SELECT meta_id, info_name FROM rbac_roles WHERE info_code = 'super_admin'
  `

  if (roleResult.length === 0) {
    console.error('super_admin role not found. Run seed-rbac.ts first.')
    process.exit(1)
  }

  const roleId = roleResult[0].meta_id
  console.log(`Found role: ${roleResult[0].info_name} (${roleId})`)

  // Check if user exists
  const userResult = await tenantSql`
    SELECT meta_id, personal_first_name, personal_last_name FROM core_users WHERE meta_id = ${userId}
  `

  if (userResult.length === 0) {
    console.error(`User ${userId} not found`)
    process.exit(1)
  }

  console.log(`Found user: ${userResult[0].personal_first_name} ${userResult[0].personal_last_name}`)

  // Assign role to user
  await tenantSql`
    INSERT INTO rbac_user_roles (ref_user_id, ref_role_id, ref_assigned_by, info_scope_type)
    VALUES (${userId}, ${roleId}, ${userId}, 'global')
    ON CONFLICT (ref_user_id, ref_role_id, info_scope_type, info_scope_id) DO NOTHING
  `

  console.log(`\n✅ Assigned super_admin role to user ${userResult[0].personal_first_name} ${userResult[0].personal_last_name}`)
}

main().catch(console.error)
