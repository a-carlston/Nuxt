import { eq, asc } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacPermissions } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'

/**
 * GET /api/tenant/[slug]/rbac/permissions
 *
 * List all permissions grouped by category.
 * Used for the permissions management modal.
 * Requires authentication.
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

    // Fetch all permissions ordered by category and name
    const permissions = await tenantDb
      .select({
        id: rbacPermissions.meta_id,
        code: rbacPermissions.info_code,
        name: rbacPermissions.info_name,
        category: rbacPermissions.info_category,
        description: rbacPermissions.info_description,
        isSystem: rbacPermissions.config_is_system,
        createdAt: rbacPermissions.meta_created_at,
      })
      .from(rbacPermissions)
      .orderBy(asc(rbacPermissions.info_category), asc(rbacPermissions.info_name))

    // Group permissions by category
    const grouped: Record<string, typeof permissions> = {}
    for (const perm of permissions) {
      const category = perm.category
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category]!.push(perm)
    }

    return {
      success: true,
      data: {
        permissions,
        grouped,
        categories: Object.keys(grouped).sort(),
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching permissions:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch permissions',
    })
  }
})
