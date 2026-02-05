import { eq, and } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacUserRoles, rbacRoles, coreUsers } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission, clearPermissionCache } from '../../../../../utils/permissions'

/**
 * POST /api/tenant/[slug]/rbac/user-roles/[userId]
 *
 * Assign a role to a user.
 * Requires rbac.assign_roles permission.
 *
 * Body:
 * - roleId: string (required) - The role to assign
 * - scopeType: 'global' | 'location' | 'department' | 'lob' | 'division' (optional, default: 'global')
 * - scopeId: string (optional) - The ID of the scope entity (required if scopeType is not 'global')
 * - expiresAt: string (optional) - ISO date when the role assignment expires
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

    // Check permission to assign roles
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    const canAssign = checkPermission(permissionCache, 'rbac.assign_roles')

    if (!canAssign.allowed) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to assign roles',
      })
    }

    // Parse and validate request body
    const body = await readBody(event)

    if (!body.roleId) {
      throw createError({
        statusCode: 400,
        message: 'roleId is required',
      })
    }

    const scopeType = body.scopeType || 'global'
    const validScopeTypes = ['global', 'location', 'department', 'lob', 'division']
    if (!validScopeTypes.includes(scopeType)) {
      throw createError({
        statusCode: 400,
        message: `Invalid scopeType. Must be one of: ${validScopeTypes.join(', ')}`,
      })
    }

    // Verify the target user exists
    const [targetUser] = await tenantDb
      .select({ id: coreUsers.meta_id })
      .from(coreUsers)
      .where(eq(coreUsers.meta_id, userId))
      .limit(1)

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: 'User not found',
      })
    }

    // Verify the role exists and is active
    const [role] = await tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
      })
      .from(rbacRoles)
      .where(and(eq(rbacRoles.meta_id, body.roleId), eq(rbacRoles.config_is_active, true)))
      .limit(1)

    if (!role) {
      throw createError({
        statusCode: 404,
        message: 'Role not found or inactive',
      })
    }

    // Only super admins can assign the super_admin role
    if (role.code === 'super_admin') {
      const isSuperAdmin = permissionCache.roles.some((r: { code: string }) => r.code === 'super_admin')
      if (!isSuperAdmin) {
        throw createError({
          statusCode: 403,
          message: 'Only Super Administrators can assign the Super Administrator role',
        })
      }
    }

    // Insert the role assignment
    const [assignment] = await tenantDb
      .insert(rbacUserRoles)
      .values({
        ref_user_id: userId,
        ref_role_id: body.roleId,
        ref_assigned_by: session.userId,
        info_scope_type: scopeType,
        info_scope_id: body.scopeId || null,
        info_expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .onConflictDoNothing()
      .returning({
        id: rbacUserRoles.meta_id,
        roleId: rbacUserRoles.ref_role_id,
        scopeType: rbacUserRoles.info_scope_type,
        scopeId: rbacUserRoles.info_scope_id,
        assignedAt: rbacUserRoles.info_assigned_at,
        expiresAt: rbacUserRoles.info_expires_at,
      })

    if (!assignment) {
      // Assignment already exists (conflict)
      throw createError({
        statusCode: 409,
        message: 'User already has this role with the same scope',
      })
    }

    // Clear the target user's permission cache so they get updated permissions
    clearPermissionCache(userId)

    return {
      success: true,
      data: {
        ...assignment,
        role: {
          code: role.code,
          name: role.name,
        },
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error assigning role:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to assign role',
    })
  }
})
