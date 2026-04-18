import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

interface ThemePreferenceButtonsProps {
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
}

export function ThemePreferenceButtons({ themePreference, onThemePreferenceChange }: ThemePreferenceButtonsProps) {
  return (
    <div class="theme-preference-group" role="radiogroup" aria-label="Theme preference">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          class={`editor-button editor-button--secondary editor-button--inline theme-preference-option ${
            themePreference === option.value ? 'is-active' : ''
          }`}
          aria-pressed={themePreference === option.value}
          onClick={() => onThemePreferenceChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
