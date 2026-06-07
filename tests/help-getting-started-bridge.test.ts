import { describe, expect, it } from 'vitest'
import {
  assertGettingStartedDismissedSaved,
  unwrapGettingStartedDismissed,
} from '../src/shared/help-getting-started-ipc-bridge'

describe('help getting started bridge', () => {
  it('unwraps a successful dismissed=true envelope', () => {
    expect(unwrapGettingStartedDismissed({ ok: true, data: { dismissed: true } })).toBe(true)
  })

  it('unwraps a successful dismissed=false envelope', () => {
    expect(unwrapGettingStartedDismissed({ ok: true, data: { dismissed: false } })).toBe(false)
  })

  it('treats failed or malformed envelopes as not dismissed', () => {
    expect(unwrapGettingStartedDismissed({ ok: false, error: { code: 'STORAGE_READ_FAILED', message: 'x' } })).toBe(false)
    expect(unwrapGettingStartedDismissed(null)).toBe(false)
    expect(unwrapGettingStartedDismissed(undefined)).toBe(false)
  })

  it('accepts a successful save envelope', () => {
    expect(() => assertGettingStartedDismissedSaved({ ok: true, data: { success: true } })).not.toThrow()
  })

  it('rejects a failed save envelope', () => {
    expect(() =>
      assertGettingStartedDismissedSaved({ ok: false, error: { code: 'STORAGE_WRITE_FAILED', message: 'x' } }),
    ).toThrow('Failed to persist Getting Started dismissal preference')
  })
})
