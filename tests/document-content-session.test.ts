import { describe, expect, it, beforeEach } from 'vitest'
import { clearImageMap } from '../src/shared/markdown-image-placeholder'
import {
  getDocumentContentSession,
  clearDocumentContentSession,
} from '../src/features/project-editor/document-content/document-content-session'

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwDwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
const DOC_PATH = 'book/chapter.md'

describe('DocumentContentSession', () => {
  beforeEach(() => {
    clearImageMap(DOC_PATH)
    clearDocumentContentSession(DOC_PATH)
  })

  it('forEditorLoad converts portable markdown into editor-internal placeholders and populates cache', () => {
    const markdown = `Texto\n\n![img_0](${TINY_PNG})\n\nMas texto`
    const session = getDocumentContentSession(DOC_PATH)

    const internal = session.forEditorLoad(markdown)

    expect(internal).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
    expect(internal).not.toContain(TINY_PNG)
  })

  it('forCanonicalCompare treats portable and placeholder representations as equal', () => {
    const session = getDocumentContentSession(DOC_PATH)
    const portable = `Texto\n\n![img_0](${TINY_PNG})`
    const internal = session.forEditorLoad(portable)

    expect(session.forCanonicalCompare(portable)).toBe(session.forCanonicalCompare(internal))
  })

  it('forIpcSave hydrates placeholders back to portable markdown using the cache', async () => {
    const session = getDocumentContentSession(DOC_PATH)
    const portable = `Antes\n\n![img_0](${TINY_PNG})\n\nDespues`
    const internal = session.forEditorLoad(portable)

    const saved = await session.forIpcSave(internal)

    expect(saved).toContain('![img_0](')
    expect(saved).toContain(TINY_PNG)
    expect(saved).not.toContain('<!-- IMAGE_PLACEHOLDER:')
  })

  it('forIpcSave is idempotent on already-portable PNG input', async () => {
    const session = getDocumentContentSession(DOC_PATH)
    const portable = `![img_0](${TINY_PNG})`

    const saved = await session.forIpcSave(portable)

    expect(saved).toContain('![img_0](')
    expect(saved).toContain(TINY_PNG)
  })

  it('forIpcSave expands broken-image comments to original markdown images', async () => {
    const session = getDocumentContentSession(DOC_PATH)
    const brokenComment = '<!-- TRAMA_BROKEN_IMAGE:%7B%22alt%22%3A%22cover%22%2C%22source%22%3A%22res%2Fmissing.png%22%7D -->'

    const saved = await session.forIpcSave(`Texto\n\n${brokenComment}\n\nMas`)

    expect(saved).toContain('![cover](res/missing.png)')
    expect(saved).not.toContain('TRAMA_BROKEN_IMAGE')
  })

  it('round-trip integration restores equivalent portable markdown', async () => {
    const session = getDocumentContentSession(DOC_PATH)
    const original = `Inicio\n\n![img_0](${TINY_PNG})\n\nFin`
    const internal = session.forEditorLoad(original)

    const saved = await session.forIpcSave(internal)

    expect(session.forCanonicalCompare(saved)).toBe(session.forCanonicalCompare(original))
  })
})
