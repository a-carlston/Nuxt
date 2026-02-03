import { ref, computed, watch, nextTick } from 'vue'
import { Country, State, City } from 'country-state-city'
import nationalities from 'i18n-nationality'
import enLocale from 'i18n-nationality/langs/en.json'

// Register English locale for nationalities
nationalities.registerLocale(enLocale)

// Onboarding state
const currentStep = ref(1)
const isOwner = ref(true) // Will be set based on user role
const isLoading = ref(false)
const error = ref<string | null>(null)

// User data (prefilled from registration or fetched)
const userData = ref({
  id: '',
  // Personal Info (from registration)
  firstName: '',
  preferredName: '',
  lastName: '',
  maidenName: '',
  email: '',
  phone: '',
  phoneCountryCode: '',
  avatarUrl: null as string | null,
  // Personal Address (from registration)
  personalCountry: 'US',
  personalState: '',
  personalCity: '',
  personalAddress: '',
  personalAddress2: '',
  personalZip: '',
  // Additional personal info (new in onboarding)
  dateOfBirth: '',
  gender: null as string | null,
  pronouns: null as string | null,
  maritalStatus: null as string | null,
  nationality: null as string | null,
  ssn: '',
  // Emergency Contact
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  emergencyContactEmail: '',
  emergencyContactAddress: '',
  // Employment (owner sets their own)
  employeeId: '',
  title: '',
  department: '',
  division: '',
  location: '',
  startDate: '',
  employmentType: 'full-time',
  workEmail: '',
  workPhone: '',
  workPhoneExt: '',
  reportsTo: null as string | null,
  // Banking (optional)
  bankName: '',
  bankAccountType: 'checking',
  bankRoutingNumber: '',
  bankAccountNumber: '',
  bankAccountNumberConfirm: '',
  // Tax (optional)
  federalFilingStatus: '',
  federalAllowances: 0,
  additionalWithholding: 0,
  stateFilingStatus: '',
  stateAllowances: 0,
  isExempt: false
})

// Total steps depends on user type (owner skips employment)
// Owner flow: Welcome -> Personal -> Emergency -> Banking -> Complete (5 steps)
// Employee flow: Welcome -> Personal -> Emergency -> Employment -> Banking -> Complete (6 steps)
const totalSteps = computed(() => isOwner.value ? 5 : 6)

// Track which sections are complete
const sectionStatus = computed(() => ({
  welcome: currentStep.value > 1,
  personalInfo: !!(
    userData.value.firstName &&
    userData.value.lastName &&
    userData.value.email &&
    userData.value.phone &&
    userData.value.personalAddress &&
    userData.value.personalZip
  ),
  emergencyContact: !!(
    userData.value.emergencyContactName &&
    userData.value.emergencyContactPhone &&
    userData.value.emergencyContactRelationship
  ),
  employment: !!(
    userData.value.title &&
    userData.value.startDate
  ),
  banking: !!(
    userData.value.bankName &&
    userData.value.bankRoutingNumber &&
    userData.value.bankAccountNumber
  ),
  complete: currentStep.value === totalSteps.value
}))

