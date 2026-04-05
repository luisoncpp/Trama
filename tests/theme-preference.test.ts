import { describe, expect, it } from 'vitest'
import {
  isThemePreference,
  readThemePreference,
  resolveThemePreference,
  THEME_MEDIA_QUERY,
  THEME_PREFERENCE_STORAGE_KEY,
} from '../src/theme/theme-logic'

describe('theme logic', () => {
  it('accepts only supported theme preferences', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('sepia')).toBe(false)
  })

  it('restores a persisted preference or falls back to dark', () => {
    expect(readThemePreference('light')).toBe('light')
    expect(readThemePreference('system')).toBe('system')
    expect(readThemePreference('unexpected')).toBe('dark')
    expect(readThemePreference(null)).toBe('dark')
  })

  it('resolves system preference using the current OS mode', () => {
    expect(resolveThemePreference('dark', false)).toBe('dark')
    expect(resolveThemePreference('light', true)).toBe('light')
    expect(resolveThemePreference('system', true)).toBe('dark')
    expect(resolveThemePreference('system', false)).toBe('light')
  })

  it('keeps the storage key and media query stable', () => {
    expect(THEME_PREFERENCE_STORAGE_KEY).toBe('trama.theme.preference')
    expect(THEME_MEDIA_QUERY).toBe('(prefers-color-scheme: dark)')
  })
})