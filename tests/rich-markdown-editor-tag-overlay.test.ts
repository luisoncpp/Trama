import { describe, expect, it, vi } from 'vitest'
import { buildTagOverlayMatches, resolveTagBounds, mapPlainTextIndexToQuillIndex } from '../src/features/project-editor/components/rich-markdown-editor-tag-overlay'
import { findTagMatchesInText, filterMatchesOutsideCode, isInsideCodeBlock } from '../src/features/project-editor/components/rich-markdown-editor-tag-helpers'

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

describe('isInsideCodeBlock', () => {
  it('returns true inside triple-backtick code blocks', () => {
    const text = 'Some `magia` text'
    const pos = text.indexOf('magia')
    expect(isInsideCodeBlock(text, pos)).toBe(true)
  })

  it('returns true after closing triple backtick', () => {
    const text = '```\ncode\n```\nNot code'
    const pos = text.indexOf('Not')
    expect(isInsideCodeBlock(text, pos)).toBe(false)
  })

  it('returns false outside code blocks', () => {
    const text = 'Some text with magia inside'
    const pos = text.indexOf('magia')
    expect(isInsideCodeBlock(text, pos)).toBe(false)
  })

  it('returns true inside inline backticks', () => {
    const text = 'Use `magia` here'
    const pos = text.indexOf('magia')
    expect(isInsideCodeBlock(text, pos)).toBe(true)
  })

  it('returns true inside indented code', () => {
    const text = '    indented code'
    const pos = text.indexOf('indented')
    expect(isInsideCodeBlock(text, pos)).toBe(true)
  })

  it('handles nested inline code markers', () => {
    const text = '`inline` then `more`'
    expect(isInsideCodeBlock(text, text.indexOf('inline'))).toBe(true)
    expect(isInsideCodeBlock(text, text.indexOf('more'))).toBe(true)
  })
})

describe('tag overlay bounds recomputation (regression: stale bounds after layout change)', () => {
  const tagIndex = {
    aina: 'lore/characters/Aina.md',
    lirio: 'lore/places/ciudad-principal.md',
  }

  const editorText = 'Aina y Lirio\n'
  const textMatches = filterMatchesOutsideCode(
    editorText,
    findTagMatchesInText(editorText, tagIndex),
  )

  it('text matches do not include bounds (decoupled from layout)', () => {
    for (const m of textMatches) {
      expect(m).not.toHaveProperty('bounds')
    }
  })

  it('resolveTagBounds calls getBounds with current Quill indexes', () => {
    const getBounds = vi.fn((index: number, length: number) => ({
      top: 0,
      left: index * 10,
      width: length * 10,
      height: 16,
    }))

    const editor = {
      getText: () => editorText,
      getContents: () => ({
        ops: [{ insert: editorText }],
      }),
      getBounds,
    } as any

    const overlays = resolveTagBounds(editor, textMatches)

    expect(overlays).toHaveLength(2)
    expect(overlays[0].bounds).toEqual({ top: 0, left: 0, width: 40, height: 16 })
    expect(overlays[1].bounds).toEqual({ top: 0, left: 70, width: 50, height: 16 })
    expect(getBounds).toHaveBeenCalledTimes(2)
  })

  it('resolveTagBounds returns fresh bounds on each call (never cached)', () => {
    let layoutVersion = 0
    const getBounds = vi.fn((_index: number, _length: number) => ({
      top: layoutVersion * 100,
      left: 0,
      width: 50,
      height: 16,
    }))

    const editor = {
      getText: () => editorText,
      getContents: () => ({
        ops: [{ insert: editorText }],
      }),
      getBounds,
    } as any

    layoutVersion = 1
    const first = resolveTagBounds(editor, textMatches)

    layoutVersion = 2
    getBounds.mockClear()
    const second = resolveTagBounds(editor, textMatches)

    expect(first[0].bounds!.top).toBe(100)
    expect(first[1].bounds!.top).toBe(100)
    expect(second[0].bounds!.top).toBe(200)
    expect(second[1].bounds!.top).toBe(200)

    expect(first[0].bounds).not.toEqual(second[0].bounds)
    expect(getBounds).toHaveBeenCalledTimes(2)
  })

  it('resolveTagBounds handles embeds before tags correctly', () => {
    const getBounds = vi.fn((index: number, length: number) => ({
      top: 0,
      left: index * 10,
      width: length * 10,
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

    const text = editor.getText()
    const matches = filterMatchesOutsideCode(
      text,
      findTagMatchesInText(text, tagIndex),
    )

    const overlays = resolveTagBounds(editor, matches)

    expect(overlays).toHaveLength(2)
    expect(getBounds).toHaveBeenNthCalledWith(1, 1, 4)
    expect(getBounds).toHaveBeenNthCalledWith(2, 8, 5)
  })

  it('skips intermediate embeds when plain offset falls exactly on a string-op boundary', () => {
    // Document: "Satake\n" + embed(center-end) + embed(spacer) + "caminó\n"
    // getText() returns "Satake\ncaminó\n" (embeds are invisible)
    // Searching for "caminó" gives plain offset 7 (right after "Satake\n")
    // The Quill index must skip both embeds and land at the start of "caminó": 10
    const editor = {
      getText: () => 'Satake\ncaminó\n',
      getContents: () => ({
        ops: [
          { insert: 'Satake\n' },
          { insert: { tramaDirective: 'center-end' } },
          { insert: { tramaDirective: 'spacer' } },
          { insert: 'caminó\n' },
        ],
      }),
    } as any

    // Offset 7 is the start of "caminó" in plain text.
    // Without the fix (<=) this returns 7 (end of "Satake\n" / start of first embed).
    // With the fix (<) it returns 9 (start of the "caminó" op, after both embeds).
    expect(mapPlainTextIndexToQuillIndex(editor, 7)).toBe(9)
  })
})
