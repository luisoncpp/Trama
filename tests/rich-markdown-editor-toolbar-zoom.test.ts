import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { RichMarkdownEditor } from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor'
import { createZoomSelect, normalizeZoomValue } from '../src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-helpers'

describe('Zoom Toolbar', () => {
  let container: HTMLDivElement
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const noop = () => {}

  const buildEditorProps = (
    overrides: Partial<Parameters<typeof RichMarkdownEditor>[0]> = {},
  ): Parameters<typeof RichMarkdownEditor>[0] => ({
    documentId: 'test-doc',
    value: '',
    disabled: false,
    onChange: noop,
    historyBackDisabled: true,
    onHistoryBack: noop,
    saveDisabled: false,
    saveLabel: 'Guardar',
    onSaveNow: noop,
    revertDisabled: true,
    revertLabel: '',
    onRevertNow: noop,
    syncState: 'clean',
    syncStateLabel: 'Sin cambios',
    ...overrides,
  })

  beforeEach(() => {
    if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
      ;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
        () => new DOMRect(0, 0, 0, 0)
    }

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('createZoomSelect', () => {
    it('creates a select element with correct class and options', () => {
      const select = createZoomSelect()

      expect(select.className).toBe('ql-zoom-level')
      expect(select.title).toBe('Zoom')
      expect(select.getAttribute('aria-label')).toBe('Zoom')

      const options = Array.from(select.options)
      expect(options.length).toBe(7)

      const expectedValues = ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0']
      const expectedLabels = ['50%', '75%', '100%', '125%', '150%', '175%', '200%']

      options.forEach((opt, i) => {
        expect(opt.value).toBe(expectedValues[i])
        expect(opt.textContent).toBe(expectedLabels[i])
      })
    })
  })

  describe('normalizeZoomValue', () => {
    it('returns the expected string for all valid zoom levels', () => {
      const levels: Array<{ value: number; str: string }> = [
        { value: 0.5, str: '0.5' },
        { value: 0.75, str: '0.75' },
        { value: 1.0, str: '1.0' },
        { value: 1.25, str: '1.25' },
        { value: 1.5, str: '1.5' },
        { value: 1.75, str: '1.75' },
        { value: 2.0, str: '2.0' },
      ]
      for (const { value, str } of levels) {
        expect(normalizeZoomValue(value)).toBe(str)
      }
    })

    it('uses default 1.0 when zoomLevel is undefined', () => {
      expect(normalizeZoomValue(undefined)).toBe('1.0')
    })
  })

  describe('zoom select renders in toolbar', () => {
    it('renders zoom select in toolbar when onZoomChange is provided', async () => {
      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'zoom-toolbar-doc',
            value: '# Test',
            onZoomChange: () => {},
          })),
          container,
        )
      })

      await sleep(200)

      const zoomSelect = container.querySelector('select.ql-zoom-level')
      expect(zoomSelect).toBeTruthy()
    })

    it('zoom select is present even without onZoomChange callback', async () => {
      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'zoom-no-callback-doc',
            value: '# Test',
          })),
          container,
        )
      })

      await sleep(200)

      const zoomSelect = container.querySelector('select.ql-zoom-level')
      expect(zoomSelect).toBeTruthy()
    })

    it('calls onZoomChange when the toolbar select changes', async () => {
      let capturedLevel: number | null = null

      act(() => {
        render(
          h(RichMarkdownEditor, buildEditorProps({
            documentId: 'zoom-callback-doc',
            value: '# Test',
            onZoomChange: (level) => { capturedLevel = level },
          })),
          container,
        )
      })

      await sleep(200)

      const zoomSelect = container.querySelector('select.ql-zoom-level') as HTMLSelectElement
      act(() => {
        zoomSelect.value = '1.5'
        zoomSelect.dispatchEvent(new Event('change', { bubbles: true }))
      })

      expect(capturedLevel).toBe(1.5)
    })
  })
})
