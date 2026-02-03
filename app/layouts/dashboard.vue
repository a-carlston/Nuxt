<script setup lang="ts">
// Get tenant slug from route
const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

// Auth state
const { user: authUser, logout, userInitials: authUserInitials } = useAuth()

const isLoading = ref(true)

const user = ref({
  firstName: '',
  lastName: '',
  email: '',
  avatarUrl: null as string | null,
  title: ''
})

const company = ref({
  name: '',
  slug: '',
  tagline: '',
  logoUrl: null as string | null
})

const userInitials = computed(() => {
  if (!user.value.firstName || !user.value.lastName) {
    return authUserInitials.value || '?'
  }
  return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase()
})

const isExpanded = ref(false)

const { themeMode, effectiveTheme, colorPalette, setThemeMode, setPalette, palettes, initTheme } = useTheme()

const paletteColors: Record<string, string> = {
  corporate: '#6366f1',
  lava: '#ef4444',
  dracula: '#bd93f9',
  ocean: '#0ea5e9',
  forest: '#22c55e'
}

// Determine current route for nav highlighting
const currentRoute = computed(() => {
  const path = route.path
  if (path.includes('/directory')) return 'directory'
  if (path.includes('/dashboard')) return 'dashboard'
  // Settings and admin pages don't highlight any nav item
  return ''
})

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'directory', label: 'Directory' }
]

function handleNavSelect(id: string) {
  const slug = tenantSlug.value
  if (id === 'dashboard') {
    navigateTo(`/${slug}/dashboard`)
  } else if (id === 'directory') {
    navigateTo(`/${slug}/directory`)
  }
}

// Provide layout state to child pages
provide('layoutUser', user)
provide('layoutCompany', company)
provide('layoutIsExpanded', isExpanded)
provide('layoutIsLoading', isLoading)

onMounted(async () => {
  // Initialize theme (client-side only)
  if (import.meta.client) {
    initTheme()
  }

  const slug = tenantSlug.value
  if (!slug) {
    navigateTo('/find-domain')
    return
  }

  try {
    // Fetch company info using route slug
    const tenantResponse = await $fetch<{ exists: boolean; tenant: any }>(`/api/tenant/${slug}`)
    if (!tenantResponse.exists) {
      navigateTo('/find-domain')
      return
    }

    if (tenantResponse.tenant) {
      company.value = {
        name: tenantResponse.tenant.companyName || '',
        slug: slug,
        tagline: tenantResponse.tenant.tagline || '',
        logoUrl: tenantResponse.tenant.logoUrl || null
      }
    }

    // Use auth user data if available
    if (authUser.value) {
      user.value = {
        firstName: authUser.value.firstName || '',
        lastName: authUser.value.lastName || '',
        email: authUser.value.email || '',
        avatarUrl: authUser.value.avatarUrl || null,
        title: 'Team Member'
      }

      // Fetch additional user info (title, etc.) if needed
      try {
        const userResponse = await $fetch<{ success: boolean; user: any }>(`/api/onboarding/user`, {
          query: { slug, userId: authUser.value.id }
        })
        if (userResponse.success && userResponse.user) {
          user.value.title = userResponse.user.title || 'Team Member'
        }
      } catch {
        // User fetch failed, continue with basic info
      }
    }
  } catch (error) {
    console.error('Failed to load layout data:', error)
    navigateTo('/find-domain')
    return
  }

  isLoading.value = false
})

