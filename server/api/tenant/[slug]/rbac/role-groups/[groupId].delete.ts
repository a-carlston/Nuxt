import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleGroups, rbacRoles } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * DELETE /api/tenant/[slug]/rbac/role-groups/[groupId]
 *
 * Delete a role group. Roles in the group will become ungrouped.
 * Requires rbac.manage permission.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const groupId = getRouterParam(event, 'groupId')

  if (!slug || !groupId) {
    throw createError({ statusCode: 400, message: 'Slug and groupId are required' })
  }

  const session = requireTenantAccess(event, slug)
  const parentDb = useParentDb()

  try {
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status,
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant || tenant.status !== 'active' || !tenant.connectionString) {
      throw createError({ statusCode: 404, message: 'Workspace not found or inactive' })
    }

    const tenantDb = useTenantDb(tenant.connectionString)

    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    if (!checkPermission(permissionCache, 'rbac.manage')) {
      throw createError({ statusCode: 403, message: 'Permission denied' })
    }

    // Ungroup any roles in this group first
    await tenantDb
      .update(rbacRoles)
      .set({ ref_group_id: null })
      .where(eq(rbacRoles.ref_group_id, groupId))

    // Delete the group
    const [deleted] = await tenantDb
      .delete(rbacRoleGroups)
      .where(eq(rbacRoleGroups.meta_id, groupId))
      .returning({ id: rbacRoleGroups.meta_id })

    if (!deleted) {
      throw createError({ statusCode: 404, message: 'Group not found' })
    }

    return { success: true }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('Error deleting role group:', error)
    throw createError({ statusCode: 500, message: 'Failed to delete role group' })
  }
})
