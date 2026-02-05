import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, settingsUser } from '../../../../db'

// Type for directory columns preferences
interface DirectoryColumnsPreferences {
  visible: string[]
  order: string[]
}

interface UserPreferences {
  directoryColumns: DirectoryColumnsPreferences
  theme: string | null
  colorPalette: string | null
  expandedMode: boolean | null
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const userId = query.userId as string

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'userId query parameter is required'
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

    // Fetch user preferences - handle case where table doesn't exist yet
    let userSettings = null
    try {
      const result = await tenantDb
        .select({
          directoryColumns: settingsUser.ui_directory_columns,
          theme: settingsUser.pref_theme,
          colorPalette: settingsUser.pref_color_palette,
          expandedMode: settingsUser.ui_expanded_mode
        })
        .from(settingsUser)
        .where(eq(settingsUser.ref_user_id, userId))
        .limit(1)
      userSettings = result[0] || null
    } catch (dbError: any) {
      // Table might not exist yet - return defaults
      console.warn('[preferences.get] settings_user table may not exist:', dbError.message)
    }

    // Build preferences object with defaults if not found
    const preferences: UserPreferences = {
      directoryColumns: (userSettings?.directoryColumns as DirectoryColumnsPreferences) || {
        visible: [],
        order: []
      },
      theme: userSettings?.theme || null,
      colorPalette: userSettings?.colorPalette || null,
      expandedMode: userSettings?.expandedMode ?? null
    }

    return {
      success: true,
      preferences
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching user preferences:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch user preferences'
    })
  }
})
