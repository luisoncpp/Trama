import { describe, expect, it, vi } from 'vitest'
import { useTagOverlay } from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-tag-overlay'

const tagIndex = {
  aina: 'lore/characters/Aina.md',
  lirio: 'lore/places/ciudad-principal.md',
}

const makeEditor = (text: string) => ({
  getText: () => text,
  getContents: () => ({ ops: [{ insert: text }] }),
})

describe('useTagOverlay regression: recalc on document change', () => {
  it('recalculates when ctrlPressed is true and recalcRef is set (document change + ctrl held)', () => {
    const editor1 = makeEditor('Aina y Lirio\n')
    const editor2 = makeEditor('Sin tags aqui\n')

    let editorState = editor1
    const editorRef = { get current() { return editorState as any }, set current(v) { editorState = v } }

    const tagOverlayRecalcRef = { current: false }
    const tagOverlayMatchesRef = { current: [] as any[] }

    const result = useTagOverlay({
      editorRef,
      tagIndex,
      ctrlPressed: true,
      tagOverlayRecalcRef,
      tagOverlayMatchesRef,
    })

    expect(result.length).toBe(2)

    editorState = editor2
    tagOverlayRecalcRef.current = true

    const result2 = useTagOverlay({
      editorRef,
      tagIndex,
      ctrlPressed: true,
      tagOverlayRecalcRef,
      tagOverlayMatchesRef,
    })

    expect(result2.length).toBe(0)
  })

  it('does NOT recalculate when ctrlPressed is false even if recalcRef is true', () => {
    const editor1 = makeEditor('Aina y Lirio\n')
    const editor2 = makeEditor('Sin tags aqui\n')

    let editorState = editor1
    const editorRef = { get current() { return editorState as any }, set current(v) { editorState = v } }

    const tagOverlayRecalcRef = { current: true }
    const tagOverlayMatchesRef = { current: [] as any[] }

    const result = useTagOverlay({
      editorRef,
      tagIndex,
      ctrlPressed: false,
      tagOverlayRecalcRef,
      tagOverlayMatchesRef,
    })

    expect(result.length).toBe(0)

    editorState = editor2
    tagOverlayRecalcRef.current = true

    const result2 = useTagOverlay({
      editorRef,
      tagIndex,
      ctrlPressed: false,
      tagOverlayRecalcRef,
      tagOverlayMatchesRef,
    })

    expect(result2.length).toBe(0)
  })
})
