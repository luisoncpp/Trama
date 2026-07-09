import { describe, expect, it } from 'vitest'
import { buildPingResponse } from '../electron/ipc'
import { documentMetaSchema, searchProjectRequestSchema } from '../src/shared/ipc'

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

  it('accepts a valid project search payload and rejects a blank query', () => {
    expect(searchProjectRequestSchema.safeParse({ query: 'dragon', caseSensitive: true, wholeWord: false }).success).toBe(true)
    expect(searchProjectRequestSchema.safeParse({ query: '   ', caseSensitive: false, wholeWord: false }).success).toBe(false)
    expect(searchProjectRequestSchema.safeParse({ query: 'dragon' }).success).toBe(false)
  })
})
