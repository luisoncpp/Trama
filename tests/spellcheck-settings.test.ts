import { describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useSpellcheckSettings } from '../src/spellcheck/use-spellcheck-settings'

type SpellcheckApiMock = {
  getSpellcheckSettings: () => Promise<{
    ok: true
    data: {
      enabled: boolean
      selectedLanguage: string | null
      availableLanguages: string[]
      supportsLanguageSelection: boolean
    }
  }>
  setSpellcheckSettings: (payload: { enabled: boolean; language?: string | null }) => Promise<{
    ok: true
    data: {
      enabled: boolean
      selectedLanguage: string | null
      availableLanguages: string[]
      supportsLanguageSelection: boolean
    }
  }>
}

function setupSpellcheckApiMock(overrides?: Partial<SpellcheckApiMock>) {
  const baseApi: SpellcheckApiMock = {
    getSpellcheckSettings: async () => ({
      ok: true,
      data: {
        enabled: true,
        selectedLanguage: 'en-US',
        availableLanguages: ['en-US', 'es-ES'],
        supportsLanguageSelection: true,
      },
    }),
    setSpellcheckSettings: async (payload) => ({
      ok: true,
      data: {
        enabled: payload.enabled,
        selectedLanguage: payload.language ?? 'en-US',
        availableLanguages: ['en-US', 'es-ES'],
        supportsLanguageSelection: true,
      },
    }),
  }

  const currentApi = (window as Window & { tramaApi: Record<string, unknown> }).tramaApi ?? {}
  ;(window as Window & { tramaApi: Record<string, unknown> }).tramaApi = {
    ...currentApi,
    ...baseApi,
    ...overrides,
  }
}

describe('useSpellcheckSettings', () => {
  it('updates spellcheck state through the exposed setters', async () => {
    let state: ReturnType<typeof useSpellcheckSettings> | undefined
    setupSpellcheckApiMock()

    function Harness() {
      state = useSpellcheckSettings()
      return null
    }

    const container = document.createElement('div')
    await act(async () => {
      render(h(Harness, {}), container)
      await Promise.resolve()
    })

    await act(async () => {
      await state?.setEnabled(false)
    })

    await act(async () => {
      await state?.setLanguage('es-ES')
    })

    expect(state?.settings.enabled).toBe(false)
    expect(state?.settings.selectedLanguage).toBe('es-ES')
  })
})