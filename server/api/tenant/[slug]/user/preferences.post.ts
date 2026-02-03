import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, settingsUser } from '../../../../db'

// Type for directory columns preferences
interface DirectoryColumnsPreferences {
  visible: string[]
  order: string[]
}

interface UserPreferences {
  directoryColumns?: DirectoryColumnsPreferences
}

interface RequestBody {
  userId: string
  preferences: UserPreferences
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

  if (!body.userId) {
    throw createError({
      statusCode: 400,
      message: 'userId is required'
    })
  }

  if (!body.preferences) {
    throw createError({
      statusCode: 400,
      message: 'preferences is required'
    })
  }

  // Validate directoryColumns structure if provided
  if (body.preferences.directoryColumns) {
    const { visible, order } = body.preferences.directoryColumns
    if (!Array.isArray(visible) || !Array.isArray(order)) {
      throw createError({
        statusCode: 400,
        message: 'directoryColumns.visible and directoryColumns.order must be arrays'
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

    // Check if user settings record exists and save preferences
    try {
      const [existingSettings] = await tenantDb
        .select({ ref_user_id: settingsUser.ref_user_id })
        .from(settingsUser)
        .where(eq(settingsUser.ref_user_id, body.userId))
        .limit(1)

      const now = new Date()

      if (existingSettings) {
        // Update existing settings
        await tenantDb
          .update(settingsUser)
          .set({
            ui_directory_columns: body.preferences.directoryColumns || null,
            meta_updated_at: now
          })
          .where(eq(settingsUser.ref_user_id, body.userId))
      } else {
        // Insert new settings record
        await tenantDb
          .insert(settingsUser)
          .values({
            ref_user_id: body.userId,
            ui_directory_columns: body.preferences.directoryColumns || null,
            meta_updated_at: now
          })
      }
    } catch (dbError: any) {
      // Table might not exist yet - silently fail but log warning
      console.warn('settings_user table may not exist, skipping preferences save:', dbError.message)
      return {
        success: false,
        message: 'Preferences table not available'
      }
    }

    return {
      success: true
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error saving user preferences:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to save user preferences'
    })
  }
})
