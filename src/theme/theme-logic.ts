import type { ResolvedTheme, ThemePreference } from './theme-types'

export const THEME_PREFERENCE_STORAGE_KEY = 'trama.theme.preference'
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function isThemePreference(value: string): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readThemePreference(rawValue: string | null): ThemePreference {
  return rawValue && isThemePreference(rawValue) ? rawValue : 'dark'
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return preference
}