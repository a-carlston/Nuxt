import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema } from '../../../../db'
import { loadUserPermissions } from '../../../../utils/permissions'
import { requireTenantAccess } from '../../../../utils/session'

/**
 * GET /api/tenant/[slug]/user/permissions
 *
 * Fetch the current user's permissions, roles, tags, and organizational context.
 * Used by the frontend to initialize permission state.
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

    // Load user permissions
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)

    // Return serializable permission state for frontend
    return {
      success: true,
      data: {
        permissions: Array.from(permissionCache.permissions),
        roles: permissionCache.roles.map((r) => ({
          code: r.code,
          name: r.name,
          hierarchyLevel: r.hierarchyLevel,
        })),
        tags: permissionCache.tags,
        orgContext: permissionCache.orgContext,
        expiresAt: permissionCache.expiresAt,
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
