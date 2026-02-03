import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, settingsCompany } from '../../../../db'

// Type for column labels structure
type ColumnLabels = Record<string, Record<string, { label: string }>>

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const tableId = query.tableId as string
  const columnId = query.columnId as string

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  if (!tableId) {
    throw createError({
      statusCode: 400,
      message: 'tableId query parameter is required'
    })
  }

  if (!columnId) {
    throw createError({
      statusCode: 400,
      message: 'columnId query parameter is required'
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

    try {
      // Fetch current settings
      const [currentSettings] = await tenantDb
        .select({
          metaId: settingsCompany.meta_id,
          columnLabels: settingsCompany.config_column_labels
        })
        .from(settingsCompany)
        .limit(1)

      if (!currentSettings) {
        throw createError({
          statusCode: 500,
          message: 'Company settings not found. Please contact support.'
        })
      }

      const existingLabels = (currentSettings.columnLabels as ColumnLabels) || {}

      // Check if the table and column exist
      if (!existingLabels[tableId] || !existingLabels[tableId][columnId]) {
        // Label doesn't exist - return success anyway (idempotent delete)
        return {
          success: true
        }
      }

      // Remove the specific column label
      const updatedTableLabels = { ...existingLabels[tableId] }
      delete updatedTableLabels[columnId]

      // Build updated labels structure
      const updatedLabels: ColumnLabels = { ...existingLabels }

      // If no more labels for this table, remove the table entry entirely
      if (Object.keys(updatedTableLabels).length === 0) {
        delete updatedLabels[tableId]
      } else {
        updatedLabels[tableId] = updatedTableLabels
      }

      const now = new Date()

      // Update settings
      await tenantDb
        .update(settingsCompany)
        .set({
          config_column_labels: Object.keys(updatedLabels).length > 0 ? updatedLabels : null,
          meta_updated_at: now
        })
        .where(eq(settingsCompany.meta_id, currentSettings.metaId))

    } catch (dbError: any) {
      if (dbError.statusCode) throw dbError

      // Table might not exist yet
      console.warn('settings_company table may not exist:', dbError.message)
      return {
        success: false,
        message: 'Settings table not available'
      }
    }

    return {
      success: true
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting column label:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete column label'
    })
  }
})
