import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

/**
 * Reset RBAC to fresh state (like a new company)
 * Usage: npx tsx scripts/reset-rbac.ts <tenant-slug>
 *
 * This script:
 * - Deletes all custom roles (keeps super_admin)
 * - Deletes all role groups
 * - Deletes all role tags
 * - Re-seeds permissions and super_admin role
 */

// Permission definitions (same as seed-rbac.ts)
const PERMISSIONS = [
  // Dashboard (scoped)
  { code: 'dashboard.view.self', name: 'View own dashboard', category: 'dashboard' },
  { code: 'dashboard.view.direct_reports', name: 'View direct reports dashboard', category: 'dashboard' },
  { code: 'dashboard.view.department', name: 'View department dashboard', category: 'dashboard' },
  { code: 'dashboard.view.division', name: 'View division dashboard', category: 'dashboard' },
  { code: 'dashboard.view.company', name: 'View company dashboard', category: 'dashboard' },
  { code: 'dashboard.edit.self', name: 'Edit own dashboard', category: 'dashboard' },
  { code: 'dashboard.edit.company', name: 'Edit company dashboard', category: 'dashboard' },
  { code: 'dashboard.create', name: 'Create dashboard widgets', category: 'dashboard' },
  { code: 'dashboard.delete', name: 'Delete dashboard widgets', category: 'dashboard' },

  // Profile (scoped with data levels)
  { code: 'profile.view.basic.self', name: 'View own profile basic', category: 'profile' },
  { code: 'profile.view.basic.company', name: 'View all profiles basic', category: 'profile' },
  { code: 'profile.view.personal.self', name: 'View own profile personal', category: 'profile' },
  { code: 'profile.view.personal.company', name: 'View all profiles personal', category: 'profile' },
  { code: 'profile.view.sensitive.self', name: 'View own profile sensitive', category: 'profile' },
  { code: 'profile.view.sensitive.company', name: 'View all profiles sensitive', category: 'profile' },
  { code: 'profile.edit.basic.self', name: 'Edit own profile basic', category: 'profile' },
  { code: 'profile.edit.basic.company', name: 'Edit all profiles basic', category: 'profile' },
  { code: 'profile.edit.personal.self', name: 'Edit own profile personal', category: 'profile' },
  { code: 'profile.edit.personal.company', name: 'Edit all profiles personal', category: 'profile' },
  { code: 'profile.edit.sensitive.self', name: 'Edit own profile sensitive', category: 'profile' },
  { code: 'profile.edit.sensitive.company', name: 'Edit all profiles sensitive', category: 'profile' },
  { code: 'profile.create', name: 'Create profiles', category: 'profile' },
  { code: 'profile.delete', name: 'Delete profiles', category: 'profile' },

  // Users - Basic
  { code: 'users.view.basic.self', name: 'View own basic info', category: 'users' },
  { code: 'users.view.basic.direct_reports', name: 'View direct reports basic info', category: 'users' },
  { code: 'users.view.basic.department', name: 'View department basic info', category: 'users' },
  { code: 'users.view.basic.company', name: 'View all users basic info', category: 'users' },

  // Users - Personal
  { code: 'users.view.personal.self', name: 'View own personal info', category: 'users' },
  { code: 'users.view.personal.direct_reports', name: 'View direct reports personal info', category: 'users' },
  { code: 'users.view.personal.department', name: 'View department personal info', category: 'users' },
  { code: 'users.view.personal.company', name: 'View all users personal info', category: 'users' },

  // Users - Sensitive
  { code: 'users.view.sensitive.self', name: 'View own sensitive info', category: 'users' },
  { code: 'users.view.sensitive.direct_reports', name: 'View direct reports sensitive info', category: 'users' },
  { code: 'users.view.sensitive.department', name: 'View department sensitive info', category: 'users' },
  { code: 'users.view.sensitive.company', name: 'View all users sensitive info', category: 'users' },

  // Users - Edit Basic
  { code: 'users.edit.basic.self', name: 'Edit own basic info', category: 'users' },
  { code: 'users.edit.basic.direct_reports', name: 'Edit direct reports basic info', category: 'users' },
  { code: 'users.edit.basic.department', name: 'Edit department basic info', category: 'users' },
  { code: 'users.edit.basic.company', name: 'Edit all users basic info', category: 'users' },

  // Users - Edit Personal
  { code: 'users.edit.personal.self', name: 'Edit own personal info', category: 'users' },
  { code: 'users.edit.personal.direct_reports', name: 'Edit direct reports personal info', category: 'users' },
  { code: 'users.edit.personal.department', name: 'Edit department personal info', category: 'users' },
  { code: 'users.edit.personal.company', name: 'Edit all users personal info', category: 'users' },

  // Users - Edit Sensitive
  { code: 'users.edit.sensitive.self', name: 'Edit own sensitive info', category: 'users' },
  { code: 'users.edit.sensitive.direct_reports', name: 'Edit direct reports sensitive info', category: 'users' },
  { code: 'users.edit.sensitive.department', name: 'Edit department sensitive info', category: 'users' },
  { code: 'users.edit.sensitive.company', name: 'Edit all users sensitive info', category: 'users' },

  // Users - Management
  { code: 'users.create', name: 'Create users', category: 'users' },
  { code: 'users.delete', name: 'Delete users', category: 'users' },
  { code: 'users.export', name: 'Export user data', category: 'users' },

  // Compensation
  { code: 'compensation.view.self', name: 'View own compensation', category: 'compensation' },
  { code: 'compensation.view.direct_reports', name: 'View direct reports compensation', category: 'compensation' },
  { code: 'compensation.view.department', name: 'View department compensation', category: 'compensation' },
  { code: 'compensation.view.company', name: 'View all compensation', category: 'compensation' },
  { code: 'compensation.edit.direct_reports', name: 'Edit direct reports compensation', category: 'compensation' },
  { code: 'compensation.edit.department', name: 'Edit department compensation', category: 'compensation' },
  { code: 'compensation.edit.company', name: 'Edit all compensation', category: 'compensation' },

  // Banking
  { code: 'banking.view.self', name: 'View own banking info', category: 'banking' },
  { code: 'banking.view.company', name: 'View all banking info', category: 'banking' },
  { code: 'banking.edit.self', name: 'Edit own banking info', category: 'banking' },
  { code: 'banking.edit.company', name: 'Edit all banking info', category: 'banking' },

  // Settings (standard actions)
  { code: 'settings.view', name: 'View settings', category: 'settings' },
  { code: 'settings.edit', name: 'Edit settings', category: 'settings' },
  { code: 'settings.create', name: 'Create settings', category: 'settings' },
  { code: 'settings.delete', name: 'Delete settings', category: 'settings' },
  { code: 'settings.manage', name: 'Manage settings', category: 'settings' },

  // RBAC (standard actions)
  { code: 'rbac.view', name: 'View roles and permissions', category: 'rbac' },
  { code: 'rbac.edit', name: 'Edit roles and permissions', category: 'rbac' },
  { code: 'rbac.create', name: 'Create roles and permissions', category: 'rbac' },
  { code: 'rbac.delete', name: 'Delete roles and permissions', category: 'rbac' },
  { code: 'rbac.manage', name: 'Manage roles and permissions', category: 'rbac' },
  { code: 'rbac.assign_roles', name: 'Assign roles to users', category: 'rbac' },

  // Admin section
  { code: 'admin.view', name: 'View admin section', category: 'admin' },
  { code: 'admin.edit', name: 'Edit admin section', category: 'admin' },
  { code: 'admin.create', name: 'Create in admin section', category: 'admin' },
  { code: 'admin.delete', name: 'Delete in admin section', category: 'admin' },

  // Audit
  { code: 'audit.view', name: 'View audit logs', category: 'audit' },
  { code: 'audit.export', name: 'Export audit logs', category: 'audit' },

  // Reports
  { code: 'reports.view', name: 'View reports', category: 'reports' },
  { code: 'reports.create', name: 'Create reports', category: 'reports' },
  { code: 'reports.export', name: 'Export reports', category: 'reports' },
]

