import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, settingsUser } from '../../../../db'

// Type for directory columns preferences
interface DirectoryColumnsPreferences {
  visible: string[]
  order: string[]
}

interface UserPreferences {
  directoryColumns?: DirectoryColumnsPreferences
  theme?: string
  colorPalette?: string
  expandedMode?: boolean
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

      // Build the update object with only provided fields
      const updateData: Record<string, any> = {
        meta_updated_at: now
      }

      if (body.preferences.directoryColumns !== undefined) {
        updateData.ui_directory_columns = body.preferences.directoryColumns || null
      }
      if (body.preferences.theme !== undefined) {
        updateData.pref_theme = body.preferences.theme
      }
      if (body.preferences.colorPalette !== undefined) {
        updateData.pref_color_palette = body.preferences.colorPalette
      }
      if (body.preferences.expandedMode !== undefined) {
        updateData.ui_expanded_mode = body.preferences.expandedMode
      }

      if (existingSettings) {
        // Update existing settings
        await tenantDb
          .update(settingsUser)
          .set(updateData)
          .where(eq(settingsUser.ref_user_id, body.userId))
      } else {
        // Insert new settings record
        // Use ON CONFLICT to handle race conditions and ensure upsert behavior
        await tenantDb
          .insert(settingsUser)
          .values({
            ref_user_id: body.userId,
            ...updateData
          })
          .onConflictDoUpdate({
            target: settingsUser.ref_user_id,
            set: updateData
          })
      }

      // Verify the save by reading back the data
      const [verifyResult] = await tenantDb
        .select({ ui_directory_columns: settingsUser.ui_directory_columns })
        .from(settingsUser)
        .where(eq(settingsUser.ref_user_id, body.userId))
        .limit(1)
    } catch (dbError: any) {
      // Log full error details for debugging
      console.error('[preferences.post] Database error:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint,
        stack: dbError.stack
      })

      const errorMessage = dbError.message || ''
      const errorCode = dbError.code || ''

      // Foreign key violation - user doesn't exist in core_users
      if (errorMessage.includes('foreign key') || errorMessage.includes('violates foreign key') || errorCode === '23503') {
        console.warn('[preferences.post] User not found in core_users:', body.userId)
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Table doesn't exist
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorCode === '42P01') {
        console.warn('[preferences.post] settings_user table may not exist:', errorMessage)
        return {
          success: false,
          message: 'Preferences table not available'
        }
      }

      // NOT NULL violation
      if (errorCode === '23502') {
        console.error('[preferences.post] NOT NULL constraint violation:', dbError.detail)
        return {
          success: false,
          message: 'Missing required field'
        }
      }

      // Unknown error - log and rethrow
      console.error('[preferences.post] Unknown database error:', dbError)
      throw createError({
        statusCode: 500,
        message: `Failed to save user preferences: ${errorMessage}`
      })
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
