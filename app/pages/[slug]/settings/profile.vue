<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

// Auth state
const { user: authUser, isInitialized: authInitialized, initAuth } = useAuth()

// Inject layout state
const layoutUser = inject<Ref<{ firstName: string; lastName: string; email: string; avatarUrl: string | null; title: string }>>('layoutUser')
const isExpanded = inject<Ref<boolean>>('layoutIsExpanded')

// Tabs
const activeTab = ref('personal')
const tabs = [
  { id: 'personal', label: 'Personal' },
  { id: 'address', label: 'Address' },
  { id: 'emergency', label: 'Emergency Contact' },
  { id: 'company', label: 'Company' },
  { id: 'account', label: 'Account' }
]

// Form state
const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

// Editable personal info
const form = ref({
  // Basic info
  firstName: '',
  preferredName: '',
  lastName: '',
  maidenName: '',
  phone: '',
  phoneCountryCode: '+1',
  avatarUrl: null as string | null,
  dateOfBirth: '',
  gender: '',
  nationality: '',

  // Personal Address
  addressCountry: 'US',
  addressState: '',
  addressCity: '',
  addressLine1: '',
  addressLine2: '',
  addressPostalCode: '',

  // Emergency Contact
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  emergencyContactEmail: '',
  emergencyContactAddress: ''
})

// Read-only company info
const companyInfo = ref({
  email: '',
  phone: '',
  phoneExt: '',
  department: '',
  division: '',
  location: '',
  title: '',
  employeeId: '',
  startDate: '',
  hireDate: '',
  employmentType: ''
})

// Location data composable with reactive state/city based on country
const {
  countries,
  nationalitiesList,
  states: addressStates,
  cities: addressCities,
  genderOptions,
  relationshipOptions,
  enableWatchers: enableLocationWatchers
} = useLocationData({
  countryRef: computed({
    get: () => form.value.addressCountry,
    set: (v) => { form.value.addressCountry = v }
  }),
  stateRef: computed({
    get: () => form.value.addressState,
    set: (v) => { form.value.addressState = v }
  }),
  cityRef: computed({
    get: () => form.value.addressCity,
    set: (v) => { form.value.addressCity = v }
  })
})

// Avatar upload state
const avatarInput = ref<HTMLInputElement | null>(null)
const isUploadingAvatar = ref(false)

const userInitials = computed(() => {
  if (!form.value.firstName || !form.value.lastName) return '?'
  return `${form.value.firstName[0]}${form.value.lastName[0]}`.toUpperCase()
})

