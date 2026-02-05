import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleTags } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * DELETE /api/tenant/[slug]/rbac/role-tags/[tagId]
 *
 * Delete a role tag.
 * Requires rbac.manage permission.
 * Tag assignments are automatically removed via cascade.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const tagId = getRouterParam(event, 'tagId')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  if (!tagId) {
    throw createError({
      statusCode: 400,
      message: 'Tag ID is required',
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

    // Check if tag exists
    const [existingTag] = await tenantDb
      .select({ id: rbacRoleTags.meta_id, name: rbacRoleTags.info_name })
      .from(rbacRoleTags)
      .where(eq(rbacRoleTags.meta_id, tagId))
      .limit(1)

    if (!existingTag) {
      throw createError({
        statusCode: 404,
        message: 'Tag not found',
      })
    }

    // Delete the tag (cascade will remove assignments)
    await tenantDb
      .delete(rbacRoleTags)
      .where(eq(rbacRoleTags.meta_id, tagId))

    return {
      success: true,
      message: `Tag "${existingTag.name}" deleted`,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error deleting role tag:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete role tag',
    })
  }
})
