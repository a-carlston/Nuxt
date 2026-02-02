import { ref, computed, watch } from 'vue'
import { Country, State, City } from 'country-state-city'

// Form state
const currentStep = ref(1)
const totalSteps = 4

// Step 1: Account
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)

// Step 1: Personal Info
const firstName = ref('')
const preferredName = ref('')
const lastName = ref('')
const maidenName = ref('')
const phone = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)

// Step 1: Personal Address
const personalCountry = ref<string | null>('US')
const personalState = ref<string | null>(null)
const personalCity = ref<string | null>(null)
const personalAddress = ref('')
const personalAddress2 = ref('')
const personalZip = ref('')

// Step 2: Company Info
const companyName = ref('')
const companyTagline = ref('')
const companySlug = ref('')
const slugStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const industry = ref<string | null>(null)
const companySize = ref<string | null>(null)
const website = ref('')
const taxId = ref('')
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const useCustomHeader = ref(false)
const headerImageFile = ref<File | null>(null)
const headerImagePreview = ref<string | null>(null)

// Step 2: Company Address
const companyCountry = ref<string | null>('US')
const companyState = ref<string | null>(null)
const companyCity = ref<string | null>(null)
const companyAddress = ref('')
const companyAddress2 = ref('')
const companyZip = ref('')

// Step 3: Plan Selection
const selectedPlan = ref<string>('professional')
const billingCycle = ref<'monthly' | 'annual'>('annual')
const selectedCompliance = ref<string[]>([])
const estimatedEmployees = ref<string>('26-50')

// Step 6: Billing
const sameAsCompany = ref(true)
const billingCountry = ref<string | null>(null)
const billingState = ref<string | null>(null)
const billingCity = ref<string | null>(null)
const billingAddress = ref('')
const billingAddress2 = ref('')
const billingZip = ref('')
const cardName = ref('')
const cardNumber = ref('')
const cardExpiry = ref('')
const cardCvc = ref('')
const cardSignature = ref('')

