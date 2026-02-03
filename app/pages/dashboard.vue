<script setup lang="ts">
definePageMeta({
  layout: false
})

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

const stats = [
  { label: 'Employees', value: '1', icon: '👥', color: 'blue' },
  { label: 'Departments', value: '0', icon: '🏢', color: 'purple' },
  { label: 'Locations', value: '1', icon: '📍', color: 'green' },
  { label: 'Open Shifts', value: '0', icon: '📅', color: 'amber' }
]

const quickActions = [
  { label: 'Invite Team Member', icon: '➕', description: 'Add employees to your workspace' },
  { label: 'Create Department', icon: '🏢', description: 'Organize your team structure' },
  { label: 'Set Up Schedules', icon: '📅', description: 'Start scheduling shifts' },
  { label: 'Company Settings', icon: '⚙️', description: 'Configure your workspace' }
]

const userInitials = computed(() => {
  if (!user.value.firstName || !user.value.lastName) return '?'
  return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase()
})

const showUserMenu = ref(false)
const showThemeMenu = ref(false)
const isExpanded = ref(false)

const { themeMode, effectiveTheme, colorPalette, setThemeMode, setPalette, palettes, initTheme } = useTheme()

const paletteColors: Record<string, string> = {
  corporate: '#6366f1',
  lava: '#ef4444',
  dracula: '#bd93f9',
  ocean: '#0ea5e9',
  forest: '#22c55e'
}

const currentRoute = ref('dashboard')

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'directory', label: 'Directory' }
]

function handleNavSelect(id: string) {
  currentRoute.value = id
  if (id === 'dashboard') {
    navigateTo('/dashboard')
  } else if (id === 'directory') {
    navigateTo('/directory')
  }
}

