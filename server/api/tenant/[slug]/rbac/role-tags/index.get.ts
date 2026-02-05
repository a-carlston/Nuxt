import { eq, asc } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleTags } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'

/**
 * GET /api/tenant/[slug]/rbac/role-tags
 *
 * List all role tags for the tenant.
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

    // Fetch all role tags (gracefully handle if table doesn't exist)
    try {
      const tags = await tenantDb
        .select({
          id: rbacRoleTags.meta_id,
          name: rbacRoleTags.info_name,
          color: rbacRoleTags.info_color,
          displayOrder: rbacRoleTags.config_display_order,
          createdAt: rbacRoleTags.meta_created_at,
          updatedAt: rbacRoleTags.meta_updated_at,
        })
        .from(rbacRoleTags)
        .orderBy(asc(rbacRoleTags.config_display_order), asc(rbacRoleTags.info_name))

      return {
        success: true,
        data: tags,
      }
    } catch (dbError) {
      // Table might not exist yet - return empty array
      console.warn('Could not fetch role tags (table may not exist yet):', dbError)
      return {
        success: true,
        data: [],
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching role tags:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch role tags',
    })
  }
})
