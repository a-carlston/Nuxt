import { eq, sql, and, ne } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleTags } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * PUT /api/tenant/[slug]/rbac/role-tags/[tagId]
 *
 * Update a role tag.
 * Requires rbac.manage permission.
 *
 * Body:
 * - name: string (optional) - Tag name
 * - color: string (optional) - Hex color code
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
      .select({ id: rbacRoleTags.meta_id })
      .from(rbacRoleTags)
      .where(eq(rbacRoleTags.meta_id, tagId))
      .limit(1)

    if (!existingTag) {
      throw createError({
        statusCode: 404,
        message: 'Tag not found',
      })
    }

    // Parse and validate request body
    const body = await readBody(event)

    const updates: Record<string, string | number> = {
      meta_updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'name must be a string',
        })
      }

      const trimmedName = body.name.trim()
      if (trimmedName.length === 0 || trimmedName.length > 50) {
        throw createError({
          statusCode: 400,
          message: 'name must be between 1 and 50 characters',
        })
      }

      // Check for duplicate name (case-insensitive), excluding current tag
      const [duplicateTag] = await tenantDb
        .select({ id: rbacRoleTags.meta_id })
        .from(rbacRoleTags)
        .where(and(
          sql`LOWER(${rbacRoleTags.info_name}) = LOWER(${trimmedName})`,
          ne(rbacRoleTags.meta_id, tagId)
        ))
        .limit(1)

      if (duplicateTag) {
        throw createError({
          statusCode: 409,
          message: 'A tag with this name already exists',
        })
      }

      updates.info_name = trimmedName
    }

    if (body.color !== undefined) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(body.color)) {
        throw createError({
          statusCode: 400,
          message: 'color must be a valid hex color code (e.g., #6366f1)',
        })
      }
      updates.info_color = body.color
    }

    // Update the tag
    const [updatedTag] = await tenantDb
      .update(rbacRoleTags)
      .set(updates)
      .where(eq(rbacRoleTags.meta_id, tagId))
      .returning({
        id: rbacRoleTags.meta_id,
        name: rbacRoleTags.info_name,
        color: rbacRoleTags.info_color,
        displayOrder: rbacRoleTags.config_display_order,
        createdAt: rbacRoleTags.meta_created_at,
        updatedAt: rbacRoleTags.meta_updated_at,
      })

    return {
      success: true,
      data: updatedTag,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error updating role tag:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update role tag',
    })
  }
})
