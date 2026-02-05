import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, isNull, or, gte } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'
import * as schema from '../server/db/schema'

async function main() {
  const slug = 'lawnstarter'
  const userId = '8c9cc9c7-df5a-4a8a-8145-9c1fcec54302'

  const parentDbUrl = process.env.DATABASE_URL!
  const parentSql = neon(parentDbUrl)
  const parentDb = drizzle(parentSql, { schema: parentSchema })

  // Get tenant
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
  const tenantDb = drizzle(tenantSql, { schema })

  console.log('=== Simulating loadUserPermissions ===\n')

  // Load user roles
  console.log('1. Loading user roles...')
  const userRoles = await tenantDb
    .select({
      roleCode: schema.rbacRoles.info_code,
      roleName: schema.rbacRoles.info_name,
      hierarchyLevel: schema.rbacRoles.config_hierarchy_level,
      scopeType: schema.rbacUserRoles.info_scope_type,
      scopeId: schema.rbacUserRoles.info_scope_id,
    })
    .from(schema.rbacUserRoles)
    .innerJoin(schema.rbacRoles, eq(schema.rbacUserRoles.ref_role_id, schema.rbacRoles.meta_id))
    .where(
      and(
        eq(schema.rbacUserRoles.ref_user_id, userId),
        eq(schema.rbacRoles.config_is_active, true),
        or(
          isNull(schema.rbacUserRoles.info_expires_at),
          gte(schema.rbacUserRoles.info_expires_at, new Date())
        )
      )
    )

  console.log('User roles:', JSON.stringify(userRoles, null, 2))

  // Load permissions for roles
  console.log('\n2. Loading role permissions...')
  const roleIds = await tenantDb
    .select({ roleId: schema.rbacUserRoles.ref_role_id })
    .from(schema.rbacUserRoles)
    .where(eq(schema.rbacUserRoles.ref_user_id, userId))

  console.log('Role IDs:', roleIds)

  if (roleIds.length > 0) {
    const rolePermissions = await tenantDb
      .select({
        permissionCode: schema.rbacPermissions.info_code,
      })
      .from(schema.rbacRolePermissions)
      .innerJoin(
        schema.rbacPermissions,
        eq(schema.rbacRolePermissions.ref_permission_id, schema.rbacPermissions.meta_id)
      )
      .where(
        or(...roleIds.map((r) => eq(schema.rbacRolePermissions.ref_role_id, r.roleId)))
      )

    console.log('\nPermissions loaded:', rolePermissions.length)
    console.log('Sample permissions:', rolePermissions.slice(0, 10).map(p => p.permissionCode))

    const hasRbacManage = rolePermissions.some(p => p.permissionCode === 'rbac.manage')
    console.log('\n✅ Has rbac.manage permission:', hasRbacManage)
  }
}

main().catch(console.error)
