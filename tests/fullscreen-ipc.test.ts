import { describe, expect, it } from 'vitest'
import {
  IPC_CHANNELS,
  fullscreenChangedEventSchema,
  setFullscreenRequestSchema,
  setSpellcheckSettingsRequestSchema,
  spellcheckSettingsResponseSchema,
} from '../src/shared/ipc'

describe('fullscreen IPC contract', () => {
  it('IPC_CHANNELS includes setFullscreen and fullscreenChanged', () => {
    expect(IPC_CHANNELS.setFullscreen).toBe('trama:window:set-fullscreen')
    expect(IPC_CHANNELS.fullscreenChanged).toBe('trama:window:fullscreen-changed')
  })

  it('setFullscreenRequestSchema accepts valid payload', () => {
    const result = setFullscreenRequestSchema.safeParse({ enabled: true })
    expect(result.success).toBe(true)
  })

  it('setFullscreenRequestSchema rejects missing enabled field', () => {
    const result = setFullscreenRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('setFullscreenRequestSchema rejects non-boolean enabled', () => {
    const result = setFullscreenRequestSchema.safeParse({ enabled: 'yes' })
    expect(result.success).toBe(false)
  })

  it('fullscreenChangedEventSchema accepts valid event', () => {
    const result = fullscreenChangedEventSchema.safeParse({ enabled: false, timestamp: new Date().toISOString() })
    expect(result.success).toBe(true)
  })

  it('fullscreenChangedEventSchema rejects missing enabled field', () => {
    const result = fullscreenChangedEventSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('IPC_CHANNELS includes spellcheck settings channels', () => {
    expect(IPC_CHANNELS.getSpellcheckSettings).toBe('trama:window:get-spellcheck-settings')
    expect(IPC_CHANNELS.setSpellcheckSettings).toBe('trama:window:set-spellcheck-settings')
  })

  it('setSpellcheckSettingsRequestSchema accepts valid payload', () => {
    const result = setSpellcheckSettingsRequestSchema.safeParse({ enabled: true, language: 'es-ES' })
    expect(result.success).toBe(true)
  })

  it('spellcheckSettingsResponseSchema accepts valid response', () => {
    const result = spellcheckSettingsResponseSchema.safeParse({
      enabled: true,
      selectedLanguage: 'en-US',
      availableLanguages: ['en-US', 'es-ES'],
      supportsLanguageSelection: true,
    })
    expect(result.success).toBe(true)
  })
})
