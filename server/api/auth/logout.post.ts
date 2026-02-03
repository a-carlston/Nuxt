import {
  getSessionToken,
  deleteSession,
  clearSessionCookie,
  getSessionFromRequest
} from '../../utils/session'
import { useParentDb, parentSchema } from '../../db'

export default defineEventHandler(async (event) => {
  const token = getSessionToken(event)
  const session = getSessionFromRequest(event)

  if (token) {
    // Delete server-side session
    deleteSession(token)
  }

  // Clear the session cookie
  clearSessionCookie(event)

  // Log the logout in parent audit logs (if session existed)
  if (session) {
    try {
      const parentDb = useParentDb()
      await parentDb.insert(parentSchema.parentAuditLogs).values({
        ref_tenant_id: session.tenantId,
        actor_type: 'user',
        actor_id: session.userId,
        actor_email: session.email,
        action: 'user.logout',
        resource_type: 'session',
        resource_id: session.userId,
        description: `User ${session.email} logged out`
      })
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
    }
  }

  return {
    success: true,
    message: 'Logged out successfully'
  }
})
