import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, settingsCompany } from '../../../../db'

// Type for column labels structure
type ColumnLabels = Record<string, Record<string, { label: string }>>

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const tableId = query.tableId as string | undefined

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  const parentDb = useParentDb()

  try {
    // Get tenant connection string from parent DB
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    if (tenant.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This workspace is currently inactive'
      })
    }

    if (!tenant.connectionString) {
      throw createError({
        statusCode: 500,
        message: 'Workspace database not configured'
      })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Fetch company settings - handle case where table doesn't exist yet
    let companySettings = null
    try {
      const result = await tenantDb
        .select({
          columnLabels: settingsCompany.config_column_labels
        })
        .from(settingsCompany)
        .limit(1)
      companySettings = result[0] || null
    } catch (dbError: any) {
      // Table might not exist yet - return empty labels
      console.warn('settings_company table may not exist:', dbError.message)
    }

    // Get all column labels or filter by tableId
    const allLabels = (companySettings?.columnLabels as ColumnLabels) || {}

    // If tableId is specified, return only labels for that table
    const labels = tableId ? (allLabels[tableId] || {}) : allLabels

    return {
      success: true,
      labels
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching column labels:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch column labels'
    })
  }
})
