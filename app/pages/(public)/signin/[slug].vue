<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const slug = computed(() => route.params.slug as string)

// Types
interface TenantInfo {
  companyName: string
  logoUrl: string | null
  headerImageUrl: string | null
  useCustomHeader: boolean
  primaryColor?: string
}

interface UserInfo {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  email: string
}

// State
const step = ref<'email' | 'password'>('email')
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)

// Tenant data
const tenant = ref<TenantInfo | null>(null)

// User data (after email lookup)
const user = ref<UserInfo | null>(null)

const isLoadingTenant = ref(true)
const tenantError = ref<string | null>(null)

// Fetch tenant info on mount
onMounted(async () => {
  try {
    const response = await $fetch<{ exists: boolean; tenant: TenantInfo | null }>(`/api/tenant/${slug.value}`)
    if (response.exists && response.tenant) {
      tenant.value = response.tenant
    } else {
      tenantError.value = 'Workspace not found'
    }
  } catch (e: any) {
    tenantError.value = e.data?.message || 'Failed to load workspace'
  } finally {
    isLoadingTenant.value = false
  }
})

// Look up user by email
async function lookupUser() {
  if (!email.value.trim()) {
    error.value = 'Please enter your email'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<{ exists: boolean; user: UserInfo | null }>(`/api/tenant/${slug.value}/user`, {
      method: 'POST',
      body: { email: email.value }
    })

    if (response.exists && response.user) {
      user.value = response.user
      step.value = 'password'
    } else {
      error.value = 'No account found with this email'
    }
  } catch (e: any) {
    error.value = e.data?.message || 'No account found with this email'
  } finally {
    isLoading.value = false
  }
}

// Sign in with password
async function signIn() {
  if (!password.value) {
    error.value = 'Please enter your password'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<{ success: boolean; onboardingCompleted: boolean; user: { id: string } }>(`/api/auth/login`, {
      method: 'POST',
      body: {
        slug: slug.value,
        email: email.value,
        password: password.value,
        rememberMe: rememberMe.value
      }
    })

    if (response.success) {
      // Store session info for onboarding/app pages
      localStorage.setItem('session', JSON.stringify({
        userId: response.user.id,
        tenantSlug: slug.value
      }))

      // Redirect based on onboarding status
      if (response.onboardingCompleted) {
        await navigateTo(`/${slug.value}/dashboard`)
      } else {
        await navigateTo(`/onboarding`)
      }
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Invalid password. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  step.value = 'email'
  user.value = null
  password.value = ''
  error.value = null
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (step.value === 'email') {
      lookupUser()
    } else {
      signIn()
    }
  }
}

// Get initials for avatar fallback
const userInitials = computed(() => {
  if (!user.value) return ''
  return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--neu-bg)] flex flex-col">
    <!-- Header -->
    <header class="p-4 sm:p-6">
      <NuxtLink to="/find-domain" class="flex items-center gap-2 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] transition-colors w-fit">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span class="text-sm">Back to workspace finder</span>
      </NuxtLink>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Loading State -->
        <NeuCard v-if="isLoadingTenant" padding="lg" class="text-center">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] animate-spin" />
          <p class="text-[var(--neu-text-muted)]">Loading workspace...</p>
        </NeuCard>

        <!-- Error State -->
        <NeuCard v-else-if="tenantError" padding="lg" class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-[var(--neu-text)] mb-2">Workspace not found</h2>
          <p class="text-sm text-[var(--neu-text-muted)] mb-4">
            We couldn't find a workspace at <strong>{{ slug }}</strong>.optivo.app
          </p>
          <NuxtLink to="/signin">
            <NeuButton variant="primary">Try another workspace</NeuButton>
          </NuxtLink>
        </NeuCard>

        <!-- Sign In Card -->
        <NeuCard v-else padding="lg">
          <!-- Company Branding -->
          <div class="flex flex-col items-center mb-6">
            <!-- Company Logo -->
            <NeuAvatar
              :src="tenant?.logoUrl || undefined"
              :initials="tenant?.companyName?.substring(0, 2).toUpperCase() || 'CO'"
              :alt="tenant?.companyName || 'Company'"
              size="xl"
              class="mb-4"
            />

            <!-- Company Name or Custom Header -->
            <div v-if="tenant?.useCustomHeader && tenant?.headerImageUrl" class="h-8 mb-2">
              <img :src="tenant.headerImageUrl" :alt="tenant.companyName" class="h-full object-contain" />
            </div>
            <h1 v-else class="text-xl font-bold text-[var(--neu-text)]">
              {{ tenant?.companyName }}
            </h1>

            <p class="text-sm text-[var(--neu-text-muted)]">
              Sign in to your workspace
            </p>
          </div>

          <!-- Email Step -->
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 translate-x-4"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-4"
          >
            <div v-if="step === 'email'" key="email" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Email address</label>
                <div class="neu-input rounded-xl overflow-hidden">
                  <input
                    v-model="email"
                    type="email"
                    placeholder="you@company.com"
                    class="w-full px-4 py-2 bg-transparent text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none"
                    @keydown="handleKeydown"
                  />
                </div>
              </div>

              <!-- Error Message -->
              <Transition
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="error" class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                  {{ error }}
                </div>
              </Transition>

              <NeuButton
                variant="primary"
                class="w-full"
                :loading="isLoading"
                :disabled="isLoading"
                @click="lookupUser"
              >
                Continue
              </NeuButton>
            </div>

            <!-- Password Step -->
            <div v-else key="password" class="space-y-4">
              <!-- User Info Card -->
              <NeuCard variant="flat" padding="sm" class="flex items-center gap-4">
                <button
                  type="button"
                  class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-shadow-light)] transition-all"
                  @click="goBack"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <NeuAvatar
                  :src="user?.avatarUrl || undefined"
                  :initials="userInitials"
                  :alt="user?.firstName || 'User'"
                  size="lg"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-base font-semibold text-[var(--neu-text)] truncate">
                    {{ user?.firstName }} {{ user?.lastName }}
                  </p>
                  <p class="text-sm text-[var(--neu-text-muted)] truncate">{{ user?.email }}</p>
                </div>
              </NeuCard>

              <!-- Password Input -->
              <div>
                <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Password</label>
                <div class="neu-input rounded-xl overflow-hidden flex items-center">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Enter your password"
                    class="flex-1 px-4 py-2 bg-transparent text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none"
                    @keydown="handleKeydown"
                  />
                  <button
                    type="button"
                    class="px-3 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] transition-colors"
                    @click="showPassword = !showPassword"
                  >
                    <svg v-if="showPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Remember Me & Forgot Password -->
              <div class="flex items-center justify-between">
                <NeuCheckbox v-model="rememberMe" label="Remember me" size="sm" />
                <a href="#" class="text-sm text-[var(--neu-primary)] hover:underline">Forgot password?</a>
              </div>

              <!-- Error Message -->
              <Transition
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="error" class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                  {{ error }}
                </div>
              </Transition>

              <NeuButton
                variant="primary"
                class="w-full"
                :loading="isLoading"
                :disabled="isLoading"
                @click="signIn"
              >
                {{ isLoading ? 'Signing in...' : 'Sign in' }}
              </NeuButton>
            </div>
          </Transition>

          <!-- SSO Options (future) -->
          <div class="mt-6 pt-6 border-t border-[var(--neu-shadow-dark)]/10">
            <p class="text-xs text-center text-[var(--neu-text-muted)]">
              Need access? Contact your administrator
            </p>
          </div>
        </NeuCard>
      </div>
    </main>
  </div>
</template>
