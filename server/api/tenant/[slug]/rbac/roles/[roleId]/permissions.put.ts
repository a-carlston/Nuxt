import { eq, inArray } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacRolePermissions, rbacPermissions, rbacUserRoles } from '../../../../../../db'
import { requireTenantAccess } from '../../../../../../utils/session'
import { loadUserPermissions, checkPermission, clearAllPermissionCaches } from '../../../../../../utils/permissions'

/**
 * PUT /api/tenant/[slug]/rbac/roles/[roleId]/permissions
 *
 * Replace all permissions for a role.
 * Deletes existing permissions and inserts new ones.
 * Clears permission cache for affected users.
 *
 * Requires rbac.manage permission.
 *
 * Body:
 * - permissionIds: string[] (required) - Array of permission IDs to assign
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

    // Parse request body
    const body = await readBody(event)

    if (!Array.isArray(body.permissionIds)) {
      throw createError({
        statusCode: 400,
        message: 'permissionIds must be an array',
      })
    }

    // Validate all IDs are strings
    const permissionIds: string[] = body.permissionIds.filter(
      (id: unknown): id is string => typeof id === 'string' && id.length > 0
    )

    // Fetch the role to verify it exists
    const [role] = await tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        isSystem: rbacRoles.config_is_system,
      })
      .from(rbacRoles)
      .where(eq(rbacRoles.meta_id, roleId))
      .limit(1)

    if (!role) {
      throw createError({
        statusCode: 404,
        message: 'Role not found',
      })
    }

    // Super admin role (super_admin) cannot have permissions modified
    if (role.code === 'super_admin') {
      throw createError({
        statusCode: 403,
        message: 'Super Administrator permissions cannot be modified',
      })
    }

    // Validate that all permission IDs exist
    if (permissionIds.length > 0) {
      const validPermissions = await tenantDb
        .select({ id: rbacPermissions.meta_id })
        .from(rbacPermissions)
        .where(inArray(rbacPermissions.meta_id, permissionIds))

      const validIds = new Set(validPermissions.map((p) => p.id))
      const invalidIds = permissionIds.filter((id) => !validIds.has(id))

      if (invalidIds.length > 0) {
        throw createError({
          statusCode: 400,
          message: `Invalid permission IDs: ${invalidIds.join(', ')}`,
        })
      }
    }

    // Delete existing role permissions
    await tenantDb
      .delete(rbacRolePermissions)
      .where(eq(rbacRolePermissions.ref_role_id, roleId))

    // Insert new permissions
    if (permissionIds.length > 0) {
      await tenantDb.insert(rbacRolePermissions).values(
        permissionIds.map((permissionId) => ({
          ref_role_id: roleId,
          ref_permission_id: permissionId,
        }))
      )
    }

    // Get users who have this role (for cache clearing)
    const affectedUsers = await tenantDb
      .select({ userId: rbacUserRoles.ref_user_id })
      .from(rbacUserRoles)
      .where(eq(rbacUserRoles.ref_role_id, roleId))

    // Clear permission cache for affected users
    if (affectedUsers.length > 0) {
      clearAllPermissionCaches()
    }

    // Fetch the updated permissions for the response
    const updatedPermissions = await tenantDb
      .select({
        id: rbacPermissions.meta_id,
        code: rbacPermissions.info_code,
        name: rbacPermissions.info_name,
        category: rbacPermissions.info_category,
        description: rbacPermissions.info_description,
      })
      .from(rbacRolePermissions)
      .innerJoin(
        rbacPermissions,
        eq(rbacRolePermissions.ref_permission_id, rbacPermissions.meta_id)
      )
      .where(eq(rbacRolePermissions.ref_role_id, roleId))

    return {
      success: true,
      data: {
        roleId,
        roleName: role.name,
        permissions: updatedPermissions,
        permissionCount: updatedPermissions.length,
        affectedUsers: affectedUsers.length,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error updating role permissions:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update role permissions',
    })
  }
})