const formattedStartDate = computed(() => {
  if (!companyInfo.value.startDate) return ''
  return new Date(companyInfo.value.startDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const formattedHireDate = computed(() => {
  if (!companyInfo.value.hireDate) return ''
  return new Date(companyInfo.value.hireDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Load user profile data
async function loadProfile() {
  if (!authUser.value?.id) return

  isLoading.value = true
  try {
    const response = await $fetch<{
      success: boolean
      profile: {
        personal: {
          firstName: string
          preferredName: string
          lastName: string
          maidenName: string
          phone: string
          phoneCountryCode: string
          avatarUrl: string | null
          dateOfBirth: string
          gender: string
          nationality: string
          addressLine1: string
          addressLine2: string
          addressCity: string
          addressStateCode: string
          addressPostalCode: string
          addressCountryCode: string
          emergencyContactName: string
          emergencyContactRelationship: string
          emergencyContactPhone: string
          emergencyContactEmail: string
          emergencyContactAddress: string
        }
        company: {
          email: string
          phone: string
          phoneExt: string
          department: string
          division: string
          location: string
          title: string
          employeeId: string
          startDate: string
          hireDate: string
          employmentType: string
        }
      }
    }>(`/api/tenant/${tenantSlug.value}/user/profile`, {
      query: { userId: authUser.value.id }
    })

    if (response.success) {
      form.value = {
        firstName: response.profile.personal.firstName || '',
        preferredName: response.profile.personal.preferredName || '',
        lastName: response.profile.personal.lastName || '',
        maidenName: response.profile.personal.maidenName || '',
        phone: response.profile.personal.phone || '',
        phoneCountryCode: response.profile.personal.phoneCountryCode || '+1',
        avatarUrl: response.profile.personal.avatarUrl || null,
        dateOfBirth: response.profile.personal.dateOfBirth || '',
        gender: response.profile.personal.gender || '',
        nationality: response.profile.personal.nationality || '',
        addressCountry: response.profile.personal.addressCountryCode || 'US',
        addressState: response.profile.personal.addressStateCode || '',
        addressCity: response.profile.personal.addressCity || '',
        addressLine1: response.profile.personal.addressLine1 || '',
        addressLine2: response.profile.personal.addressLine2 || '',
        addressPostalCode: response.profile.personal.addressPostalCode || '',
        emergencyContactName: response.profile.personal.emergencyContactName || '',
        emergencyContactRelationship: response.profile.personal.emergencyContactRelationship || '',
        emergencyContactPhone: response.profile.personal.emergencyContactPhone || '',
        emergencyContactEmail: response.profile.personal.emergencyContactEmail || '',
        emergencyContactAddress: response.profile.personal.emergencyContactAddress || ''
      }
      companyInfo.value = {
        email: response.profile.company.email || '',
        phone: response.profile.company.phone || '',
        phoneExt: response.profile.company.phoneExt || '',
        department: response.profile.company.department || '',
        division: response.profile.company.division || '',
        location: response.profile.company.location || '',
        title: response.profile.company.title || '',
        employeeId: response.profile.company.employeeId || '',
        startDate: response.profile.company.startDate || '',
        hireDate: response.profile.company.hireDate || '',
        employmentType: response.profile.company.employmentType || ''
      }

      // Enable location watchers after data is loaded
      nextTick(() => {
        enableLocationWatchers()
      })
    }
  } catch (error) {
    console.error('Failed to load profile:', error)
  } finally {
    isLoading.value = false
  }
}

// Save profile changes
async function saveProfile() {
  if (!authUser.value?.id) return

  isSaving.value = true
  saveSuccess.value = false
  saveError.value = ''

  try {
    await $fetch(`/api/tenant/${tenantSlug.value}/user/profile`, {
      method: 'POST',
      body: {
        userId: authUser.value.id,
        firstName: form.value.firstName,
        preferredName: form.value.preferredName,
        lastName: form.value.lastName,
        maidenName: form.value.maidenName,
        phone: form.value.phone,
        phoneCountryCode: form.value.phoneCountryCode,
        avatarUrl: form.value.avatarUrl,
        dateOfBirth: form.value.dateOfBirth,
        gender: form.value.gender,
        nationality: form.value.nationality,
        addressLine1: form.value.addressLine1,
        addressLine2: form.value.addressLine2,
        addressCity: form.value.addressCity,
        addressStateCode: form.value.addressState,
        addressPostalCode: form.value.addressPostalCode,
        addressCountryCode: form.value.addressCountry,
        emergencyContactName: form.value.emergencyContactName,
        emergencyContactRelationship: form.value.emergencyContactRelationship,
        emergencyContactPhone: form.value.emergencyContactPhone,
        emergencyContactEmail: form.value.emergencyContactEmail,
        emergencyContactAddress: form.value.emergencyContactAddress
      }
    })

    saveSuccess.value = true

    // Update layout user state
    if (layoutUser) {
      layoutUser.value = {
        ...layoutUser.value,
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        avatarUrl: form.value.avatarUrl
      }
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error: any) {
    saveError.value = error.data?.message || 'Failed to save profile'
  } finally {
    isSaving.value = false
  }
}

// Avatar upload handlers
function triggerAvatarUpload() {
  avatarInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    saveError.value = 'Please select an image file'
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    saveError.value = 'Image must be less than 5MB'
    return
  }

  isUploadingAvatar.value = true
  saveError.value = ''

  try {
    // Convert to base64 for preview (in production, upload to storage service)
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.avatarUrl = e.target?.result as string
      isUploadingAvatar.value = false
    }
    reader.onerror = () => {
      saveError.value = 'Failed to read image file'
      isUploadingAvatar.value = false
    }
    reader.readAsDataURL(file)
  } catch (error) {
    saveError.value = 'Failed to upload avatar'
    isUploadingAvatar.value = false
  }

  // Clear the input so the same file can be selected again
  input.value = ''
}

function removeAvatar() {
  form.value.avatarUrl = null
}

onMounted(async () => {
  // Wait for auth to be initialized if not already
  if (!authInitialized.value) {
    await initAuth()
  }

  loadProfile()
})
</script>

<template>
  <div :class="[isExpanded ? 'w-full' : 'max-w-4xl mx-auto', 'transition-all']">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex items-center gap-2 text-sm text-[var(--neu-text-muted)] mb-2">
        <NuxtLink
          :to="`/${tenantSlug}/dashboard`"
          class="hover:text-[var(--neu-primary)] transition-colors"
        >
          Dashboard
        </NuxtLink>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span>Settings</span>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-[var(--neu-text)]">Profile</span>
      </div>
      <h1 class="text-2xl font-bold text-[var(--neu-text)]">My Profile</h1>
      <p class="text-[var(--neu-text-muted)] mt-1">
        Manage your personal information and view company-assigned details.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] rounded-full animate-spin" />
        <p class="text-[var(--neu-text-muted)]">Loading profile...</p>
      </div>
    </div>

    <template v-else>
      <!-- Success/Error Messages -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="saveSuccess" class="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-sm text-green-700 dark:text-green-300">Profile saved successfully.</p>
          </div>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="saveError" class="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-red-700 dark:text-red-300">{{ saveError }}</p>
          </div>
        </div>
      </Transition>

      <!-- Single Card with Tabs -->
      <NeuCard padding="lg">
        <NeuTabs v-model="activeTab" :tabs="tabs">
          <!-- Personal Tab -->
          <template #personal>
            <!-- Profile Photo Section -->
            <div class="mb-8 pb-6 border-b border-[var(--neu-shadow-dark)]/10">
              <h3 class="text-sm font-medium text-[var(--neu-text)] mb-4">Profile Photo</h3>
              <div class="flex items-center gap-6">
                <div class="relative">
                  <div class="neu-avatar-large w-24 h-24 rounded-full overflow-hidden flex items-center justify-center">
                    <img
                      v-if="form.avatarUrl"
                      :src="form.avatarUrl"
                      alt="Profile photo"
                      class="w-full h-full object-cover"
                    />
                    <span v-else class="text-2xl font-semibold text-[var(--neu-primary)]">
                      {{ userInitials }}
                    </span>
                  </div>
                  <div
                    v-if="isUploadingAvatar"
                    class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <input
                    ref="avatarInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleAvatarChange"
                  />
                  <NeuButton
                    variant="default"
                    size="sm"
                    :disabled="isUploadingAvatar"
                    @click="triggerAvatarUpload"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Photo
                  </NeuButton>
                  <NeuButton
                    v-if="form.avatarUrl"
                    variant="ghost"
                    size="sm"
                    @click="removeAvatar"
                  >
                    Remove
                  </NeuButton>
                  <p class="text-xs text-[var(--neu-text-muted)] mt-1">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            <!-- Personal Information Fields -->
            <div class="space-y-4">
              <h3 class="text-sm font-medium text-[var(--neu-text)]">Personal Information</h3>
              <div class="grid gap-4 sm:grid-cols-2">
                <NeuInput
                  v-model="form.firstName"
                  label="First Name *"
                  placeholder="John"
                />
                <NeuInput
                  v-model="form.lastName"
                  label="Last Name *"
                  placeholder="Smith"
                />
                <NeuInput
                  v-model="form.preferredName"
                  label="Preferred Name"
                  placeholder="What should we call you?"
                />
                <NeuInput
                  v-model="form.maidenName"
                  label="Maiden Name"
                  placeholder="If applicable"
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
                <NeuInput
                  v-model="form.phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="(555) 123-4567"
                />
                <NeuInput
                  v-model="form.dateOfBirth"
                  type="date"
                  label="Date of Birth"
                />
                <NeuSelect
                  v-model="form.gender"
                  label="Gender"
                  :options="genderOptions"
                  placeholder="Select..."
                />
                <NeuSelect
                  v-model="form.nationality"
                  label="Nationality"
                  :options="nationalitiesList"
                  placeholder="Select nationality..."
                  searchable
                />
              </div>
            </div>

            <!-- Save Button -->
            <div class="mt-6 pt-4 border-t border-[var(--neu-shadow-dark)]/10 flex items-center justify-end gap-3">
              <NeuButton
                variant="primary"
                :loading="isSaving"
                :disabled="isSaving"
                @click="saveProfile"
              >
                Save Changes
              </NeuButton>
            </div>
          </template>

          <!-- Address Tab -->
          <template #address>
            <p class="text-sm text-[var(--neu-text-muted)] mb-6">
              Your personal home address.
            </p>

            <div class="space-y-4">
              <NeuSelect
                v-model="form.addressCountry"
                label="Country *"
                :options="countries"
                placeholder="Select country"
                searchable
              />

              <div class="grid gap-4 sm:grid-cols-2">
                <NeuSelect
                  v-model="form.addressState"
                  label="State / Province *"
                  :options="addressStates"
                  :disabled="!form.addressCountry"
                  placeholder="Select state"
                  searchable
                />
                <NeuSelect
                  v-model="form.addressCity"
                  label="City"
                  :options="addressCities"
                  :disabled="!form.addressState"
                  placeholder="Select city"
                  searchable
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <NeuInput
                  v-model="form.addressLine1"
                  label="Street Address *"
                  placeholder="123 Main Street"
                />
                <NeuInput
                  v-model="form.addressPostalCode"
                  label="ZIP / Postal Code *"
                  placeholder="12345"
                />
              </div>

              <NeuInput
                v-model="form.addressLine2"
                label="Apt, Suite, Unit"
                placeholder="Apt 4B"
              />
            </div>

            <!-- Save Button -->
            <div class="mt-6 pt-4 border-t border-[var(--neu-shadow-dark)]/10 flex items-center justify-end gap-3">
              <NeuButton
                variant="primary"
                :loading="isSaving"
                :disabled="isSaving"
                @click="saveProfile"
              >
                Save Changes
              </NeuButton>
            </div>
          </template>

          <!-- Emergency Contact Tab -->
          <template #emergency>
            <!-- Info Banner -->
            <div class="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 mb-6">
              <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-blue-700 dark:text-blue-300">
                This information is kept confidential and only used in case of emergency.
              </p>
            </div>

            <div class="space-y-4">
              <NeuInput
                v-model="form.emergencyContactName"
                label="Contact Name *"
                placeholder="Jane Smith"
              />

              <NeuSelect
                v-model="form.emergencyContactRelationship"
                label="Relationship *"
                :options="relationshipOptions"
                placeholder="Select relationship..."
              />

              <div class="grid gap-4 sm:grid-cols-2">
                <NeuInput
                  v-model="form.emergencyContactPhone"
                  type="tel"
                  label="Phone Number *"
                  placeholder="(555) 123-4567"
                />
                <NeuInput
                  v-model="form.emergencyContactEmail"
                  type="email"
                  label="Email (Optional)"
                  placeholder="jane@email.com"
                />
              </div>

              <NeuInput
                v-model="form.emergencyContactAddress"
                label="Address (Optional)"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <!-- Save Button -->
            <div class="mt-6 pt-4 border-t border-[var(--neu-shadow-dark)]/10 flex items-center justify-end gap-3">
              <NeuButton
                variant="primary"
                :loading="isSaving"
                :disabled="isSaving"
                @click="saveProfile"
              >
                Save Changes
              </NeuButton>
            </div>
          </template>

          <!-- Company Tab -->
          <template #company>
            <div class="flex items-center justify-between mb-6">
              <p class="text-sm text-[var(--neu-text-muted)]">
                This information is managed by your administrator.
              </p>
              <NeuBadge variant="secondary" size="sm">Read-only</NeuBadge>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <NeuInput
                :model-value="companyInfo.email || 'Not set'"
                label="Work Email"
                readonly
              />
              <NeuInput
                :model-value="companyInfo.title || 'Not set'"
                label="Job Title"
                readonly
              />
              <NeuInput
                :model-value="companyInfo.department || 'Not assigned'"
                label="Department"
                readonly
              />
              <NeuInput
                :model-value="companyInfo.division || 'Not assigned'"
                label="Division"
                readonly
              />
              <NeuInput
                :model-value="companyInfo.location || 'Not assigned'"
                label="Location"
                readonly
              />
              <NeuInput
                :model-value="companyInfo.employeeId || 'Not set'"
                label="Employee ID"
                readonly
              />
              <NeuInput
                :model-value="companyInfo.employmentType || 'Not set'"
                label="Employment Type"
                readonly
              />
              <div>
                <label class="block text-sm font-medium mb-2 text-[var(--neu-text)]">
                  Work Phone
                </label>
                <div class="flex gap-2">
                  <div class="flex-1">
                    <NeuInput
                      :model-value="companyInfo.phone || 'Not set'"
                      readonly
                    />
                  </div>
                  <div v-if="companyInfo.phoneExt" class="w-20">
                    <NeuInput
                      :model-value="companyInfo.phoneExt"
                      placeholder="Ext"
                      readonly
                    />
                  </div>
                </div>
              </div>
              <NeuInput
                :model-value="formattedStartDate || 'Not set'"
                label="Start Date"
                readonly
              />
              <NeuInput
                :model-value="formattedHireDate || 'Not set'"
                label="Hire Date"
                readonly
              />
            </div>
          </template>

          <!-- Account Tab -->
          <template #account>
            <p class="text-sm text-[var(--neu-text-muted)] mb-6">
              Your account credentials and security settings.
            </p>

            <div class="max-w-md space-y-4">
              <NeuInput
                :model-value="authUser?.email || 'Unknown'"
                label="Sign-in Email"
                readonly
              />
              <p class="text-xs text-[var(--neu-text-muted)]">
                Contact your administrator to change your sign-in email.
              </p>

              <div class="pt-4 border-t border-[var(--neu-shadow-dark)]/10">
                <h3 class="text-sm font-medium text-[var(--neu-text)] mb-3">Password</h3>
                <NeuButton variant="default" size="sm" disabled>
                  Change Password
                </NeuButton>
                <p class="text-xs text-[var(--neu-text-muted)] mt-2">
                  Password change functionality coming soon.
                </p>
              </div>
            </div>
          </template>
        </NeuTabs>
      </NeuCard>
    </template>
  </div>
</template>

<style scoped>
.neu-avatar-large {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}
</style>
