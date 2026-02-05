import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * POST /api/tenant/[slug]/rbac/roles
 *
 * Create a new custom role.
 * Requires rbac.manage permission.
 *
 * Body:
 * - code: string (required) - Unique role code
 * - name: string (required) - Display name
 * - description: string (optional) - Role description
 * - isActive: boolean (optional, default: true)
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
        message: 'You do not have permission to manage roles',
      })
    }

    // Parse and validate request body
    const body = await readBody(event)

    if (!body.code || typeof body.code !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'code is required and must be a string',
      })
    }

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'name is required and must be a string',
      })
    }

    // Validate code format (lowercase alphanumeric with underscores)
    const codeRegex = /^[a-z][a-z0-9_]*$/
    if (!codeRegex.test(body.code)) {
      throw createError({
        statusCode: 400,
        message: 'code must be lowercase alphanumeric with underscores, starting with a letter',
      })
    }

    // Check for duplicate code
    const [existingRole] = await tenantDb
      .select({ id: rbacRoles.meta_id })
      .from(rbacRoles)
      .where(eq(rbacRoles.info_code, body.code.toLowerCase()))
      .limit(1)

    if (existingRole) {
      throw createError({
        statusCode: 409,
        message: 'A role with this code already exists',
      })
    }

    // Create the role
    const [newRole] = await tenantDb
      .insert(rbacRoles)
      .values({
        info_code: body.code.toLowerCase(),
        info_name: body.name.trim(),
        info_description: body.description?.trim() || null,
        config_hierarchy_level: 5, // Default level (not used for permissions, kept for DB compatibility)
        config_is_system: false, // Custom roles are never system roles
        config_is_active: body.isActive !== false,
      })
      .returning({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        description: rbacRoles.info_description,
        isSystem: rbacRoles.config_is_system,
        isActive: rbacRoles.config_is_active,
        createdAt: rbacRoles.meta_created_at,
        updatedAt: rbacRoles.meta_updated_at,
      })

    return {
      success: true,
      data: newRole,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error creating role:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create role',
    })
  }
})
