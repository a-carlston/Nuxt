import { getSessionFromRequest, extendSession, getSessionToken } from '../../utils/session'

export default defineEventHandler((event) => {
  const token = getSessionToken(event)
  const session = getSessionFromRequest(event)

  if (!session) {
    return {
      authenticated: false,
      user: null,
      tenant: null
    }
  }

  // Extend session on valid access (sliding window)
  if (token) {
    extendSession(token)
  }

  return {
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      avatarUrl: session.avatarUrl
    },
    tenant: {
      id: session.tenantId,
      slug: session.tenantSlug
    }
  }
})
