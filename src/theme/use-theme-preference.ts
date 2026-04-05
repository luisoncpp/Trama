import { useEffect, useState } from 'preact/hooks'
import { readThemePreference, resolveThemePreference, THEME_MEDIA_QUERY, THEME_PREFERENCE_STORAGE_KEY } from './theme-logic'
import type { ResolvedTheme, ThemePreference } from './theme-types'

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return readThemePreference(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY))
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredPreference)
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark)
  const resolvedTheme = resolveThemePreference(preference, systemPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference)
  }, [preference])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    setSystemPrefersDark(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  return {
    preference,
    resolvedTheme,
    setPreference,
  }
}