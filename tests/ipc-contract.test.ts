import { describe, expect, it } from 'vitest'
import { buildPingResponse } from '../electron/ipc'
import { documentMetaSchema } from '../src/shared/ipc'

describe('IPC contract validation', () => {
  it('accepts a valid payload', () => {
    const response = buildPingResponse({ message: 'hello' })

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.echo).toBe('hello')
    expect(response.data.timestamp).toBeTypeOf('string')
  })

  it('rejects an invalid payload', () => {
    const response = buildPingResponse({ message: '' })

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
  })

  it('accepts map document meta payloads', () => {
    const parsed = documentMetaSchema.safeParse({
      type: 'map',
      name: 'Realm Map',
      mapConfig: {
        backgroundImage: 'res/world_map.jpg',
        markers: [{ x: 250, y: 400, label: 'Silverwood Forest', destinationTag: '#wood-elves', color: '#2ecc71' }],
      },
    })

    expect(parsed.success).toBe(true)
  })
})
