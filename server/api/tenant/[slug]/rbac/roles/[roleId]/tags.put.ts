import { eq, and, inArray } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacRoleTags, rbacRoleTagAssignments } from '../../../../../../db'
import { requireTenantAccess } from '../../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../../utils/permissions'

/**
 * PUT /api/tenant/[slug]/rbac/roles/[roleId]/tags
 *
 * Update tag assignments for a role.
 * Requires rbac.manage permission.
 *
 * Body:
 * - tagIds: string[] (required) - Array of tag IDs to assign to the role (replaces all current assignments)
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
        message: 'You do not have permission to manage role tags',
      })
    }

    // Check if role exists
    const [existingRole] = await tenantDb
      .select({ id: rbacRoles.meta_id })
      .from(rbacRoles)
      .where(eq(rbacRoles.meta_id, roleId))
      .limit(1)

    if (!existingRole) {
      throw createError({
        statusCode: 404,
        message: 'Role not found',
      })
    }

    // Parse and validate request body
    const body = await readBody(event)

    if (!body.tagIds || !Array.isArray(body.tagIds)) {
      throw createError({
        statusCode: 400,
        message: 'tagIds is required and must be an array',
      })
    }

    // Validate all tag IDs are strings
    const tagIds = body.tagIds.filter((id: unknown) => typeof id === 'string') as string[]

    // If tagIds provided, verify they all exist
    if (tagIds.length > 0) {
      const existingTags = await tenantDb
        .select({ id: rbacRoleTags.meta_id })
        .from(rbacRoleTags)
        .where(inArray(rbacRoleTags.meta_id, tagIds))

      const existingTagIds = new Set(existingTags.map(t => t.id))
      const invalidTagIds = tagIds.filter(id => !existingTagIds.has(id))

      if (invalidTagIds.length > 0) {
        throw createError({
          statusCode: 400,
          message: `Invalid tag IDs: ${invalidTagIds.join(', ')}`,
        })
      }
    }

    // Delete all current tag assignments for this role
    await tenantDb
      .delete(rbacRoleTagAssignments)
      .where(eq(rbacRoleTagAssignments.ref_role_id, roleId))

    // Insert new tag assignments
    if (tagIds.length > 0) {
      await tenantDb
        .insert(rbacRoleTagAssignments)
        .values(tagIds.map(tagId => ({
          ref_role_id: roleId,
          ref_tag_id: tagId,
        })))
    }

    // Fetch the updated tags for the role
    const updatedTags = tagIds.length > 0
      ? await tenantDb
          .select({
            id: rbacRoleTags.meta_id,
            name: rbacRoleTags.info_name,
            color: rbacRoleTags.info_color,
          })
          .from(rbacRoleTags)
          .where(inArray(rbacRoleTags.meta_id, tagIds))
      : []

    return {
      success: true,
      data: {
        roleId,
        tags: updatedTags,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error updating role tags:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update role tags',
    })
  }
})
