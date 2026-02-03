import type { H3Event } from 'h3'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// =============================================================================
// SESSION STORE
// =============================================================================
// Server-side session storage with file persistence for development.
// In production, replace with Redis.

export interface SessionData {
  userId: string
  tenantId: string
  tenantSlug: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  createdAt: number
  expiresAt: number
}

// File path for session persistence
const SESSION_FILE = join(process.cwd(), '.data', 'sessions.json')

// In-memory cache
let sessions: Map<string, SessionData> = new Map()
let loaded = false

// Load sessions from file on first access
function loadSessions(): void {
  if (loaded) return
  loaded = true

  try {
    if (existsSync(SESSION_FILE)) {
      const data = readFileSync(SESSION_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      sessions = new Map(Object.entries(parsed))
    }
  } catch (e) {
    sessions = new Map()
  }
}

// Save sessions to file
function saveSessions(): void {
  try {
    const dir = join(process.cwd(), '.data')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const data = Object.fromEntries(sessions)
    writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    // Silently fail - sessions will work in memory
  }
}

// Session configuration
const SESSION_COOKIE_NAME = 'optivo_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const SESSION_DURATION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// =============================================================================
// SESSION TOKEN GENERATION
// =============================================================================

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Create a new session and store it
 */
export function createSession(data: Omit<SessionData, 'createdAt' | 'expiresAt'>, rememberMe = false): string {
  loadSessions()

  const token = generateSessionToken()
  const now = Date.now()
  const duration = rememberMe ? SESSION_DURATION_REMEMBER_MS : SESSION_DURATION_MS

  const session: SessionData = {
    ...data,
    createdAt: now,
    expiresAt: now + duration
  }

  sessions.set(token, session)
  saveSessions()

  // Clean up expired sessions periodically
  cleanupExpiredSessions()

  return token
}

/**
 * Get session data from token
 */
export function getSessionByToken(token: string): SessionData | null {
  loadSessions()

  const session = sessions.get(token)

  if (!session) {
    return null
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    saveSessions()
    return null
  }

  return session
}

/**
 * Delete a session
 */
export function deleteSession(token: string): boolean {
  loadSessions()
  const result = sessions.delete(token)
  saveSessions()
  return result
}

/**
 * Extend session expiration
 */
export function extendSession(token: string, rememberMe = false): boolean {
  loadSessions()
  const session = sessions.get(token)
  if (!session) return false

  const duration = rememberMe ? SESSION_DURATION_REMEMBER_MS : SESSION_DURATION_MS
  session.expiresAt = Date.now() + duration
  saveSessions()
  return true
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now()
  let cleaned = 0
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token)
      cleaned++
    }
  }
  if (cleaned > 0) {
    saveSessions()
    console.log('[SESSION] Cleaned up', cleaned, 'expired sessions')
  }
}

// =============================================================================
// COOKIE HELPERS
// =============================================================================

/**
 * Set the session cookie on the response
 */
export function setSessionCookie(event: H3Event, token: string, rememberMe = false): void {
  const maxAge = rememberMe
    ? SESSION_DURATION_REMEMBER_MS / 1000
    : SESSION_DURATION_MS / 1000

  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // Allow in development
    sameSite: 'lax',
    path: '/',
    maxAge
  })
}

/**
 * Get the session token from cookies
 */
export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME)
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })
}

// =============================================================================
// SESSION UTILITIES
// =============================================================================

/**
 * Get the current session from the request
 */
export function getSessionFromRequest(event: H3Event): SessionData | null {
  const token = getSessionToken(event)
  if (!token) return null
  return getSessionByToken(token)
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export function requireAuth(event: H3Event): SessionData {
  const session = getSessionFromRequest(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }
  return session
}

/**
 * Require tenant access - validates session has access to the given tenant
 */
export function requireTenantAccess(event: H3Event, tenantSlug: string): SessionData {
  const session = requireAuth(event)
  if (session.tenantSlug !== tenantSlug) {
    throw createError({
      statusCode: 403,
      message: 'Access denied to this workspace'
    })
  }
  return session
}
