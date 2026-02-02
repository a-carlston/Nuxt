import { Country, State, City } from 'country-state-city'
import { ref, computed, watch } from 'vue'

export function useLocation() {
  const selectedCountry = ref<string | null>(null)
  const selectedState = ref<string | null>(null)
  const selectedCity = ref<string | null>(null)

  // Get all countries
  const countries = computed(() => {
    return Country.getAllCountries().map((c) => ({
      label: c.name,
      value: c.isoCode,
      phonecode: c.phonecode,
      flag: c.flag
    }))
  })

  // Get states based on selected country
  const states = computed(() => {
    if (!selectedCountry.value) return []
    return State.getStatesOfCountry(selectedCountry.value).map((s) => ({
      label: s.name,
      value: s.isoCode
    }))
  })

  // Get cities based on selected country and state
  const cities = computed(() => {
    if (!selectedCountry.value || !selectedState.value) return []
    return City.getCitiesOfState(selectedCountry.value, selectedState.value).map((c) => ({
      label: c.name,
      value: c.name
    }))
  })

  // Get timezone based on country
  const timezones = computed(() => {
    if (!selectedCountry.value) return []
    const country = Country.getCountryByCode(selectedCountry.value)
    if (!country || !country.timezones) return []
    return country.timezones.map((tz) => ({
      label: `(GMT${tz.gmtOffsetName}) ${tz.zoneName}`,
      value: tz.zoneName
    }))
  })

  // Reset dependent fields when parent changes
  watch(selectedCountry, () => {
    selectedState.value = null
    selectedCity.value = null
  })

  watch(selectedState, () => {
    selectedCity.value = null
  })

  // Get country details
  function getCountryByCode(code: string) {
    return Country.getCountryByCode(code)
  }

  // Get state details
  function getStateByCode(countryCode: string, stateCode: string) {
    return State.getStateByCodeAndCountry(stateCode, countryCode)
  }

  return {
    selectedCountry,
    selectedState,
    selectedCity,
    countries,
    states,
    cities,
    timezones,
    getCountryByCode,
    getStateByCode
  }
}
