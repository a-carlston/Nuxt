<script setup lang="ts">
import { ref } from 'vue'
import { useTheme, type ThemeMode, type ColorPalette } from '~/composables/useTheme'

const {
  themeMode,
  colorPalette,
  effectiveTheme,
  setThemeMode,
  setPalette,
  palettes,
  themeModes
} = useTheme()

// Demo state
const inputValue = ref('')
const toggleValue = ref(false)
const checkboxValue = ref(false)
const radioValue = ref('option1')
const sliderValue = ref(50)
const selectValue = ref<string | null>(null)
const searchValue = ref<string | null>(null)
const multiSelectValue = ref<string[]>([])
const tabValue = ref('tab1')
const modalOpen = ref(false)
const buttonLoading = ref(false)

const radioOptions = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Option 3', value: 'option3' }
]

const selectOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian', value: 'durian' }
]

const searchOptions = [
  { label: 'New York', value: 'ny' },
  { label: 'Los Angeles', value: 'la' },
  { label: 'Chicago', value: 'chi' },
  { label: 'Houston', value: 'hou' },
  { label: 'Phoenix', value: 'phx' },
  { label: 'Philadelphia', value: 'phl' },
  { label: 'San Antonio', value: 'sa' },
  { label: 'San Diego', value: 'sd' }
]

const multiSelectOptions = [
  { label: 'JavaScript', value: 'js' },
  { label: 'TypeScript', value: 'ts' },
  { label: 'Python', value: 'py' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'Java', value: 'java' }
]

const tabItems = [
  { id: 'tab1', label: 'Overview' },
  { id: 'tab2', label: 'Features' },
  { id: 'tab3', label: 'Settings' }
]

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'reports', label: 'Reports', icon: '📈' }
]

const activeNavItem = ref('dashboard')
const activeNav = ref('buttons')

const navItems = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'feedback', label: 'Feedback' }
]

const avatarMenuItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
  { id: 'divider1', label: '', divider: true },
  { id: 'logout', label: 'Sign Out' }
]