onMounted(async () => {
  // Initialize theme
  initTheme()

  // Load session from localStorage
  const sessionStr = localStorage.getItem('session')
  if (!sessionStr) {
    navigateTo('/find-domain')
    return
  }

  try {
    const session = JSON.parse(sessionStr)
    if (!session.userId || !session.tenantSlug) {
      navigateTo('/find-domain')
      return
    }

    // Fetch company info
    const tenantResponse = await $fetch<{ exists: boolean; tenant: any }>(`/api/tenant/${session.tenantSlug}`)
    if (tenantResponse.exists && tenantResponse.tenant) {
      company.value = {
        name: tenantResponse.tenant.companyName || '',
        slug: tenantResponse.tenant.companySlug || '',
        tagline: tenantResponse.tenant.tagline || '',
        logoUrl: tenantResponse.tenant.logoUrl || null
      }
    }

    // Fetch user info
    const userResponse = await $fetch<{ success: boolean; user: any }>(`/api/onboarding/user`, {
      query: {
        slug: session.tenantSlug,
        userId: session.userId
      }
    })
    if (userResponse.success && userResponse.user) {
      user.value = {
        firstName: userResponse.user.firstName || '',
        lastName: userResponse.user.lastName || '',
        email: userResponse.user.email || '',
        avatarUrl: userResponse.user.avatarUrl || null,
        title: userResponse.user.title || 'Team Member'
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    // If session is invalid, redirect to find domain
    navigateTo('/find-domain')
    return
  }

  isLoading.value = false
})

function handleSignOut() {
  localStorage.removeItem('session')
  navigateTo('/find-domain')
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="min-h-screen neu-bg flex items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] rounded-full animate-spin" />
      <p class="text-[var(--neu-text-muted)]">Loading dashboard...</p>
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
        <div class="relative">
          <button
            class="neu-expand-btn p-2 rounded-xl transition-all"
            title="Theme settings"
            @click="showThemeMenu = !showThemeMenu"
          >
            <svg v-if="effectiveTheme === 'light'" class="w-5 h-5 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else class="w-5 h-5 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          <!-- Theme Dropdown -->
          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <NeuCard
              v-if="showThemeMenu"
              variant="flat"
              padding="sm"
              class="absolute right-0 mt-2 w-48 z-50 origin-top-right"
            >
              <!-- Mode Selection -->
              <p class="px-2 py-1 text-xs font-medium text-[var(--neu-text-muted)] uppercase">Mode</p>
              <div class="theme-toggle-container flex gap-1 p-1.5 mb-3 rounded-xl">
                <button
                  class="theme-toggle-btn flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  :class="{ 'is-active': themeMode === 'light' }"
                  @click="setThemeMode('light')"
                >
                  Light
                </button>
                <button
                  class="theme-toggle-btn flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  :class="{ 'is-active': themeMode === 'dark' }"
                  @click="setThemeMode('dark')"
                >
                  Dark
                </button>
                <button
                  class="theme-toggle-btn flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  :class="{ 'is-active': themeMode === 'system' }"
                  @click="setThemeMode('system')"
                >
                  Auto
                </button>
              </div>

              <!-- Palette Selection -->
              <p class="px-2 py-1 text-xs font-medium text-[var(--neu-text-muted)] uppercase">Color</p>
              <div class="flex gap-2 p-2">
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
            </NeuCard>
          </Transition>

          <!-- Click outside to close -->
          <div
            v-if="showThemeMenu"
            class="fixed inset-0 -z-10"
            @click="showThemeMenu = false"
          />
        </div>

        <!-- Expand Toggle -->
        <button
          class="neu-expand-btn p-2 rounded-xl transition-all"
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

        <div class="relative">
          <NeuAvatar
            :src="user.avatarUrl || undefined"
            :initials="userInitials"
            :alt="`${user.firstName} ${user.lastName}`"
            size="lg"
            clickable
            @click="showUserMenu = !showUserMenu"
          />

          <!-- Dropdown -->
          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <NeuCard
              v-if="showUserMenu"
              variant="flat"
              padding="sm"
              class="absolute right-0 mt-2 w-64 z-50 origin-top-right"
            >
              <!-- User Info -->
              <div class="px-2 py-2 border-b border-[var(--neu-shadow-dark)]/10 mb-2">
                <p class="font-medium text-[var(--neu-text)]">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-sm text-[var(--neu-text-muted)]">{{ user.email }}</p>
                <p class="text-xs text-[var(--neu-primary)] mt-1">{{ user.title }}</p>
              </div>

              <!-- Menu Items -->
              <button class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg)] transition-colors text-left">
                <svg class="w-4 h-4 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </button>
              <button class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg)] transition-colors text-left">
                <svg class="w-4 h-4 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>

              <div class="border-t border-[var(--neu-shadow-dark)]/10 mt-2 pt-2">
                <button
                  class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  @click="handleSignOut"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </NeuCard>
          </Transition>

          <!-- Click outside to close menu -->
          <div
            v-if="showUserMenu"
            class="fixed inset-0 -z-10"
            @click="showUserMenu = false"
          />
        </div>
      </template>
    </NeuNavbar>

    <!-- Main Content -->
    <main :class="[isExpanded ? 'w-full px-8' : 'max-w-7xl mx-auto px-4 sm:px-6', 'py-8 transition-all']">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-[var(--neu-text)] mb-2">
          Welcome back, {{ user.firstName }}!
        </h1>
        <p class="text-[var(--neu-text-muted)]">
          Here's what's happening with your workspace today.
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="neu-card rounded-xl p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :class="{
                'bg-blue-100 dark:bg-blue-900/30': stat.color === 'blue',
                'bg-purple-100 dark:bg-purple-900/30': stat.color === 'purple',
                'bg-green-100 dark:bg-green-900/30': stat.color === 'green',
                'bg-amber-100 dark:bg-amber-900/30': stat.color === 'amber'
              }"
            >
              <span class="text-lg">{{ stat.icon }}</span>
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--neu-text)]">{{ stat.value }}</p>
              <p class="text-sm text-[var(--neu-text-muted)]">{{ stat.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-[var(--neu-text)] mb-4">Quick Actions</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            v-for="action in quickActions"
            :key="action.label"
            class="neu-card-interactive rounded-xl p-4 text-left group"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg neu-flat flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="text-lg">{{ action.icon }}</span>
              </div>
              <div class="flex-1">
                <p class="font-medium text-[var(--neu-text)] group-hover:text-[var(--neu-primary)] transition-colors">
                  {{ action.label }}
                </p>
                <p class="text-sm text-[var(--neu-text-muted)]">{{ action.description }}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Getting Started Checklist -->
      <div class="neu-card rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-[var(--neu-text)]">Getting Started</h2>
          <span class="text-sm text-[var(--neu-text-muted)]">1 of 5 complete</span>
        </div>

        <div class="w-full h-2 rounded-full bg-[var(--neu-bg-secondary)] mb-6 overflow-hidden">
          <div class="h-full w-[20%] bg-[var(--neu-primary)] rounded-full transition-all" />
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
            <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-sm text-green-700 dark:text-green-300 line-through">Complete your profile</p>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
            <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
            <p class="text-sm text-[var(--neu-text)]">Invite your first team member</p>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
            <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
            <p class="text-sm text-[var(--neu-text)]">Set up your first department</p>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
            <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
            <p class="text-sm text-[var(--neu-text)]">Create your first schedule</p>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
            <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
            <p class="text-sm text-[var(--neu-text)]">Configure company settings</p>
          </div>
        </div>
      </div>
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

.neu-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-card-interactive {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  transition: all 0.2s ease;
}

.neu-card-interactive:hover {
  box-shadow: var(--neu-shadow-raised);
}

.neu-card-interactive:active {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-flat {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}
</style>
