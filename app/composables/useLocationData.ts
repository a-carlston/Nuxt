import { computed, watch, ref } from 'vue'
import { Country, State, City } from 'country-state-city'
import nationalities from 'i18n-nationality'
import enLocale from 'i18n-nationality/langs/en.json'

// Register English locale for nationalities
nationalities.registerLocale(enLocale)

/**
 * Composable for location data (countries, states, cities, nationalities)
 * Used by onboarding, profile, and other forms that need location selection
 */
export function useLocationData(options?: {
  countryRef?: Ref<string>
  stateRef?: Ref<string>
  cityRef?: Ref<string>
  skipWatchers?: boolean
}) {
  // Track if we're in initial load to prevent watchers from clearing data
  const isInitialLoad = ref(true)

  // Countries list with flags
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

  // States based on selected country
  const getStatesForCountry = (countryCode: string) => {
    if (!countryCode) return []
    return State.getStatesOfCountry(countryCode).map((s) => ({
      label: s.name,
      value: s.isoCode
    }))
  }

  // Cities based on selected country and state
  const getCitiesForState = (countryCode: string, stateCode: string) => {
    if (!countryCode || !stateCode) return []
    return City.getCitiesOfState(countryCode, stateCode).map((c) => ({
      label: c.name,
      value: c.name
    }))
  }

  // If refs are provided, create reactive states/cities and set up watchers
  const states = computed(() => {
    if (!options?.countryRef) return []
    return getStatesForCountry(options.countryRef.value)
  })

  const cities = computed(() => {
    if (!options?.countryRef || !options?.stateRef) return []
    return getCitiesForState(options.countryRef.value, options.stateRef.value)
  })

  // Set up watchers to reset dependent fields when parent changes
  if (options?.countryRef && options?.stateRef && !options?.skipWatchers) {
    watch(() => options.countryRef!.value, () => {
      if (!isInitialLoad.value) {
        options.stateRef!.value = ''
        if (options.cityRef) {
          options.cityRef.value = ''
        }
      }
    })

    if (options.cityRef) {
      watch(() => options.stateRef!.value, () => {
        if (!isInitialLoad.value) {
          options.cityRef!.value = ''
        }
      })
    }
  }

  // Call this after initial data load to enable watchers
  function enableWatchers() {
    isInitialLoad.value = false
  }

  // Gender options
  const genderOptions = [
    { label: 'Select...', value: '' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non-binary' },
    { label: 'Prefer not to say', value: 'prefer-not-to-say' }
  ]

  // Relationship options for emergency contact
  const relationshipOptions = [
    { label: 'Select...', value: '' },
    { label: 'Spouse', value: 'spouse' },
    { label: 'Partner', value: 'partner' },
    { label: 'Parent', value: 'parent' },
    { label: 'Sibling', value: 'sibling' },
    { label: 'Child', value: 'child' },
    { label: 'Friend', value: 'friend' },
    { label: 'Other', value: 'other' }
  ]

  // Marital status options
  const maritalStatusOptions = [
    { label: 'Select...', value: '' },
    { label: 'Single', value: 'single' },
    { label: 'Married', value: 'married' },
    { label: 'Domestic Partnership', value: 'domestic-partnership' },
    { label: 'Divorced', value: 'divorced' },
    { label: 'Widowed', value: 'widowed' },
    { label: 'Prefer not to say', value: 'prefer-not-to-say' }
  ]

  // Pronoun options
  const pronounOptions = [
    { label: 'Select...', value: '' },
    { label: 'He/Him', value: 'he/him' },
    { label: 'She/Her', value: 'she/her' },
    { label: 'They/Them', value: 'they/them' },
    { label: 'Other', value: 'other' }
  ]

  return {
    // Location data
    countries,
    nationalitiesList,
    states,
    cities,
    getStatesForCountry,
    getCitiesForState,
    enableWatchers,
    isInitialLoad,

    // Common form options
    genderOptions,
    relationshipOptions,
    maritalStatusOptions,
    pronounOptions
  }
}