async function main() {
  const slug = process.argv[2]

  if (!slug) {
    console.error('Usage: npx tsx scripts/reset-rbac.ts <tenant-slug>')
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

  // Step 1: Delete all role tag assignments
  console.log('\n🗑️  Deleting role tag assignments...')
  try {
    await tenantSql`DELETE FROM rbac_role_tag_assignments`
    console.log('   ✅ Deleted all tag assignments')
  } catch (e) {
    console.log('   ⚠️ Table may not exist:', e)
  }

  // Step 2: Delete all role tags
  console.log('\n🗑️  Deleting role tags...')
  try {
    await tenantSql`DELETE FROM rbac_role_tags`
    console.log('   ✅ Deleted all role tags')
  } catch (e) {
    console.log('   ⚠️ Table may not exist:', e)
  }

  // Step 3: Delete all role groups
  console.log('\n🗑️  Deleting role groups...')
  try {
    // First, unset group references from roles
    await tenantSql`UPDATE rbac_roles SET ref_group_id = NULL`
    await tenantSql`DELETE FROM rbac_role_groups`
    console.log('   ✅ Deleted all role groups')
  } catch (e) {
    console.log('   ⚠️ Table may not exist:', e)
  }

  // Step 4: Delete user-role assignments for non-super_admin roles
  console.log('\n🗑️  Cleaning up user-role assignments...')
  const superAdminRole = await tenantSql`
    SELECT meta_id FROM rbac_roles WHERE info_code = 'super_admin'
  `
  if (superAdminRole.length > 0) {
    await tenantSql`
      DELETE FROM rbac_user_roles
      WHERE ref_role_id != ${superAdminRole[0].meta_id}
    `
    console.log('   ✅ Removed non-super_admin role assignments')
  }

  // Step 5: Delete all role-permission mappings
  console.log('\n🗑️  Deleting role-permission mappings...')
  await tenantSql`DELETE FROM rbac_role_permissions`
  console.log('   ✅ Deleted all role-permission mappings')

  // Step 6: Delete all non-system roles (keep super_admin)
  console.log('\n🗑️  Deleting custom roles...')
  await tenantSql`DELETE FROM rbac_roles WHERE info_code != 'super_admin'`
  console.log('   ✅ Deleted all custom roles')

  // Step 7: Seed/update permissions
  console.log('\n📋 Seeding permissions...')
  for (const perm of PERMISSIONS) {
    await tenantSql`
      INSERT INTO rbac_permissions (info_code, info_name, info_category, config_is_system)
      VALUES (${perm.code}, ${perm.name}, ${perm.category}, true)
      ON CONFLICT (info_code) DO UPDATE SET
        info_name = EXCLUDED.info_name,
        info_category = EXCLUDED.info_category
    `
  }
  console.log(`   ✅ Created/updated ${PERMISSIONS.length} permissions`)

  // Step 8: Create/update super_admin role
  console.log('\n👤 Creating super_admin role...')
  await tenantSql`
    INSERT INTO rbac_roles (info_code, info_name, info_description, config_hierarchy_level, config_is_system)
    VALUES ('super_admin', 'Super Administrator', 'Full system access with no restrictions', 1, true)
    ON CONFLICT (info_code) DO UPDATE SET
      info_name = EXCLUDED.info_name,
      info_description = EXCLUDED.info_description,
      config_hierarchy_level = EXCLUDED.config_hierarchy_level,
      config_is_system = EXCLUDED.config_is_system
  `
  console.log('   ✅ Super Admin role ready')

  // Step 9: Grant all permissions to super_admin
  console.log('\n🔗 Granting all permissions to super_admin...')
  const [role] = await tenantSql`
    SELECT meta_id FROM rbac_roles WHERE info_code = 'super_admin'
  `
  const roleId = role.meta_id

  let permCount = 0
  for (const perm of PERMISSIONS) {
    const [permRow] = await tenantSql`
      SELECT meta_id FROM rbac_permissions WHERE info_code = ${perm.code}
    `
    if (permRow) {
      await tenantSql`
        INSERT INTO rbac_role_permissions (ref_role_id, ref_permission_id)
        VALUES (${roleId}, ${permRow.meta_id})
        ON CONFLICT DO NOTHING
      `
      permCount++
    }
  }
  console.log(`   ✅ Granted ${permCount} permissions to super_admin`)

  // Clear default role setting
  console.log('\n⚙️ Clearing default role setting...')
  try {
    await tenantSql`UPDATE settings_company SET config_default_role_id = NULL`
    console.log('   ✅ Default role cleared')
  } catch {
    console.log('   ⚠️ Could not clear default role')
  }

  console.log('\n🎉 RBAC reset completed!')
  console.log('\n📝 The tenant now has:')
  console.log('   - 1 role: Super Administrator')
  console.log(`   - ${PERMISSIONS.length} permissions`)
  console.log('   - No custom groups or tags')
  console.log('   - No default role (configure in Admin Settings)')
}

main().catch(console.error)