export function useRegistration() {
  // Countries with flags
  const countries = computed(() => {
    return Country.getAllCountries().map((c) => ({
      label: `${c.flag} ${c.name}`,
      value: c.isoCode
    }))
  })

  // Personal location dropdowns
  const personalStates = computed(() => {
    if (!personalCountry.value) return []
    return State.getStatesOfCountry(personalCountry.value).map((s) => ({
      label: s.name,
      value: s.isoCode
    }))
  })

  const personalCities = computed(() => {
    if (!personalCountry.value || !personalState.value) return []
    return City.getCitiesOfState(personalCountry.value, personalState.value).map((c) => ({
      label: c.name,
      value: c.name
    }))
  })

  // Get country phone code
  const personalPhoneCode = computed(() => {
    if (!personalCountry.value) return ''
    const country = Country.getCountryByCode(personalCountry.value)
    return country?.phonecode ? `+${country.phonecode}` : ''
  })

  // Company location dropdowns
  const companyStates = computed(() => {
    if (!companyCountry.value) return []
    return State.getStatesOfCountry(companyCountry.value).map((s) => ({
      label: s.name,
      value: s.isoCode
    }))
  })

  const companyCities = computed(() => {
    if (!companyCountry.value || !companyState.value) return []
    return City.getCitiesOfState(companyCountry.value, companyState.value).map((c) => ({
      label: c.name,
      value: c.name
    }))
  })

  // Billing location dropdowns
  const billingStates = computed(() => {
    if (!billingCountry.value) return []
    return State.getStatesOfCountry(billingCountry.value).map((s) => ({
      label: s.name,
      value: s.isoCode
    }))
  })

  const billingCities = computed(() => {
    if (!billingCountry.value || !billingState.value) return []
    return City.getCitiesOfState(billingCountry.value, billingState.value).map((c) => ({
      label: c.name,
      value: c.name
    }))
  })

  // Reset dependent fields
  watch(personalCountry, () => {
    personalState.value = null
    personalCity.value = null
  })
  watch(personalState, () => {
    personalCity.value = null
  })
  watch(companyCountry, () => {
    companyState.value = null
    companyCity.value = null
  })
  watch(companyState, () => {
    companyCity.value = null
  })
  watch(billingCountry, () => {
    billingState.value = null
    billingCity.value = null
  })
  watch(billingState, () => {
    billingCity.value = null
  })

  // Copy company address to billing
  watch(sameAsCompany, (val) => {
    if (val) {
      billingCountry.value = companyCountry.value
      billingState.value = companyState.value
      billingCity.value = companyCity.value
      billingAddress.value = companyAddress.value
      billingAddress2.value = companyAddress2.value
      billingZip.value = companyZip.value
    }
  })

  // Avatar/Logo handlers
  function handleAvatarUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files[0]) {
      avatarFile.value = input.files[0]
      avatarPreview.value = URL.createObjectURL(input.files[0])
    }
  }

  function handleLogoUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files[0]) {
      logoFile.value = input.files[0]
      logoPreview.value = URL.createObjectURL(input.files[0])
    }
  }

  function removeAvatar() {
    avatarFile.value = null
    avatarPreview.value = null
  }

  function removeLogo() {
    logoFile.value = null
    logoPreview.value = null
  }

  function handleHeaderImageUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files[0]) {
      headerImageFile.value = input.files[0]
      headerImagePreview.value = URL.createObjectURL(input.files[0])
    }
  }

  function removeHeaderImage() {
    headerImageFile.value = null
    headerImagePreview.value = null
  }

  // Slug generation
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30)
  }

  let slugCheckTimeout: ReturnType<typeof setTimeout> | null = null

  watch(companyName, (newName) => {
    // Always update slug based on company name
    companySlug.value = generateSlug(newName)
  })

  watch(companySlug, (newSlug) => {
    if (slugCheckTimeout) clearTimeout(slugCheckTimeout)
    if (!newSlug || newSlug.length < 3) {
      slugStatus.value = 'idle'
      return
    }
    slugStatus.value = 'checking'
    slugCheckTimeout = setTimeout(() => {
      const taken = ['acme', 'demo', 'test', 'admin', 'shiftflow']
      slugStatus.value = taken.includes(newSlug.toLowerCase()) ? 'taken' : 'available'
    }, 500)
  })

  // Card formatting
  function formatCardNumber(e: Event) {
    const input = e.target as HTMLInputElement
    let value = input.value.replace(/\D/g, '')
    value = value.substring(0, 16)
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ')
    cardNumber.value = value
  }

  function formatExpiry(e: Event) {
    const input = e.target as HTMLInputElement
    let value = input.value.replace(/\D/g, '')
    value = value.substring(0, 4)
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2)
    }
    cardExpiry.value = value
  }

  function formatCvc(e: Event) {
    const input = e.target as HTMLInputElement
    cardCvc.value = input.value.replace(/\D/g, '').substring(0, 4)
  }

  // Card type detection
  const cardType = computed(() => {
    const num = cardNumber.value.replace(/\s/g, '')
    if (num.startsWith('4')) return 'visa'
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'mastercard'
    if (/^3[47]/.test(num)) return 'amex'
    if (/^6(?:011|5)/.test(num)) return 'discover'
    return 'unknown'
  })

  // Pricing
  const basePrices = {
    starter: { monthly: 4, annual: 3 },
    professional: { monthly: 8, annual: 6 },
    enterprise: { monthly: 15, annual: 12 }
  }

  const compliancePricing = {
    hipaa: { monthly: 4, annual: 3 },
    gdpr: { monthly: 3, annual: 2 },
    soc2: { monthly: 3, annual: 2 }
  }

  const employeeEstimates: Record<string, number> = {
    '1-10': 5,
    '11-25': 18,
    '26-50': 38,
    '51-100': 75,
    '101-250': 175,
    '251-500': 375,
    '500+': 500
  }

  const currentPrice = computed(() => {
    const base = basePrices[selectedPlan.value as keyof typeof basePrices][billingCycle.value]
    const compliance = selectedCompliance.value.reduce((sum, id) => {
      const pricing = compliancePricing[id as keyof typeof compliancePricing]
      return sum + (pricing ? pricing[billingCycle.value] : 0)
    }, 0)
    return base + compliance
  })

  const estimatedMonthly = computed(() => {
    const employees = employeeEstimates[estimatedEmployees.value] || 50
    return currentPrice.value * employees
  })

  const annualSavings = computed(() => {
    if (billingCycle.value !== 'annual') return 0
    const monthlyPrice = basePrices[selectedPlan.value as keyof typeof basePrices].monthly
    const annualPrice = basePrices[selectedPlan.value as keyof typeof basePrices].annual
    const employees = employeeEstimates[estimatedEmployees.value] || 50
    return (monthlyPrice - annualPrice) * employees * 12
  })

  const trialEndDate = computed(() => {
    const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = computed(() => emailRegex.test(email.value))

  // Password requirements validation
  const passwordChecks = computed(() => ({
    minLength: password.value.length >= 8,
    hasUppercase: /[A-Z]/.test(password.value),
    hasLowercase: /[a-z]/.test(password.value),
    hasNumber: /[0-9]/.test(password.value),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password.value)
  }))

  const isPasswordValid = computed(() => {
    const checks = passwordChecks.value
    return checks.minLength && checks.hasUppercase && checks.hasLowercase && checks.hasNumber
  })

  const doPasswordsMatch = computed(() => {
    return confirmPassword.value !== '' && confirmPassword.value === password.value
  })

  // Validation
  // Step 1: Account + Personal Info (combined)
  const step1Valid = computed(() => {
    return firstName.value.trim() &&
           lastName.value.trim() &&
           isEmailValid.value &&
           phone.value.trim() &&
           personalCountry.value &&
           personalAddress.value.trim() &&
           personalZip.value.trim() &&
           isPasswordValid.value &&
           doPasswordsMatch.value
  })

  // Step 2: Company Info + Address
  const step2Valid = computed(() => {
    return companyName.value.trim() &&
           companySlug.value.length >= 3 &&
           slugStatus.value !== 'taken' &&
           industry.value &&
           companyCountry.value &&
           companyAddress.value.trim() &&
           companyZip.value.trim()
  })

  // Step 3: Plan
  const step3Valid = computed(() => {
    return selectedPlan.value && estimatedEmployees.value
  })

  // Step 4: Billing
  const step4Valid = computed(() => {
    const addressValid = sameAsCompany.value || (billingCountry.value && billingAddress.value.trim() && billingZip.value.trim())
    const cardValid = cardName.value.trim() && cardNumber.value.replace(/\s/g, '').length >= 15 && cardExpiry.value.length === 5 && cardCvc.value.length >= 3
    const signatureValid = cardSignature.value.trim().length >= 2
    return addressValid && cardValid && signatureValid && agreeTerms.value
  })

  const canProceed = computed(() => {
    // Allow skipping validation in dev mode
    if (import.meta.dev) return true

    switch (currentStep.value) {
      case 1: return step1Valid.value
      case 2: return step2Valid.value
      case 3: return step3Valid.value
      case 4: return step4Valid.value
      default: return false
    }
  })

  // Navigation
  function nextStep() {
    if (canProceed.value && currentStep.value < totalSteps) {
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

  function submitRegistration() {
    console.log('Registration submitted')
    currentStep.value = 5
  }

  return {
    // State
    currentStep,
    totalSteps,
    // Step 1: Account
    email,
    password,
    confirmPassword,
    agreeTerms,
    // Step 1: Personal Info
    firstName,
    preferredName,
    lastName,
    maidenName,
    phone,
    avatarPreview,
    // Step 1: Personal Address
    personalCountry,
    personalState,
    personalCity,
    personalAddress,
    personalAddress2,
    personalZip,
    personalStates,
    personalCities,
    personalPhoneCode,
    // Validation
    isEmailValid,
    passwordChecks,
    isPasswordValid,
    doPasswordsMatch,
    // Step 2: Company
    companyName,
    companyTagline,
    companySlug,
    slugStatus,
    industry,
    companySize,
    website,
    taxId,
    logoPreview,
    useCustomHeader,
    headerImagePreview,
    // Step 4
    companyCountry,
    companyState,
    companyCity,
    companyAddress,
    companyAddress2,
    companyZip,
    // Step 3: Plan
    selectedPlan,
    billingCycle,
    selectedCompliance,
    estimatedEmployees,
    // Step 6
    sameAsCompany,
    billingCountry,
    billingState,
    billingCity,
    billingAddress,
    billingAddress2,
    billingZip,
    cardName,
    cardNumber,
    cardExpiry,
    cardCvc,
    cardSignature,
    // Computed
    countries,
    companyStates,
    companyCities,
    billingStates,
    billingCities,
    cardType,
    basePrices,
    compliancePricing,
    currentPrice,
    estimatedMonthly,
    annualSavings,
    trialEndDate,
    canProceed,
    // Methods
    handleAvatarUpload,
    handleLogoUpload,
    handleHeaderImageUpload,
    removeAvatar,
    removeLogo,
    removeHeaderImage,
    generateSlug,
    formatCardNumber,
    formatExpiry,
    formatCvc,
    nextStep,
    prevStep,
    submitRegistration
  }
}