async function handleSignOut() {
  await logout()
  navigateTo('/find-domain')
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="min-h-screen neu-bg flex items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] rounded-full animate-spin" />
      <p class="text-[var(--neu-text-muted)]">Loading...</p>
    </div>
  </div>

  <div v-else class="min-h-screen neu-bg">
    <!-- Top Navigation -->
    <NeuNavbar
      :items="navItems"
      :active-item="currentRoute"
      :expanded="isExpanded"
      @select="handleNavSelect"
    >
      <template #logo>
        <div class="flex items-center gap-3">
          <NeuAvatar
            :src="company.logoUrl || undefined"
            :initials="company.name.substring(0, 2)"
            :alt="company.name"
            size="lg"
          />
          <div class="hidden sm:block">
            <p class="font-semibold text-[var(--neu-text)]">{{ company.name }}</p>
            <p v-if="company.tagline" class="text-xs text-[var(--neu-text-muted)]">{{ company.tagline }}</p>
          </div>
        </div>
      </template>

      <template #actions>
        <!-- Theme Toggle -->
        <NeuDropdown placement="bottom-end" width="192px">
          <template #trigger="{ isOpen }">
            <button
              class="neu-expand-btn p-2 rounded-lg transition-all"
              :class="{ 'is-active': isOpen }"
              title="Theme settings"
            >
              <svg v-if="effectiveTheme === 'light'" class="w-5 h-5 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else class="w-5 h-5 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
          </template>

          <template #default>
            <div class="p-3">
              <!-- Mode Selection -->
              <p class="px-1 py-1 text-xs font-medium text-[var(--neu-text-muted)] uppercase">Mode</p>
              <div class="theme-toggle-container flex gap-1 p-1.5 mb-3 rounded-lg">
                <button
                  class="theme-toggle-btn flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all"
                  :class="{ 'is-active': themeMode === 'light' }"
                  @click="setThemeMode('light')"
                >
                  Light
                </button>
                <button
                  class="theme-toggle-btn flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all"
                  :class="{ 'is-active': themeMode === 'dark' }"
                  @click="setThemeMode('dark')"
                >
                  Dark
                </button>
                <button
                  class="theme-toggle-btn flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all"
                  :class="{ 'is-active': themeMode === 'system' }"
                  @click="setThemeMode('system')"
                >
                  Auto
                </button>
              </div>

              <!-- Palette Selection -->
              <p class="px-1 py-1 text-xs font-medium text-[var(--neu-text-muted)] uppercase">Color</p>
              <div class="flex gap-2 p-1">
                <button
                  v-for="palette in palettes"
                  :key="palette"
                  class="w-6 h-6 rounded-full transition-all ring-offset-2 ring-offset-[var(--neu-bg-secondary)]"
                  :class="colorPalette === palette ? 'ring-2 ring-[var(--neu-text)]' : 'hover:scale-110'"
                  :style="{ backgroundColor: paletteColors[palette] }"
                  :title="palette"
                  @click="setPalette(palette)"
                />
              </div>
            </div>
          </template>
        </NeuDropdown>

        <!-- Expand Toggle -->
        <button
          class="neu-expand-btn p-2 rounded-lg transition-all"
          :title="isExpanded ? 'Collapse' : 'Expand'"
          @click="isExpanded = !isExpanded"
        >
          <svg
            v-if="!isExpanded"
            class="w-5 h-5 text-[var(--neu-text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-[var(--neu-text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </button>

        <!-- User Dropdown -->
        <NeuDropdown placement="bottom-end" width="256px">
          <template #trigger>
            <NeuAvatar
              :src="user.avatarUrl || undefined"
              :initials="userInitials"
              :alt="`${user.firstName} ${user.lastName}`"
              size="lg"
              clickable
            />
          </template>

          <template #default="{ close }">
            <!-- User Info -->
            <div class="px-4 py-3 border-b border-[var(--neu-shadow-dark)]/10">
              <p class="font-medium text-[var(--neu-text)]">{{ user.firstName }} {{ user.lastName }}</p>
              <p class="text-sm text-[var(--neu-text-muted)]">{{ user.email }}</p>
              <p class="text-xs text-[var(--neu-primary)] mt-1">{{ user.title }}</p>
            </div>

            <!-- Menu Items -->
            <div class="p-2">
              <NuxtLink
                :to="`/${tenantSlug}/settings/profile`"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors text-left"
                @click="close"
              >
                <svg class="w-4 h-4 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </NuxtLink>
              <button class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors text-left">
                <svg class="w-4 h-4 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </div>

            <div class="border-t border-[var(--neu-shadow-dark)]/10 p-2">
              <button
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                @click="close(); handleSignOut()"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </template>
        </NeuDropdown>
      </template>
    </NeuNavbar>

    <!-- Main Content -->
    <main :class="[isExpanded ? 'w-full px-8' : 'max-w-7xl mx-auto px-4 sm:px-6', 'py-8 transition-all']">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.neu-bg {
  background: var(--neu-bg);
}

.neu-expand-btn {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-expand-btn:hover {
  box-shadow: var(--neu-shadow-pressed);
}

.theme-toggle-container {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}

.theme-toggle-btn {
  color: var(--neu-text-muted);
}

.theme-toggle-btn:hover:not(.is-active) {
  color: var(--neu-text);
}

.theme-toggle-btn.is-active {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  color: var(--neu-primary);
}
</style>
