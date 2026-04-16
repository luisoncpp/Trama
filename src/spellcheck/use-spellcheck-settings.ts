import { useEffect, useState } from 'preact/hooks'
import type { SpellcheckSettingsResponse } from '../shared/ipc'

const SPELLCHECK_SETTINGS_STORAGE_KEY = 'trama.spellcheck.settings'

type StoredSpellcheckSettings = {
  enabled: boolean
  selectedLanguage: string | null
}

function readStoredSpellcheckSettings(): StoredSpellcheckSettings | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(SPELLCHECK_SETTINGS_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredSpellcheckSettings>
    if (typeof parsed.enabled !== 'boolean') {
      return null
    }

    return {
      enabled: parsed.enabled,
      selectedLanguage: typeof parsed.selectedLanguage === 'string' ? parsed.selectedLanguage : null,
    }
  } catch {
    return null
  }
}

function persistSpellcheckSettings(settings: StoredSpellcheckSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SPELLCHECK_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

function buildNextSettings(
  remoteSettings: SpellcheckSettingsResponse,
  storedSettings: StoredSpellcheckSettings | null,
): StoredSpellcheckSettings {
  if (!storedSettings) {
    return {
      enabled: remoteSettings.enabled,
      selectedLanguage: remoteSettings.selectedLanguage,
    }
  }

  const selectedLanguage =
    storedSettings.selectedLanguage && remoteSettings.availableLanguages.includes(storedSettings.selectedLanguage)
      ? storedSettings.selectedLanguage
      : remoteSettings.selectedLanguage

  return {
    enabled: storedSettings.enabled,
    selectedLanguage,
  }
}

async function applySpellcheckSettings(
  currentSettings: SpellcheckSettingsResponse,
  nextSettings: StoredSpellcheckSettings,
): Promise<SpellcheckSettingsResponse | null> {
  const response = await window.tramaApi.setSpellcheckSettings({
    enabled: nextSettings.enabled,
    language: currentSettings.supportsLanguageSelection ? nextSettings.selectedLanguage : null,
  })
  if (!response.ok) {
    return null
  }

  persistSpellcheckSettings({
    enabled: response.data.enabled,
    selectedLanguage: response.data.selectedLanguage,
  })
  return response.data
}

function mergeSpellcheckSettings(
  currentSettings: SpellcheckSettingsResponse,
  nextSettings: StoredSpellcheckSettings,
): SpellcheckSettingsResponse {
  return {
    ...currentSettings,
    enabled: nextSettings.enabled,
    selectedLanguage: nextSettings.selectedLanguage,
  }
}

async function loadInitialSpellcheckSettings(): Promise<SpellcheckSettingsResponse | null> {
  const response = await window.tramaApi.getSpellcheckSettings()
  if (!response.ok) {
    return null
  }

  const nextStoredSettings = buildNextSettings(response.data, readStoredSpellcheckSettings())
  const needsApply =
    nextStoredSettings.enabled !== response.data.enabled
    || (response.data.supportsLanguageSelection
      && nextStoredSettings.selectedLanguage !== response.data.selectedLanguage)

  if (needsApply) {
    return applySpellcheckSettings(response.data, nextStoredSettings)
  }

  persistSpellcheckSettings(nextStoredSettings)
  return response.data
}

function useSpellcheckSettingsSyncEffect(setSettings: (settings: SpellcheckSettingsResponse) => void): void {
  useEffect(/* syncSpellcheckSettingsOnMount */ () => {
    let cancelled = false

    const syncSettings = async () => {
      const nextSettings = await loadInitialSpellcheckSettings()
      if (!nextSettings || cancelled) {
        return
      }

      setSettings(nextSettings)
    }

    void syncSettings()

    return () => {
      cancelled = true
    }
  }, [setSettings] /*Inputs for syncSpellcheckSettingsOnMount*/)
}

export function useSpellcheckSettings() {
  const [settings, setSettings] = useState<SpellcheckSettingsResponse>({
    enabled: true,
    selectedLanguage: null,
    availableLanguages: [],
    supportsLanguageSelection: false,
  })
  useSpellcheckSettingsSyncEffect(setSettings)

  return {
    settings,
    setEnabled: async (enabled: boolean) => {
      const pendingSettings = {
        enabled,
        selectedLanguage: settings.selectedLanguage,
      }
      setSettings(mergeSpellcheckSettings(settings, pendingSettings))

      const nextSettings = await applySpellcheckSettings(settings, pendingSettings)
      if (!nextSettings) {
        setSettings(settings)
        return
      }

      setSettings(nextSettings)
    },
    setLanguage: async (language: string) => {
      const pendingSettings = {
        enabled: settings.enabled,
        selectedLanguage: language,
      }
      setSettings(mergeSpellcheckSettings(settings, pendingSettings))

      const nextSettings = await applySpellcheckSettings(settings, pendingSettings)
      if (!nextSettings) {
        setSettings(settings)
        return
      }

      setSettings(nextSettings)
    },
  }
}