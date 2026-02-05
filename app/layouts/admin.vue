<script setup lang="ts">
/**
 * Admin Layout
 *
 * Extends dashboard layout with admin sidebar navigation.
 * Used by all admin pages.
 */

const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

// Determine active admin section
const activeSection = computed(() => {
  const path = route.path
  if (path.includes('/admin/roles')) return 'roles'
  if (path.includes('/admin/fields')) return 'fields'
  if (path.endsWith('/admin')) return 'overview'
  return 'overview'
})

const adminNavItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'grid',
    path: '/admin'
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    icon: 'shield',
    path: '/admin/roles'
  },
  {
    id: 'fields',
    label: 'Field Manager',
    icon: 'settings',
    path: '/admin/fields'
  }
]

function navigateToSection(item: typeof adminNavItems[0]) {
  navigateTo(`/${tenantSlug.value}${item.path}`)
}
</script>

<template>
  <NuxtLayout name="dashboard">
    <div class="flex flex-col lg:flex-row gap-3 lg:gap-6 min-h-[calc(100vh-140px)]">
      <!-- Mobile Admin Tabs -->
      <div class="lg:hidden overflow-x-auto -mx-4 px-4">
        <div class="inline-flex gap-1 p-1 bg-[var(--neu-bg-secondary)]/50 rounded-xl min-w-full">
          <button
            v-for="item in adminNavItems"
            :key="item.id"
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap"
            :class="[
              activeSection === item.id
                ? 'bg-[var(--neu-bg)] text-[var(--neu-primary)] shadow-[2px_2px_4px_var(--neu-shadow-dark),-2px_-2px_4px_var(--neu-shadow-light)]'
                : 'text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]'
            ]"
            @click="navigateToSection(item)"
          >
            <!-- Icons -->
            <svg v-if="item.icon === 'grid'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <svg v-else-if="item.icon === 'shield'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <svg v-else-if="item.icon === 'lock'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <svg v-else-if="item.icon === 'settings'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="hidden sm:inline">{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Desktop Admin Sidebar -->
      <div class="hidden lg:block w-52 flex-shrink-0">
        <NeuCard variant="flat" padding="none" class="sticky top-6 overflow-hidden">
          <nav class="py-2 pl-2">
            <button
              v-for="item in adminNavItems"
              :key="item.id"
              class="w-full flex items-center gap-3 pl-3 pr-4 py-2.5 text-left transition-all mb-1"
              :class="[
                activeSection === item.id
                  ? 'bg-[var(--neu-bg-secondary)] text-[var(--neu-primary)] rounded-l-lg shadow-[inset_3px_3px_6px_var(--neu-shadow-dark),inset_-1px_-1px_4px_var(--neu-shadow-light)]'
                  : 'text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] rounded-lg mr-2 hover:bg-[var(--neu-bg-secondary)]/30'
              ]"
              @click="navigateToSection(item)"
            >
              <!-- Icons -->
              <svg v-if="item.icon === 'grid'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <svg v-else-if="item.icon === 'shield'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <svg v-else-if="item.icon === 'lock'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <svg v-else-if="item.icon === 'settings'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="font-medium">{{ item.label }}</span>
            </button>
          </nav>
        </NeuCard>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 min-w-0">
        <slot />
      </div>
    </div>
  </NuxtLayout>
</template>