function handleNavSelect(id: string) {
  activeNav.value = id
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

function handleAvatarMenu(id: string) {
  console.log('Menu item selected:', id)
}

function simulateLoading() {
  buttonLoading.value = true
  setTimeout(() => {
    buttonLoading.value = false
  }, 2000)
}

const paletteColors: Record<ColorPalette, string> = {
  corporate: '#4a90d9',
  lava: '#ff4d4d',
  dracula: '#bd93f9',
  ocean: '#00bcd4',
  forest: '#4caf50'
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Navbar -->
    <NeuNavbar
      :items="navItems"
      :active-item="activeNav"
      @select="handleNavSelect"
    >
      <template #logo>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-[var(--neu-primary)] flex items-center justify-center text-white font-bold">
            N
          </div>
          <span class="font-semibold text-[var(--neu-text)]">NeuUI</span>
        </div>
      </template>
      <template #actions>
        <NeuAvatar
          initials="JD"
          size="md"
          status="online"
          :menu-items="avatarMenuItems"
          @menu-select="handleAvatarMenu"
        />
      </template>
    </NeuNavbar>

    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Hero Section -->
      <section class="text-center mb-16">
        <h1 class="text-4xl md:text-5xl font-bold text-[var(--neu-text)] mb-4">
          Neumorphic Design System
        </h1>
        <p class="text-xl text-[var(--neu-text-muted)] max-w-2xl mx-auto">
          A modern, soft UI component library with dark/light themes and multiple color palettes.
        </p>
      </section>

      <!-- Theme Controls -->
      <section class="mb-16">
        <NeuCard padding="lg">
          <h2 class="text-xl font-semibold text-[var(--neu-text)] mb-6">
            Theme Controls
          </h2>
          <div class="grid md:grid-cols-2 gap-8">
            <!-- Theme Mode -->
            <div>
              <h3 class="text-sm font-medium text-[var(--neu-text-muted)] mb-3">
                Theme Mode
              </h3>
              <div class="flex gap-3">
                <NeuButton
                  v-for="mode in themeModes"
                  :key="mode"
                  :variant="themeMode === mode ? 'primary' : 'default'"
                  size="sm"
                  @click="setThemeMode(mode)"
                >
                  {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
                </NeuButton>
              </div>
              <p class="mt-2 text-sm text-[var(--neu-text-muted)]">
                Current: {{ effectiveTheme }}
              </p>
            </div>

            <!-- Color Palette -->
            <div>
              <h3 class="text-sm font-medium text-[var(--neu-text-muted)] mb-3">
                Color Palette
              </h3>
              <div class="flex gap-3 flex-wrap">
                <button
                  v-for="palette in palettes"
                  :key="palette"
                  :class="[
                    'w-10 h-10 rounded-full transition-all duration-200',
                    colorPalette === palette
                      ? 'ring-4 ring-[var(--neu-primary)] ring-offset-2 ring-offset-[var(--neu-bg)]'
                      : 'hover:scale-110'
                  ]"
                  :style="{ backgroundColor: paletteColors[palette] }"
                  :title="palette"
                  @click="setPalette(palette)"
                />
              </div>
              <p class="mt-2 text-sm text-[var(--neu-text-muted)]">
                Active: {{ colorPalette }}
              </p>
            </div>
          </div>
        </NeuCard>
      </section>

      <!-- Buttons Section -->
      <section
        id="buttons"
        class="mb-16"
      >
        <h2 class="text-2xl font-semibold text-[var(--neu-text)] mb-6">
          Buttons
        </h2>
        <NeuCard>
          <div class="space-y-8">
            <!-- Variants -->
            <div>
              <h3 class="text-sm font-medium text-[var(--neu-text-muted)] mb-4">
                Variants
              </h3>
              <div class="flex flex-wrap gap-4">
                <NeuButton>Default</NeuButton>
                <NeuButton variant="primary">Primary</NeuButton>
                <NeuButton variant="success">Success</NeuButton>
                <NeuButton variant="warning">Warning</NeuButton>
                <NeuButton variant="danger">Danger</NeuButton>
                <NeuButton variant="ghost">Ghost</NeuButton>
              </div>
            </div>

            <!-- Sizes -->
            <div>
              <h3 class="text-sm font-medium text-[var(--neu-text-muted)] mb-4">
                Sizes
              </h3>
              <div class="flex flex-wrap items-center gap-4">
                <NeuButton
                  size="sm"
                  variant="primary"
                >Small</NeuButton>
                <NeuButton
                  size="md"
                  variant="primary"
                >Medium</NeuButton>
                <NeuButton
                  size="lg"
                  variant="primary"
                >Large</NeuButton>
              </div>
            </div>

            <!-- States -->
            <div>
              <h3 class="text-sm font-medium text-[var(--neu-text-muted)] mb-4">
                States
              </h3>
              <div class="flex flex-wrap gap-4">
                <NeuButton
                  variant="primary"
                  :loading="buttonLoading"
                  @click="simulateLoading"
                >
                  {{ buttonLoading ? 'Loading...' : 'Click to Load' }}
                </NeuButton>
                <NeuButton
                  variant="primary"
                  disabled
                >Disabled</NeuButton>
                <NeuButton
                  variant="primary"
                  rounded
                >Rounded</NeuButton>
              </div>
            </div>
          </div>
        </NeuCard>
      </section>

      <!-- Form Inputs Section -->
      <section
        id="forms"
        class="mb-16"
      >
        <h2 class="text-2xl font-semibold text-[var(--neu-text)] mb-6">
          Form Inputs
        </h2>
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Text Input -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Text Input
            </h3>
            <div class="space-y-4">
              <NeuInput
                v-model="inputValue"
                label="Username"
                placeholder="Enter your username"
              />
              <NeuInput
                type="email"
                label="Email"
                placeholder="example@email.com"
              />
              <NeuInput
                type="password"
                label="Password"
                placeholder="Enter password"
              />
              <NeuInput
                label="With Error"
                error="This field is required"
                placeholder="Error state"
              />
            </div>
          </NeuCard>

          <!-- Toggle & Checkbox -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Toggle & Checkbox
            </h3>
            <div class="space-y-6">
              <div class="space-y-4">
                <NeuToggle
                  v-model="toggleValue"
                  label="Enable notifications"
                />
                <NeuToggle
                  v-model="toggleValue"
                  label="Small toggle"
                  size="sm"
                />
                <NeuToggle
                  v-model="toggleValue"
                  label="Large toggle"
                  size="lg"
                />
              </div>
              <div class="space-y-4">
                <NeuCheckbox
                  v-model="checkboxValue"
                  label="Accept terms and conditions"
                />
                <NeuCheckbox
                  label="Disabled checkbox"
                  disabled
                />
              </div>
            </div>
          </NeuCard>

          <!-- Radio Buttons -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Radio Buttons
            </h3>
            <NeuRadio
              v-model="radioValue"
              :options="radioOptions"
              name="demo-radio"
            />
            <div class="mt-4">
              <h4 class="text-sm text-[var(--neu-text-muted)] mb-2">Inline</h4>
              <NeuRadio
                v-model="radioValue"
                :options="radioOptions"
                name="demo-radio-inline"
                inline
              />
            </div>
          </NeuCard>

          <!-- Slider & Select -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Slider & Select
            </h3>
            <div class="space-y-6">
              <NeuSlider
                v-model="sliderValue"
                label="Volume"
                :min="0"
                :max="100"
              />
              <NeuSelect
                v-model="selectValue"
                :options="selectOptions"
                label="Choose a fruit"
                placeholder="Select a fruit..."
              />
            </div>
          </NeuCard>

          <!-- Search -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Search
            </h3>
            <div class="space-y-6">
              <NeuSearch
                v-model="searchValue"
                :options="searchOptions"
                label="Search city"
                placeholder="Type to search..."
              />
              <p class="text-sm text-[var(--neu-text-muted)]">
                Selected: {{ searchValue || 'None' }}
              </p>
            </div>
          </NeuCard>

          <!-- MultiSelect -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Multi-Select
            </h3>
            <div class="space-y-6">
              <NeuMultiSelect
                v-model="multiSelectValue"
                :options="multiSelectOptions"
                label="Choose languages"
                placeholder="Select languages..."
              />
              <p class="text-sm text-[var(--neu-text-muted)]">
                Selected: {{ multiSelectValue.length > 0 ? multiSelectValue.join(', ') : 'None' }}
              </p>
            </div>
          </NeuCard>
        </div>
      </section>

      <!-- Cards Section -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-[var(--neu-text)] mb-6">
          Cards
        </h2>
        <div class="grid md:grid-cols-4 gap-6">
          <NeuCard variant="flat">
            <h3 class="font-medium text-[var(--neu-text)]">Flat</h3>
            <p class="text-sm text-[var(--neu-text-muted)] mt-2">Default raised card</p>
          </NeuCard>
          <NeuCard variant="convex">
            <h3 class="font-medium text-[var(--neu-text)]">Convex</h3>
            <p class="text-sm text-[var(--neu-text-muted)] mt-2">Highlighted card</p>
          </NeuCard>
          <NeuCard variant="concave">
            <h3 class="font-medium text-[var(--neu-text)]">Concave</h3>
            <p class="text-sm text-[var(--neu-text-muted)] mt-2">Inset card</p>
          </NeuCard>
          <NeuCard variant="pressed">
            <h3 class="font-medium text-[var(--neu-text)]">Pressed</h3>
            <p class="text-sm text-[var(--neu-text-muted)] mt-2">Depressed card</p>
          </NeuCard>
        </div>
      </section>

      <!-- Feedback Section -->
      <section
        id="feedback"
        class="mb-16"
      >
        <h2 class="text-2xl font-semibold text-[var(--neu-text)] mb-6">
          Feedback
        </h2>
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Progress -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Progress Bars
            </h3>
            <div class="space-y-6">
              <NeuProgress
                :value="25"
                show-label
              >
                <template #label>Downloading</template>
              </NeuProgress>
              <NeuProgress
                :value="50"
                variant="success"
                size="sm"
              />
              <NeuProgress
                :value="75"
                variant="warning"
                size="lg"
              />
              <NeuProgress
                indeterminate
                variant="primary"
              />
            </div>
          </NeuCard>

          <!-- Badges & Avatars -->
          <NeuCard>
            <h3 class="text-lg font-medium text-[var(--neu-text)] mb-4">
              Badges & Avatars
            </h3>
            <div class="space-y-6">
              <div class="flex flex-wrap gap-2">
                <NeuBadge>Default</NeuBadge>
                <NeuBadge variant="primary">Primary</NeuBadge>
                <NeuBadge variant="success">Success</NeuBadge>
                <NeuBadge variant="warning">Warning</NeuBadge>
                <NeuBadge
                  variant="danger"
                  pill
                >Danger</NeuBadge>
              </div>
              <div class="flex items-center gap-4">
                <NeuAvatar
                  initials="JD"
                  size="xs"
                />
                <NeuAvatar
                  initials="AB"
                  size="sm"
                  status="online"
                />
                <NeuAvatar
                  initials="CD"
                  size="md"
                  status="busy"
                />
                <NeuAvatar
                  initials="EF"
                  size="lg"
                  status="away"
                />
                <NeuAvatar
                  initials="GH"
                  size="xl"
                  status="offline"
                />
              </div>
            </div>
          </NeuCard>
        </div>
      </section>

      <!-- Tabs Section -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-[var(--neu-text)] mb-6">
          Tabs
        </h2>
        <NeuCard>
          <NeuTabs
            v-model="tabValue"
            :tabs="tabItems"
          >
            <template #tab1>
              <p class="text-[var(--neu-text)]">
                Welcome to the Overview tab. This is where you can see general information about your project.
              </p>
            </template>
            <template #tab2>
              <p class="text-[var(--neu-text)]">
                The Features tab showcases all the capabilities of the neumorphic design system.
              </p>
            </template>
            <template #tab3>
              <p class="text-[var(--neu-text)]">
                Configure your preferences in the Settings tab. Customize themes and palettes here.
              </p>
            </template>
          </NeuTabs>
        </NeuCard>
      </section>

      <!-- Modal Section -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-[var(--neu-text)] mb-6">
          Modal
        </h2>
        <NeuCard>
          <NeuButton
            variant="primary"
            @click="modalOpen = true"
          >
            Open Modal
          </NeuButton>

          <NeuModal
            v-model="modalOpen"
            title="Neumorphic Modal"
          >
            <p class="text-[var(--neu-text)]">
              This is a beautiful neumorphic modal dialog. It supports customizable titles, content, and footer actions.
            </p>
            <p class="text-[var(--neu-text-muted)] mt-4">
              Press Escape or click outside to close.
            </p>
            <template #footer>
              <div class="flex justify-end gap-3">
                <NeuButton @click="modalOpen = false">
                  Cancel
                </NeuButton>
                <NeuButton
                  variant="primary"
                  @click="modalOpen = false"
                >
                  Confirm
                </NeuButton>
              </div>
            </template>
          </NeuModal>
        </NeuCard>
      </section>

      <!-- Footer -->
      <footer class="text-center py-8 border-t border-[var(--neu-shadow-dark)]/10">
        <p class="text-[var(--neu-text-muted)]">
          Neumorphic UI Framework - Built with Vue 3 & Tailwind CSS
        </p>
      </footer>
    </div>
  </div>
</template>
