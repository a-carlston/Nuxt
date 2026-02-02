export default defineNuxtPlugin(() => {
  const themeCookie = useCookie<string>('neu-theme')
  const paletteCookie = useCookie<string>('neu-palette')

  const theme = themeCookie.value || 'light' // Default to light for SSR (system preference unknown)
  const palette = paletteCookie.value || 'corporate'

  // Set html attributes during SSR so CSS variables apply immediately
  useHead({
    htmlAttrs: {
      'data-theme': theme === 'system' ? 'light' : theme, // Can't detect system pref on server
      'data-palette': palette,
      class: theme === 'dark' ? 'dark' : ''
    }
  })
})
