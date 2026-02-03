<script setup lang="ts">
definePageMeta({
  layout: false
})

// Mock data - will come from session/API
const user = ref({
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@acme.com',
  avatarUrl: null as string | null,
  title: 'Administrator'
})

const company = ref({
  name: 'Acme Corporation',
  slug: 'acme',
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
  return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase()
})

const showUserMenu = ref(false)

function handleSignOut() {
  // TODO: Clear session and redirect
  navigateTo('/find-domain')
}
</script>

<template>
  <div class="min-h-screen neu-bg">
    <!-- Top Navigation -->
    <header class="sticky top-0 z-50 neu-header">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <!-- Logo & Company -->
          <div class="flex items-center gap-3">
            <div v-if="company.logoUrl" class="w-9 h-9 rounded-lg overflow-hidden">
              <img :src="company.logoUrl" :alt="company.name" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--neu-primary)] to-[var(--neu-primary-dark)] flex items-center justify-center">
              <span class="text-white font-bold text-sm">{{ company.name.substring(0, 2).toUpperCase() }}</span>
            </div>
            <div class="hidden sm:block">
              <p class="font-semibold text-[var(--neu-text)]">{{ company.name }}</p>
              <p class="text-xs text-[var(--neu-text-muted)]">{{ company.slug }}.optivo.app</p>
            </div>
          </div>

          <!-- Center Nav (placeholder) -->
          <nav class="hidden md:flex items-center gap-1">
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--neu-primary)] bg-[var(--neu-primary)]/10">
              Dashboard
            </button>
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors">
              Schedule
            </button>
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors">
              Team
            </button>
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors">
              Reports
            </button>
          </nav>

          <!-- User Menu -->
          <div class="relative">
            <button
              class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--neu-bg-secondary)] transition-colors"
              @click="showUserMenu = !showUserMenu"
            >
              <div v-if="user.avatarUrl" class="w-8 h-8 rounded-full overflow-hidden">
                <img :src="user.avatarUrl" :alt="user.firstName" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neu-primary)] to-[var(--neu-primary-dark)] flex items-center justify-center">
                <span class="text-white text-xs font-medium">{{ userInitials }}</span>
              </div>
              <svg class="w-4 h-4 text-[var(--neu-text-muted)] hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown -->
            <Transition
              enter-active-class="transition-all duration-150"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-all duration-100"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-64 rounded-xl neu-dropdown p-2 origin-top-right"
              >
                <!-- User Info -->
                <div class="px-3 py-2 border-b border-[var(--neu-shadow-dark)]/10 mb-2">
                  <p class="font-medium text-[var(--neu-text)]">{{ user.firstName }} {{ user.lastName }}</p>
                  <p class="text-sm text-[var(--neu-text-muted)]">{{ user.email }}</p>
                  <p class="text-xs text-[var(--neu-primary)] mt-1">{{ user.title }}</p>
                </div>

                <!-- Menu Items -->
                <button class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors text-left">
                  <svg class="w-4 h-4 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
                <button class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)] transition-colors text-left">
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
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <!-- Click outside to close menu -->
    <div
      v-if="showUserMenu"
      class="fixed inset-0 z-40"
      @click="showUserMenu = false"
    />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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

.neu-header {
  background: var(--neu-bg);
  box-shadow: 0 1px 3px var(--neu-shadow-dark);
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

.neu-dropdown {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-raised);
}
</style>
