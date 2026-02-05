import { eq, and } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacUserRoles, rbacRoles } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission, clearPermissionCache } from '../../../../../utils/permissions'

/**
 * DELETE /api/tenant/[slug]/rbac/user-roles/[userId]
 *
 * Remove a role assignment from a user.
 * Requires rbac.assign_roles permission.
 *
 * Query params:
 * - roleId: string (required) - The role to remove
 * - scopeType: string (optional) - The scope type to match
 * - scopeId: string (optional) - The scope ID to match
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const userId = getRouterParam(event, 'userId')
  const query = getQuery(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
    })
  }

  if (!query.roleId) {
    throw createError({
      statusCode: 400,
      message: 'roleId query parameter is required',
    })
  }

  // Require authentication and tenant access
  const session = requireTenantAccess(event, slug)
  const parentDb = useParentDb()

  try {
    // Get tenant connection string
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status,
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found',
      })
    }

    if (tenant.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This workspace is currently inactive',
      })
    }

    if (!tenant.connectionString) {
      throw createError({
        statusCode: 500,
        message: 'Workspace database not configured',
      })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Check permission to assign/remove roles
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    const canAssign = checkPermission(permissionCache, 'rbac.assign_roles')

    if (!canAssign.allowed) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to remove roles',
      })
    }

    // Get the role to check if it's super_admin
    const [role] = await tenantDb
      .select({
        code: rbacRoles.info_code,
      })
      .from(rbacRoles)
      .where(eq(rbacRoles.meta_id, query.roleId as string))
      .limit(1)

    if (role?.code === 'super_admin') {
      // Only super admins can remove the super_admin role
      const isSuperAdmin = permissionCache.roles.some((r: { code: string }) => r.code === 'super_admin')
      if (!isSuperAdmin) {
        throw createError({
          statusCode: 403,
          message: 'Only Super Administrators can remove the Super Administrator role',
        })
      }
    }

    // Build delete conditions
    const conditions = [
      eq(rbacUserRoles.ref_user_id, userId),
      eq(rbacUserRoles.ref_role_id, query.roleId as string),
    ]

    if (query.scopeType) {
      conditions.push(eq(rbacUserRoles.info_scope_type, query.scopeType as string))
    }

    if (query.scopeId) {
      conditions.push(eq(rbacUserRoles.info_scope_id, query.scopeId as string))
    }

    // Delete the role assignment
    const deleted = await tenantDb
      .delete(rbacUserRoles)
      .where(and(...conditions))
      .returning({ id: rbacUserRoles.meta_id })

    if (deleted.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Role assignment not found',
      })
    }

    // Clear the target user's permission cache
    clearPermissionCache(userId)

    return {
      success: true,
      message: 'Role assignment removed',
      data: { deletedCount: deleted.length },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error removing role:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to remove role',
    })
  }
})
