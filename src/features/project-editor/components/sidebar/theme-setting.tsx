import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import { ThemePreferenceButtons } from './theme-preference-buttons'

interface ThemeSettingProps {
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
}

export function ThemeSetting({ themePreference, resolvedTheme, onThemePreferenceChange }: ThemeSettingProps) {
  return (
    <div class="project-menu">
      <label class="project-menu__field">
        <span>Theme</span>
        <ThemePreferenceButtons
          themePreference={themePreference}
          onThemePreferenceChange={onThemePreferenceChange}
        />
        <span class="project-menu__field-note">
          Resolved now: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </label>
    </div>
  )
}
