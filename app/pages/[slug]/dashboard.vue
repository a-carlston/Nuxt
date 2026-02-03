<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Inject layout state
const user = inject<Ref<{ firstName: string; lastName: string; email: string; avatarUrl: string | null; title: string }>>('layoutUser')!
const company = inject<Ref<{ name: string; slug: string; tagline: string; logoUrl: string | null }>>('layoutCompany')!

const stats = [
  { label: 'Employees', value: '1', icon: 'users', color: 'blue' },
  { label: 'Departments', value: '0', icon: 'building', color: 'purple' },
  { label: 'Locations', value: '1', icon: 'pin', color: 'green' },
  { label: 'Open Shifts', value: '0', icon: 'calendar', color: 'amber' }
]

const quickActions = [
  { label: 'Invite Team Member', icon: 'plus', description: 'Add employees to your workspace' },
  { label: 'Create Department', icon: 'building', description: 'Organize your team structure' },
  { label: 'Set Up Schedules', icon: 'calendar', description: 'Start scheduling shifts' },
  { label: 'Company Settings', icon: 'settings', description: 'Configure your workspace' }
]
</script>

<template>
  <!-- Welcome Section -->
  <div class="mb-8">
    <h1 class="text-2xl sm:text-3xl font-bold text-[var(--neu-text)] mb-2">
      Welcome back, {{ user?.firstName }}!
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
      class="neu-card rounded-lg p-4"
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
          <svg v-if="stat.icon === 'users'" class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else-if="stat.icon === 'building'" class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <svg v-else-if="stat.icon === 'pin'" class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <svg v-else-if="stat.icon === 'calendar'" class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
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
        class="neu-card-interactive rounded-lg p-4 text-left group"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg neu-flat flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg v-if="action.icon === 'plus'" class="w-5 h-5 text-[var(--neu-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <svg v-else-if="action.icon === 'building'" class="w-5 h-5 text-[var(--neu-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <svg v-else-if="action.icon === 'calendar'" class="w-5 h-5 text-[var(--neu-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg v-else-if="action.icon === 'settings'" class="w-5 h-5 text-[var(--neu-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
  <div class="neu-card rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-[var(--neu-text)]">Getting Started</h2>
      <span class="text-sm text-[var(--neu-text-muted)]">1 of 5 complete</span>
    </div>

    <div class="w-full h-2 rounded-full bg-[var(--neu-bg-secondary)] mb-6 overflow-hidden">
      <div class="h-full w-[20%] bg-[var(--neu-primary)] rounded-full transition-all" />
    </div>

    <div class="space-y-3">
      <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
        <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p class="text-sm text-green-700 dark:text-green-300 line-through">Complete your profile</p>
      </div>

      <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
        <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
        <p class="text-sm text-[var(--neu-text)]">Invite your first team member</p>
      </div>

      <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
        <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
        <p class="text-sm text-[var(--neu-text)]">Set up your first department</p>
      </div>

      <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
        <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
        <p class="text-sm text-[var(--neu-text)]">Create your first schedule</p>
      </div>

      <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--neu-bg-secondary)] hover:bg-[var(--neu-primary)]/5 cursor-pointer transition-colors">
        <div class="w-6 h-6 rounded-full border-2 border-[var(--neu-text-muted)] flex-shrink-0" />
        <p class="text-sm text-[var(--neu-text)]">Configure company settings</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
