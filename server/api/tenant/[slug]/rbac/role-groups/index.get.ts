import { eq, asc } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleGroups } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'

/**
 * GET /api/tenant/[slug]/rbac/role-groups
 *
 * List all role groups for the tenant.
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
      throw createError({ statusCode: 404, message: 'Workspace not found' })
    }

    if (tenant.status !== 'active') {
      throw createError({ statusCode: 403, message: 'This workspace is currently inactive' })
    }

    if (!tenant.connectionString) {
      throw createError({ statusCode: 500, message: 'Workspace database not configured' })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Fetch all role groups (gracefully handle if table doesn't exist)
    try {
      const groups = await tenantDb
        .select({
          id: rbacRoleGroups.meta_id,
          name: rbacRoleGroups.info_name,
          description: rbacRoleGroups.info_description,
          displayOrder: rbacRoleGroups.config_display_order,
          isCollapsed: rbacRoleGroups.config_is_collapsed,
          createdAt: rbacRoleGroups.meta_created_at,
          updatedAt: rbacRoleGroups.meta_updated_at,
        })
        .from(rbacRoleGroups)
        .orderBy(asc(rbacRoleGroups.config_display_order), asc(rbacRoleGroups.info_name))

      return {
        success: true,
        data: groups,
      }
    } catch (dbError) {
      // Table might not exist yet - return empty array
      console.warn('Could not fetch role groups (table may not exist yet):', dbError)
      return {
        success: true,
        data: [],
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching role groups:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch role groups',
    })
  }
})
