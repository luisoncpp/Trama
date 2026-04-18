import { describe, expect, it, vi } from 'vitest'
import { buildTagOverlayMatches } from '../src/features/project-editor/components/rich-markdown-editor-tag-overlay'

describe('rich-markdown-editor-tag-overlay', () => {
  it('maps plain text offsets to Quill indexes when embeds exist before a tag', () => {
    const getBounds = vi.fn((left: number, width: number) => ({
      top: 0,
      left,
      width,
      height: 16,
    }))

    const editor = {
      getText: () => 'Aina y Lirio\n',
      getContents: () => ({
        ops: [
          { insert: { tramaDirective: 'pagebreak' } },
          { insert: 'Aina y Lirio\n' },
        ],
      }),
      getBounds,
    } as any

    const matches = buildTagOverlayMatches(editor, {
      aina: 'lore/characters/Aina.md',
      lirio: 'lore/places/ciudad-principal.md',
    })

    expect(matches).toHaveLength(2)
    expect(getBounds).toHaveBeenNthCalledWith(1, 1, 4)
    expect(getBounds).toHaveBeenNthCalledWith(2, 8, 5)
  })
})
