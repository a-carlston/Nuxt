import { eq, sql } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleTags } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * POST /api/tenant/[slug]/rbac/role-tags
 *
 * Create a new role tag.
 * Requires rbac.manage permission.
 *
 * Body:
 * - name: string (required) - Tag name
 * - color: string (optional) - Hex color code (default: #6366f1)
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
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

    // Parse and validate request body
    const body = await readBody(event)

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'name is required and must be a string',
      })
    }

    const trimmedName = body.name.trim()
    if (trimmedName.length === 0 || trimmedName.length > 50) {
      throw createError({
        statusCode: 400,
        message: 'name must be between 1 and 50 characters',
      })
    }

    // Validate color if provided
    let color = '#6366f1' // default primary color
    if (body.color) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(body.color)) {
        throw createError({
          statusCode: 400,
          message: 'color must be a valid hex color code (e.g., #6366f1)',
        })
      }
      color = body.color
    }

    // Check for duplicate name (case-insensitive)
    const [existingTag] = await tenantDb
      .select({ id: rbacRoleTags.meta_id })
      .from(rbacRoleTags)
      .where(sql`LOWER(${rbacRoleTags.info_name}) = LOWER(${trimmedName})`)
      .limit(1)

    if (existingTag) {
      throw createError({
        statusCode: 409,
        message: 'A tag with this name already exists',
      })
    }

    // Get the next display order
    const [maxOrder] = await tenantDb
      .select({ maxOrder: sql<number>`COALESCE(MAX(${rbacRoleTags.config_display_order}), -1)` })
      .from(rbacRoleTags)

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1

    // Create the tag
    const [newTag] = await tenantDb
      .insert(rbacRoleTags)
      .values({
        info_name: trimmedName,
        info_color: color,
        config_display_order: nextOrder,
      })
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
      data: newTag,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error creating role tag:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create role tag',
    })
  }
})
