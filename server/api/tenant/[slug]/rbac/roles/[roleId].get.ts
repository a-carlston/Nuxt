import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacRolePermissions, rbacPermissions } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'

/**
 * GET /api/tenant/[slug]/rbac/roles/[roleId]
 *
 * Get a single role with its assigned permissions.
 * Joins rbac_roles → rbac_role_permissions → rbac_permissions.
 * Requires authentication.
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
  requireTenantAccess(event, slug)
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

    // Fetch the role
    const [role] = await tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        description: rbacRoles.info_description,
        isSystem: rbacRoles.config_is_system,
        isActive: rbacRoles.config_is_active,
        createdAt: rbacRoles.meta_created_at,
        updatedAt: rbacRoles.meta_updated_at,
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

    // Fetch the role's permissions
    const rolePermissions = await tenantDb
      .select({
        id: rbacPermissions.meta_id,
        code: rbacPermissions.info_code,
        name: rbacPermissions.info_name,
        category: rbacPermissions.info_category,
        description: rbacPermissions.info_description,
        isSystem: rbacPermissions.config_is_system,
      })
      .from(rbacRolePermissions)
      .innerJoin(
        rbacPermissions,
        eq(rbacRolePermissions.ref_permission_id, rbacPermissions.meta_id)
      )
      .where(eq(rbacRolePermissions.ref_role_id, roleId))

    // Extract permission IDs for convenience
    const permissionIds = rolePermissions.map((p) => p.id)

    return {
      success: true,
      data: {
        ...role,
        permissions: rolePermissions,
        permissionIds,
        permissionCount: rolePermissions.length,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching role:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch role',
    })
  }
})
