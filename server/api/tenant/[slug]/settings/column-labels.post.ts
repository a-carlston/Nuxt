import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, settingsCompany } from '../../../../db'

// Type for column labels structure
type ColumnLabels = Record<string, Record<string, { label: string }>>

interface RequestBody {
  tableId: string
  labels: Record<string, string>
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<RequestBody>(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  if (!body.tableId) {
    throw createError({
      statusCode: 400,
      message: 'tableId is required'
    })
  }

  if (!body.labels || typeof body.labels !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'labels object is required'
    })
  }

  // Validate labels structure - each value should be a string
  for (const [columnId, label] of Object.entries(body.labels)) {
    if (typeof label !== 'string') {
      throw createError({
        statusCode: 400,
        message: `Label for column "${columnId}" must be a string`
      })
    }
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

      const now = new Date()

      // Build the new column labels structure
      const existingLabels = (currentSettings?.columnLabels as ColumnLabels) || {}

      // Transform flat labels to { label: string } structure
      const tableLabels: Record<string, { label: string }> = {}
      for (const [columnId, label] of Object.entries(body.labels)) {
        if (label.trim()) {
          tableLabels[columnId] = { label: label.trim() }
        }
      }

      // Merge with existing labels
      const updatedLabels: ColumnLabels = {
        ...existingLabels,
        [body.tableId]: {
          ...existingLabels[body.tableId],
          ...tableLabels
        }
      }

      if (currentSettings) {
        // Update existing settings
        await tenantDb
          .update(settingsCompany)
          .set({
            config_column_labels: updatedLabels,
            meta_updated_at: now
          })
          .where(eq(settingsCompany.meta_id, currentSettings.metaId))
      } else {
        // This shouldn't happen in normal operation (company settings should exist)
        // but handle gracefully by returning an error
        throw createError({
          statusCode: 500,
          message: 'Company settings not found. Please contact support.'
        })
      }
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

    console.error('Error saving column labels:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to save column labels'
    })
  }
})
