import { eq, and, or, isNull, gte } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacUserRoles, rbacRoles, coreUsers } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * GET /api/tenant/[slug]/rbac/user-roles/[userId]
 *
 * Get all role assignments for a user.
 * Requires rbac.view permission or self access.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const userId = getRouterParam(event, 'userId')

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

    // Check permission - allow self access or rbac.view
    const isSelf = session.userId === userId
    if (!isSelf) {
      const permissionCache = await loadUserPermissions(tenantDb, session.userId)
      const canView = checkPermission(permissionCache, 'rbac.view')

      if (!canView.allowed) {
        throw createError({
          statusCode: 403,
          message: 'You do not have permission to view user roles',
        })
      }
    }

    // Get the user's active role assignments
    const assignments = await tenantDb
      .select({
        id: rbacUserRoles.meta_id,
        roleId: rbacUserRoles.ref_role_id,
        roleCode: rbacRoles.info_code,
        roleName: rbacRoles.info_name,
        roleDescription: rbacRoles.info_description,
        isSystem: rbacRoles.config_is_system,
        scopeType: rbacUserRoles.info_scope_type,
        scopeId: rbacUserRoles.info_scope_id,
        assignedAt: rbacUserRoles.info_assigned_at,
        expiresAt: rbacUserRoles.info_expires_at,
        assignedById: rbacUserRoles.ref_assigned_by,
      })
      .from(rbacUserRoles)
      .innerJoin(rbacRoles, eq(rbacUserRoles.ref_role_id, rbacRoles.meta_id))
      .where(
        and(
          eq(rbacUserRoles.ref_user_id, userId),
          eq(rbacRoles.config_is_active, true),
          or(isNull(rbacUserRoles.info_expires_at), gte(rbacUserRoles.info_expires_at, new Date()))
        )
      )

    // Get assigner names
    const assignerIds = [...new Set(assignments.map((a) => a.assignedById).filter(Boolean))]
    let assignerMap: Record<string, string> = {}

    if (assignerIds.length > 0) {
      const assigners = await tenantDb
        .select({
          id: coreUsers.meta_id,
          firstName: coreUsers.personal_first_name,
          lastName: coreUsers.personal_last_name,
        })
        .from(coreUsers)
        .where(or(...assignerIds.map((id) => eq(coreUsers.meta_id, id!))))

      assignerMap = Object.fromEntries(
        assigners.map((a) => [a.id, `${a.firstName} ${a.lastName}`])
      )
    }

    // Format the response
    const formattedAssignments = assignments.map((a) => ({
      id: a.id,
      role: {
        id: a.roleId,
        code: a.roleCode,
        name: a.roleName,
        description: a.roleDescription,
        isSystem: a.isSystem,
      },
      scopeType: a.scopeType,
      scopeId: a.scopeId,
      assignedAt: a.assignedAt,
      expiresAt: a.expiresAt,
      assignedBy: a.assignedById
        ? {
            id: a.assignedById,
            name: assignerMap[a.assignedById] || 'Unknown',
          }
        : null,
    }))

    return {
      success: true,
      data: formattedAssignments,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching user roles:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch user roles',
    })
  }
})
