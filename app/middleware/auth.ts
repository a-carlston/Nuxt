/**
 * Authentication middleware for protected routes.
 *
 * This middleware:
 * - Validates the session on both server and client
 * - Redirects to signin if not authenticated
 * - Validates tenant access based on the route slug
 *
 * Usage:
 * definePageMeta({
 *   middleware: 'auth'
 * })
 */

export default defineNuxtRouteMiddleware(async (to) => {
  const { initAuth, isAuthenticated, hasAccessToTenant } = useAuth()

  // Initialize auth state (fetches session from server)
  await initAuth()

  // Get tenant slug from route params
  const slug = to.params.slug as string | undefined

  // If not authenticated, redirect to signin
  if (!isAuthenticated.value) {
    if (slug) {
      // Redirect to tenant-specific signin page
      return navigateTo(`/signin/${slug}`)
    }
    // Redirect to workspace finder if no slug
    return navigateTo('/find-domain')
  }

  // If authenticated but trying to access a different tenant, block access
  if (slug && !hasAccessToTenant(slug)) {
    // User is logged in but to a different tenant
    // Redirect to their own dashboard or show error
    const { tenant } = useAuth()
    if (tenant.value?.slug) {
      return navigateTo(`/${tenant.value.slug}/dashboard`)
    }
    // If no tenant in session, redirect to find-domain
    return navigateTo('/find-domain')
  }
})
