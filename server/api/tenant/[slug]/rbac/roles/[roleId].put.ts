import { eq, and, ne } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacRoleGroups } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * PUT /api/tenant/[slug]/rbac/roles/[roleId]
 *
 * Update an existing role.
 * Requires rbac.manage permission.
 *
 * System roles: only name, description, isActive, groupId, displayOrder editable.
 * Custom roles: all fields editable except isSystem.
 *
 * Body:
 * - name: string (optional) - Display name
 * - description: string (optional) - Role description
 * - isActive: boolean (optional) - Active status
 * - groupId: string | null (optional) - Group to assign the role to (null to ungroup)
 * - displayOrder: number (optional) - Display order within group
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

    // Fetch the existing role
    const [existingRole] = await tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        description: rbacRoles.info_description,
        isSystem: rbacRoles.config_is_system,
        isActive: rbacRoles.config_is_active,
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

    // Parse request body
    const body = await readBody(event)

    // Build update object based on whether it's a system role
    const updates: Partial<{
      info_name: string
      info_description: string | null
      config_is_active: boolean
      ref_group_id: string | null
      config_display_order: number
      meta_updated_at: Date
    }> = {
      meta_updated_at: new Date(),
    }

    // Name update (allowed for all roles)
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw createError({
          statusCode: 400,
          message: 'name must be a non-empty string',
        })
      }
      updates.info_name = body.name.trim()
    }

    // Description update (allowed for all roles)
    if (body.description !== undefined) {
      updates.info_description = body.description?.trim() || null
    }

    // isActive update (allowed for all roles)
    if (body.isActive !== undefined) {
      updates.config_is_active = Boolean(body.isActive)
    }

    // groupId update (allowed for all roles)
    if (body.groupId !== undefined) {
      if (body.groupId === null) {
        updates.ref_group_id = null
      } else {
        // Verify group exists
        const [group] = await tenantDb
          .select({ id: rbacRoleGroups.meta_id })
          .from(rbacRoleGroups)
          .where(eq(rbacRoleGroups.meta_id, body.groupId))
          .limit(1)

        if (!group) {
          throw createError({
            statusCode: 400,
            message: 'Invalid group ID',
          })
        }
        updates.ref_group_id = body.groupId
      }
    }

    // displayOrder update (allowed for all roles)
    if (body.displayOrder !== undefined) {
      if (typeof body.displayOrder !== 'number' || body.displayOrder < 0) {
        throw createError({
          statusCode: 400,
          message: 'displayOrder must be a non-negative number',
        })
      }
      updates.config_display_order = body.displayOrder
    }

    // code update (only for custom roles)
    if (body.code !== undefined) {
      if (existingRole.isSystem) {
        throw createError({
          statusCode: 403,
          message: 'Cannot modify code of system roles',
        })
      }

      // Validate code format
      const codeRegex = /^[a-z][a-z0-9_]*$/
      if (!codeRegex.test(body.code)) {
        throw createError({
          statusCode: 400,
          message: 'code must be lowercase alphanumeric with underscores, starting with a letter',
        })
      }

      // Check for duplicate code (excluding current role)
      const [duplicateRole] = await tenantDb
        .select({ id: rbacRoles.meta_id })
        .from(rbacRoles)
        .where(and(eq(rbacRoles.info_code, body.code.toLowerCase()), ne(rbacRoles.meta_id, roleId)))
        .limit(1)

      if (duplicateRole) {
        throw createError({
          statusCode: 409,
          message: 'A role with this code already exists',
        })
      }

      // Include code in updates (need to cast since we're conditionally adding it)
      ;(updates as Record<string, unknown>).info_code = body.code.toLowerCase()
    }

    // Perform the update
    const [updatedRole] = await tenantDb
      .update(rbacRoles)
      .set(updates)
      .where(eq(rbacRoles.meta_id, roleId))
      .returning({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        description: rbacRoles.info_description,
        isSystem: rbacRoles.config_is_system,
        isActive: rbacRoles.config_is_active,
        groupId: rbacRoles.ref_group_id,
        displayOrder: rbacRoles.config_display_order,
        createdAt: rbacRoles.meta_created_at,
        updatedAt: rbacRoles.meta_updated_at,
      })

    return {
      success: true,
      data: updatedRole,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error updating role:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update role',
    })
  }
})
