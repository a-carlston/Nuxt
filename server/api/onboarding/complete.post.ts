import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.slug || !body.userId) {
    throw createError({
      statusCode: 400,
      message: 'Slug and userId are required'
    })
  }

  const parentDb = useParentDb()

  try {
    // Get tenant connection string
    const [tenant] = await parentDb
      .select({
        id: parentSchema.parentTenants.meta_id,
        connectionString: parentSchema.parentTenants.connection_string
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, body.slug.toLowerCase()))
      .limit(1)

    if (!tenant || !tenant.connectionString) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Mark onboarding as complete
    await tenantDb
      .update(coreUsers)
      .set({
        auth_onboarding_completed_at: new Date(),
        meta_updated_at: new Date()
      })
      .where(eq(coreUsers.meta_id, body.userId))

    // Log in parent audit
    await parentDb.insert(parentSchema.parentAuditLogs).values({
      ref_tenant_id: tenant.id,
      actor_type: 'user',
      actor_id: body.userId,
      action: 'user.onboarding_completed',
      resource_type: 'user',
      resource_id: body.userId,
      description: 'User completed onboarding'
    })

    return {
      success: true
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Onboarding complete error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to complete onboarding'
    })
  }
})
