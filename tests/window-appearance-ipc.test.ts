import { describe, expect, it } from 'vitest'
import { IPC_CHANNELS } from '../src/shared/ipc-channels'
import { setWindowAppearanceRequestSchema } from '../src/shared/ipc'

describe('window appearance IPC', () => {
  it('IPC_CHANNELS includes setWindowAppearance', () => {
    expect(IPC_CHANNELS.setWindowAppearance).toBe('trama:window:set-appearance')
  })

  it('setWindowAppearanceRequestSchema accepts valid payload', () => {
    const result = setWindowAppearanceRequestSchema.safeParse({ theme: 'dark' })
    expect(result.success).toBe(true)
  })

  it('setWindowAppearanceRequestSchema rejects invalid theme', () => {
    const result = setWindowAppearanceRequestSchema.safeParse({ theme: 'system' })
    expect(result.success).toBe(false)
  })
})
