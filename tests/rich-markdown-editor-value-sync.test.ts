import { describe, expect, it, beforeEach } from 'vitest'
import { clearImageMap, getImageMap } from '../src/shared/markdown-image-placeholder'
import {
  areEquivalentEditorValues,
  normalizeEditorDocumentValue,
} from '../src/features/project-editor/components/rich-markdown-editor-value-sync'

describe('rich-markdown-editor-value-sync', () => {
  const TINY_PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwDwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

  beforeEach(() => {
    clearImageMap('sync-doc')
  })

  it('normaliza markdown con imagen base64 a placeholder canonico', () => {
    const input = `Antes\n\n![img_0](${TINY_PNG})\n\nDespues`

    const normalized = normalizeEditorDocumentValue(input, 'sync-doc')

    expect(normalized).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
    expect(normalized).not.toContain('data:image/png')
    expect(getImageMap('sync-doc')?.get('img_0')).toBe(TINY_PNG)
  })

  it('trata base64 markdown y placeholder markdown como valores equivalentes', () => {
    const base64Value = `Texto\n\n![img_0](${TINY_PNG})\n`
    const placeholderValue = 'Texto\n\n<!-- IMAGE_PLACEHOLDER:img_0 -->\n'

    expect(areEquivalentEditorValues(base64Value, placeholderValue, 'sync-doc')).toBe(true)
  })

  it('detecta cambios reales de texto aunque las imagenes sean equivalentes', () => {
    const originalValue = `Texto\n\n![img_0](${TINY_PNG})\n`
    const changedValue = `Texto cambiado\n\n<!-- IMAGE_PLACEHOLDER:img_0 -->\n`

    expect(areEquivalentEditorValues(originalValue, changedValue, 'sync-doc')).toBe(false)
  })
})
