import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Fragment, h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useState } from 'preact/hooks'
import Quill from 'quill'
import { RichMarkdownEditor } from '../src/features/project-editor/components/rich-markdown-editor'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const noop = () => {}
const globalAny = globalThis as unknown as {
	CSS?: Record<string, unknown>
	Highlight?: new (...ranges: Range[]) => unknown
}
const originalCSS = globalAny.CSS
const originalHighlight = globalAny.Highlight

function buildProps(
	overrides: Partial<Parameters<typeof RichMarkdownEditor>[0]> = {},
): Parameters<typeof RichMarkdownEditor>[0] {
	return {
		documentId: 'split-focus-test',
		value: 'Primera frase del documento. Segunda frase para probar foco en split.',
		disabled: false,
		onChange: noop,
		saveDisabled: false,
		saveLabel: 'Guardar',
		onSaveNow: noop,
		syncState: 'clean' as const,
		syncStateLabel: 'Sin cambios',
		focusModeEnabled: true,
		focusScope: 'sentence' as const,
		...overrides,
	}
}

describe('Split pane focus mode', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
			;(Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
				() => new DOMRect(0, 0, 0, 0)
		}

		container = document.createElement('div')
		document.body.appendChild(container)

		globalAny.CSS = {
			highlights: {
				set: vi.fn(),
				delete: vi.fn(),
			},
		}
		globalAny.Highlight = class MockHighlight {
			constructor(..._ranges: Range[]) {}
		}
	})

	afterEach(() => {
		render(null, container)
		document.body.removeChild(container)
		globalAny.CSS = originalCSS
		if (originalHighlight) {
			globalAny.Highlight = originalHighlight
		} else {
			delete globalAny.Highlight
		}
	})

	it('active pane shows focus highlighting on sentence only, not entire text', async () => {
		function SplitPaneTest() {
			const [activePane, setActivePane] = useState<'primary' | 'secondary'>('primary')

			return h(Fragment, null, [
				h('div', { id: 'primary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'primary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('div', { id: 'secondary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'secondary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('button', {
					id: 'switch-to-secondary',
					onClick: () => setActivePane('secondary'),
					textContent: 'Switch to Secondary',
				}),
			])
		}

		act(() => {
			render(h(SplitPaneTest, {}), container)
		})

		await sleep(150)

		const primaryEditor = container.querySelector('#primary-pane .ql-editor') as HTMLElement
		const secondaryEditor = container.querySelector('#secondary-pane .ql-editor') as HTMLElement

		expect(primaryEditor.classList.contains('is-focus-mode')).toBe(true)
		expect(primaryEditor.classList.contains('is-focus-mode-inactive')).toBe(false)
		expect(primaryEditor.classList.contains('is-focus-text-highlight')).toBe(true)

		expect(secondaryEditor.classList.contains('is-focus-mode')).toBe(false)
		expect(secondaryEditor.classList.contains('is-focus-mode-inactive')).toBe(true)
		expect(secondaryEditor.classList.contains('is-focus-text-highlight')).toBe(false)

		const setHighlight = (globalAny.CSS as { highlights: { set: typeof vi.fn } }).highlights.set
		expect(setHighlight).toHaveBeenCalledWith('trama-focus-scope', expect.anything())
	})

	it('inactive pane dims entire content via is-focus-mode-inactive', async () => {
		function SplitPaneTest() {
			const [activePane] = useState<'primary' | 'secondary'>('primary')

			return h(Fragment, null, [
				h('div', { id: 'primary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'primary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('div', { id: 'secondary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'secondary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
			])
		}

		act(() => {
			render(h(SplitPaneTest, {}), container)
		})

		await sleep(150)

		const primaryEditor = container.querySelector('#primary-pane .ql-editor') as HTMLElement
		const secondaryEditor = container.querySelector('#secondary-pane .ql-editor') as HTMLElement

		expect(primaryEditor.classList.contains('is-focus-mode')).toBe(true)
		expect(secondaryEditor.classList.contains('is-focus-mode-inactive')).toBe(true)
	})

	it('switching active pane transfers focus highlighting correctly', async () => {
		function SplitPaneTest() {
			const [activePane, setActivePane] = useState<'primary' | 'secondary'>('primary')

			return h(Fragment, null, [
				h('div', { id: 'primary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'primary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('div', { id: 'secondary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'secondary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('button', {
					id: 'switch-btn',
					onClick: () => setActivePane(activePane === 'primary' ? 'secondary' : 'primary'),
					textContent: 'Switch',
				}),
			])
		}

		act(() => {
			render(h(SplitPaneTest, {}), container)
		})

		await sleep(150)

		const primaryEditor = container.querySelector('#primary-pane .ql-editor') as HTMLElement
		const secondaryEditor = container.querySelector('#secondary-pane .ql-editor') as HTMLElement
		const setHighlight = (globalAny.CSS as { highlights: { set: typeof vi.fn } }).highlights.set

		expect(primaryEditor.classList.contains('is-focus-mode')).toBe(true)
		expect(secondaryEditor.classList.contains('is-focus-mode-inactive')).toBe(true)

		const switchBtn = container.querySelector('#switch-btn') as HTMLButtonElement
		act(() => {
			switchBtn.click()
		})
		await sleep(150)

		expect(primaryEditor.classList.contains('is-focus-mode-inactive')).toBe(true)
		expect(primaryEditor.classList.contains('is-focus-mode')).toBe(false)
		expect(secondaryEditor.classList.contains('is-focus-mode')).toBe(true)
		expect(secondaryEditor.classList.contains('is-focus-mode-inactive')).toBe(false)
	})

	it('only active pane has is-focus-text-highlight, inactive has none', async () => {
		const setHighlight = vi.fn()
		const deleteHighlight = vi.fn()

		globalAny.CSS = {
			highlights: { set: setHighlight, delete: deleteHighlight },
		}

		function SplitPaneTest() {
			const [activePane] = useState<'primary' | 'secondary'>('primary')

			return h(Fragment, null, [
				h('div', { id: 'primary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'primary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('div', { id: 'secondary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: activePane === 'secondary',
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
			])
		}

		act(() => {
			render(h(SplitPaneTest, {}), container)
		})

		await sleep(150)

		const primaryEditor = container.querySelector('#primary-pane .ql-editor') as HTMLElement
		const secondaryEditor = container.querySelector('#secondary-pane .ql-editor') as HTMLElement

		expect(primaryEditor.classList.contains('is-focus-text-highlight')).toBe(true)
		expect(secondaryEditor.classList.contains('is-focus-text-highlight')).toBe(false)

		expect(setHighlight).toHaveBeenCalledWith('trama-focus-scope', expect.anything())
	})

	it('both panes show is-focus-scope-sentence when active', async () => {
		function SplitPaneTest() {
			return h(Fragment, null, [
				h('div', { id: 'primary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: true,
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
				h('div', { id: 'secondary-pane' },
					h(RichMarkdownEditor, buildProps({
						isActive: true,
						focusModeEnabled: true,
						focusScope: 'sentence',
					}))
				),
			])
		}

		act(() => {
			render(h(SplitPaneTest, {}), container)
		})

		await sleep(150)

		const primaryEditor = container.querySelector('#primary-pane .ql-editor') as HTMLElement
		const secondaryEditor = container.querySelector('#secondary-pane .ql-editor') as HTMLElement

		expect(primaryEditor.classList.contains('is-focus-scope-sentence')).toBe(true)
		expect(secondaryEditor.classList.contains('is-focus-scope-sentence')).toBe(true)
	})
})