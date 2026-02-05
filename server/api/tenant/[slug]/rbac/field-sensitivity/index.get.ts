import { eq, asc } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacFieldSensitivity } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'

/**
 * GET /api/tenant/[slug]/rbac/field-sensitivity
 *
 * List all field sensitivity configurations grouped by table name.
 * Requires authentication (any authenticated user can view).
 *
 * Returns fields with:
 * - sensitivity: 'basic' | 'personal' | 'company' | 'sensitive'
 * - order: display order for columns
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

    // Fetch all field sensitivity configs ordered by table name, then order
    const fieldConfigs = await tenantDb
      .select({
        id: rbacFieldSensitivity.meta_id,
        tableName: rbacFieldSensitivity.info_table_name,
        fieldName: rbacFieldSensitivity.info_field_name,
        displayName: rbacFieldSensitivity.info_display_name,
        description: rbacFieldSensitivity.info_description,
        sensitivity: rbacFieldSensitivity.config_sensitivity,
        order: rbacFieldSensitivity.config_order,
        maskingType: rbacFieldSensitivity.config_masking_type,
        isSystem: rbacFieldSensitivity.config_is_system,
        minSensitivity: rbacFieldSensitivity.config_min_sensitivity,
      })
      .from(rbacFieldSensitivity)
      .orderBy(asc(rbacFieldSensitivity.info_table_name), asc(rbacFieldSensitivity.config_order))

    // Group by table name
    const tables: string[] = []
    const fields: Record<string, typeof fieldConfigs> = {}

    for (const config of fieldConfigs) {
      const tableName = config.tableName

      if (!fields[tableName]) {
        tables.push(tableName)
        fields[tableName] = []
      }

      fields[tableName].push(config)
    }

    return {
      success: true,
      data: {
        tables,
        fields,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching field sensitivity configs:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch field sensitivity configurations',
    })
  }
})
