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

  // Get tenant info
  const [tenant] = await parentDb
    .select({
      connectionString: parentSchema.parentTenants.connection_string,
    })
    .from(parentSchema.parentTenants)
    .where(eq(parentSchema.parentTenants.info_company_slug, slug))
    .limit(1)

  if (!tenant?.connectionString) {
    console.error('Tenant not found')
    return
  }

  const tenantSql = neon(tenant.connectionString)

  // Check users
  console.log('=== USERS ===')
  const users = await tenantSql`SELECT meta_id, personal_first_name, personal_last_name, personal_email FROM core_users`
  console.log(JSON.stringify(users, null, 2))

  // Check user roles
  console.log('\n=== USER ROLES ===')
  const userRoles = await tenantSql`
    SELECT ur.*, r.info_code as role_code, r.info_name as role_name
    FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.ref_role_id = r.meta_id
  `
  console.log(JSON.stringify(userRoles, null, 2))

  // Check parent users table
  console.log('\n=== PARENT USERS (auth) ===')
  const parentUsers = await parentSql`SELECT id, email, first_name, last_name FROM parent_users`
  console.log(JSON.stringify(parentUsers, null, 2))
}

main().catch(console.error)