export function useOnboarding() {
  // Countries list
  const countries = computed(() => {
    return Country.getAllCountries().map((c) => ({
      label: `${c.flag} ${c.name}`,
      value: c.isoCode
    }))
  })

  // Nationalities list with flags
  const nationalitiesList = computed(() => {
    const allNationalities = nationalities.getNames('en')
    // Map alpha-2 codes to flag emojis
    const codeToFlag = (code: string) => {
      // Convert country code to flag emoji (alpha-2 to regional indicator symbols)
      const alpha2 = nationalities.getAlpha2Code(allNationalities[code], 'en') || code
      if (alpha2 && alpha2.length === 2) {
        return String.fromCodePoint(...[...alpha2.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
      }
      return '🏳️'
    }

    const list = Object.entries(allNationalities)
      .map(([code, name]) => ({
        label: `${codeToFlag(code)} ${name}`,
        value: code
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    // Add "Prefer not to say" at the beginning
    list.unshift({ label: '🚫 Prefer not to say', value: 'prefer-not-to-say' })

    return list
  })

  // Tax ID format based on country
  const taxIdConfig = computed(() => {
    const country = userData.value.personalCountry
    switch (country) {
      case 'US':
        return { label: 'Social Security Number (SSN)', placeholder: '000-00-0000', mask: '###-##-####', maxLength: 11 }
      case 'CA':
        return { label: 'Social Insurance Number (SIN)', placeholder: '000-000-000', mask: '###-###-###', maxLength: 11 }
      case 'GB':
        return { label: 'National Insurance Number', placeholder: 'QQ 12 34 56 A', mask: 'AA ## ## ## A', maxLength: 13 }
      case 'AU':
        return { label: 'Tax File Number (TFN)', placeholder: '000 000 000', mask: '### ### ###', maxLength: 11 }
      case 'DE':
        return { label: 'Steuer-ID', placeholder: '00 000 000 000', mask: '## ### ### ###', maxLength: 14 }
      case 'FR':
        return { label: 'Numéro de Sécurité Sociale', placeholder: '0 00 00 00 000 000 00', mask: '# ## ## ## ### ### ##', maxLength: 21 }
      case 'IN':
        return { label: 'PAN Card Number', placeholder: 'AAAAA0000A', mask: 'AAAAA####A', maxLength: 10 }
      default:
        return { label: 'Tax ID / National ID', placeholder: 'Enter your ID number', mask: null, maxLength: 30 }
    }
  })

  // Auto-format tax ID based on country
  function formatTaxId(value: string): string {
    const country = userData.value.personalCountry
    const digits = value.replace(/\D/g, '')

    switch (country) {
      case 'US': // SSN: 000-00-0000
        if (digits.length <= 3) return digits
        if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
        return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
      case 'CA': // SIN: 000-000-000
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`
      case 'AU': // TFN: 000 000 000
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
      case 'DE': // Steuer-ID: 00 000 000 000
        if (digits.length <= 2) return digits
        if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
        if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
      default:
        return value
    }
  }

  const personalStates = computed(() => {
    if (!userData.value.personalCountry) return []
    return State.getStatesOfCountry(userData.value.personalCountry).map((s) => ({
      label: s.name,
      value: s.isoCode
    }))
  })

  const personalCities = computed(() => {
    if (!userData.value.personalCountry || !userData.value.personalState) return []
    return City.getCitiesOfState(userData.value.personalCountry, userData.value.personalState).map((c) => ({
      label: c.name,
      value: c.name
    }))
  })

  // Watch for country/state changes to reset dependent fields
  // Track if we're in initial load to prevent watchers from clearing data
  const isInitialLoad = ref(true)

  watch(() => userData.value.personalCountry, () => {
    if (!isInitialLoad.value) {
      userData.value.personalState = ''
      userData.value.personalCity = ''
    }
  })

  watch(() => userData.value.personalState, () => {
    if (!isInitialLoad.value) {
      userData.value.personalCity = ''
    }
  })

  // Load user data from API
  async function loadUserData(tenantSlug: string, userId: string) {
    isLoading.value = true
    isInitialLoad.value = true
    error.value = null

    try {
      const response = await $fetch<{ user: typeof userData.value }>(`/api/onboarding/user`, {
        method: 'GET',
        params: { slug: tenantSlug, userId }
      })

      if (response.user) {
        // Merge prefilled data
        Object.assign(userData.value, response.user)
      }
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to load user data'
    } finally {
      isLoading.value = false
      // Allow watchers to work after initial load completes
      nextTick(() => {
        isInitialLoad.value = false
      })
    }
  }

  // Save current step data
  async function saveStepData(tenantSlug: string) {
    isLoading.value = true
    error.value = null

    try {
      await $fetch(`/api/onboarding/save`, {
        method: 'POST',
        body: {
          slug: tenantSlug,
          userId: userData.value.id,
          step: currentStep.value,
          data: userData.value
        }
      })
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to save data'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  // Navigation
  function nextStep() {
    if (currentStep.value < totalSteps.value) {
      currentStep.value++
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goToStep(step: number) {
    if (step >= 1 && step <= totalSteps.value) {
      currentStep.value = step
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Complete onboarding
  async function completeOnboarding(tenantSlug: string) {
    isLoading.value = true
    error.value = null

    try {
      await $fetch(`/api/onboarding/complete`, {
        method: 'POST',
        body: {
          slug: tenantSlug,
          userId: userData.value.id
        }
      })

      // Redirect to app
      await navigateTo('/dashboard')
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to complete onboarding'
    } finally {
      isLoading.value = false
    }
  }

  // Validation helpers
  const isStep2Valid = computed(() => {
    return !!(
      userData.value.firstName &&
      userData.value.lastName &&
      userData.value.email &&
      userData.value.phone &&
      userData.value.personalCountry &&
      userData.value.personalAddress &&
      userData.value.personalZip
    )
  })

  const isStep3Valid = computed(() => {
    return !!(
      userData.value.emergencyContactName &&
      userData.value.emergencyContactPhone &&
      userData.value.emergencyContactRelationship
    )
  })

  const isStep4Valid = computed(() => {
    return !!(
      userData.value.title &&
      userData.value.startDate
    )
  })

  // Banking is optional
  const isStep5Valid = computed(() => {
    // If they started filling it, they must complete it
    if (userData.value.bankName || userData.value.bankRoutingNumber || userData.value.bankAccountNumber) {
      return !!(
        userData.value.bankName &&
        userData.value.bankRoutingNumber &&
        userData.value.bankAccountNumber &&
        userData.value.bankAccountNumber === userData.value.bankAccountNumberConfirm
      )
    }
    return true // Can skip
  })

  return {
    // State
    currentStep,
    totalSteps,
    isOwner,
    isLoading,
    error,
    userData,
    sectionStatus,
    // Location data
    countries,
    nationalitiesList,
    personalStates,
    personalCities,
    // Tax ID
    taxIdConfig,
    formatTaxId,
    // Methods
    loadUserData,
    saveStepData,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    // Validation
    isStep2Valid,
    isStep3Valid,
    isStep4Valid,
    isStep5Valid
  }
}
