import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacUserRoles } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission, clearAllPermissionCaches } from '../../../../../utils/permissions'

/**
 * DELETE /api/tenant/[slug]/rbac/roles/[roleId]
 *
 * Delete a role (custom roles only).
 * Requires rbac.manage permission.
 *
 * Note: FK cascade handles cleanup of role_permissions.
 * Users assigned this role will lose it automatically.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roleId = getRouterParam(event, 'roleId')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  if (!roleId) {
    throw createError({
      statusCode: 400,
      message: 'Role ID is required',
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

    // Check permission to manage roles
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    const canManage = checkPermission(permissionCache, 'rbac.manage')

    if (!canManage.allowed) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to manage roles',
      })
    }

    // Fetch the role to check if it exists and if it's a system role
    const [existingRole] = await tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        isSystem: rbacRoles.config_is_system,
      })
      .from(rbacRoles)
      .where(eq(rbacRoles.meta_id, roleId))
      .limit(1)

    if (!existingRole) {
      throw createError({
        statusCode: 404,
        message: 'Role not found',
      })
    }

    // Cannot delete system roles
    if (existingRole.isSystem) {
      throw createError({
        statusCode: 403,
        message: 'Cannot delete system roles',
      })
    }

    // Get users who have this role (for cache clearing)
    const affectedUsers = await tenantDb
      .select({ userId: rbacUserRoles.ref_user_id })
      .from(rbacUserRoles)
      .where(eq(rbacUserRoles.ref_role_id, roleId))

    // Delete the role (FK cascade handles role_permissions and user_roles cleanup)
    await tenantDb.delete(rbacRoles).where(eq(rbacRoles.meta_id, roleId))

    // Clear permission cache for all affected users
    // Since we may have many users, just clear all caches to be safe
    if (affectedUsers.length > 0) {
      clearAllPermissionCaches()
    }

    return {
      success: true,
      data: {
        deleted: true,
        role: {
          id: existingRole.id,
          code: existingRole.code,
          name: existingRole.name,
        },
        affectedUsers: affectedUsers.length,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error deleting role:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete role',
    })
  }
})
