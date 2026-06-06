import { describe, expect, it } from 'vitest'
import {
  GETTING_STARTED_DISMISSED_STORAGE_KEY,
  readGettingStartedDismissed,
} from '../src/features/project-editor/help-preferences'

describe('help preferences', () => {
  it('identifies dismissal correctly from storage strings', () => {
    expect(readGettingStartedDismissed('true')).toBe(true)
    expect(readGettingStartedDismissed('false')).toBe(false)
    expect(readGettingStartedDismissed(null)).toBe(false)
    expect(readGettingStartedDismissed('unexpected')).toBe(false)
  })

  it('keeps the storage key stable', () => {
    expect(GETTING_STARTED_DISMISSED_STORAGE_KEY).toBe('trama.help.getting-started.dismissed.v1')
  })
})
