import { useEffect } from 'preact/hooks'
import Quill from 'quill'
import {
	findVisualLineBoundaries,
	findSentenceBoundaries,
	resolveTextOffsetToDomPosition,
} from './rich-markdown-editor-focus-scope-geometry'
import type { FocusScope } from '../project-editor-types'

const FOCUS_TEXT_HIGHLIGHT_NAME = 'trama-focus-scope'

interface HighlightRegistry {
	set: (name: string, value: unknown) => void
	delete: (name: string) => void
}

function getHighlightRegistry(): HighlightRegistry | null {
	const cssObject = (globalThis as unknown as { CSS?: { highlights?: unknown } }).CSS
	const highlights = cssObject?.highlights as Partial<HighlightRegistry> | undefined
	if (!highlights || typeof highlights.set !== 'function' || typeof highlights.delete !== 'function') {
		return null
	}

	return highlights as HighlightRegistry
}

function clearFocusTextHighlight(editorRoot: HTMLElement): void {
	editorRoot.classList.remove('is-focus-text-highlight')
	getHighlightRegistry()?.delete(FOCUS_TEXT_HIGHLIGHT_NAME)
}

function applyFocusTextHighlight(editorRoot: HTMLElement, lineNode: HTMLElement, startOffset: number, endOffset: number): boolean {
	if (endOffset <= startOffset) {
		return false
	}

	const registry = getHighlightRegistry()
	const HighlightCtor = (globalThis as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
	if (!registry || typeof HighlightCtor !== 'function') {
		return false
	}

	const start = resolveTextOffsetToDomPosition(lineNode, startOffset)
	const end = resolveTextOffsetToDomPosition(lineNode, endOffset)
	if (!start || !end) {
		return false
	}

	const range = document.createRange()
	range.setStart(start.node, start.offset)
	range.setEnd(end.node, end.offset)

	registry.set(FOCUS_TEXT_HIGHLIGHT_NAME, new HighlightCtor(range))
	editorRoot.classList.add('is-focus-text-highlight')
	return true
}

function updateFocusScopeClasses(editorRoot: HTMLElement, scope: FocusScope): void {
	editorRoot.classList.remove('is-focus-scope-line', 'is-focus-scope-sentence', 'is-focus-scope-paragraph')
	editorRoot.classList.add(`is-focus-scope-${scope}`)
}

function clearBlockFocusScope(editorRoot: HTMLElement): void {
	const blocks = Array.from(editorRoot.children)
	for (const block of blocks) {
		if (block instanceof HTMLElement) {
			block.classList.remove('is-focus-emphasis')
		}
	}
}

function applyInlineFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
	const selection = quill.getSelection()
	const selectionIndex = selection?.index ?? 0

	const [line, lineOffset] = quill.getLine(selectionIndex)
	const lineNode = line?.domNode
	if (!(lineNode instanceof HTMLElement)) {
		clearFocusTextHighlight(editorRoot)
		return
	}

	const lineText = lineNode.textContent ?? ''
	if (!lineText.trim()) {
		clearFocusTextHighlight(editorRoot)
		return
	}

	const lineCursor = Math.max(0, Math.min(lineOffset, lineText.length))
	const lineStartIndex = selectionIndex - lineOffset
	const boundaries = scope === 'sentence'
		? findSentenceBoundaries(lineText, lineCursor)
		: findVisualLineBoundaries(quill, selectionIndex, lineStartIndex, lineText.length)

	clearFocusTextHighlight(editorRoot)
	if (applyFocusTextHighlight(editorRoot, lineNode, boundaries.start, boundaries.end)) {
		return
	}

	// If native Highlights API is unavailable, fallback to line-level emphasis without DOM overlays.
	lineNode.classList.add('is-focus-emphasis')
}

function applyFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
	clearBlockFocusScope(editorRoot)
	if (scope !== 'paragraph') {
		applyInlineFocusScope(quill, editorRoot, scope)
		return
	}

	clearFocusTextHighlight(editorRoot)
	const selection = quill.getSelection()
	const [line] = quill.getLine(selection?.index ?? 0)
	const targetNode = line?.domNode
	if (targetNode instanceof HTMLElement) {
		targetNode.classList.add('is-focus-emphasis')
	}
}

function getSelectionViewportRect(quill: Quill): DOMRect | null {
	const selection = quill.getSelection()
	if (!selection) {
		return null
	}

	const docLength = Math.max(0, quill.getLength())
	let index = selection.index
	if (docLength > 1 && index >= docLength - 1) {
		// At EOF Quill selection often points to trailing newline; use previous char line.
		index = docLength - 2
	}

	const length = Math.max(1, selection.length ?? 0)
	let [line, lineOffset] = quill.getLine(index)
	if ((line?.domNode as Node | undefined)?.textContent === '' && index > 0) {
		;[line, lineOffset] = quill.getLine(index - 1)
	}
	const lineNode = line?.domNode
	if (!(lineNode instanceof HTMLElement)) {
		return null
	}

	const lineText = lineNode.textContent ?? ''
	if (!lineText.length) {
		return lineNode.getBoundingClientRect()
	}

	let startOffset = Math.max(0, Math.min(lineOffset, lineText.length))
	if (startOffset >= lineText.length) {
		startOffset = Math.max(0, lineText.length - 1)
	}
	const endOffset = Math.max(startOffset + 1, Math.min(lineText.length, startOffset + length))

	const startPos = resolveTextOffsetToDomPosition(lineNode, startOffset)
	const endPos = resolveTextOffsetToDomPosition(lineNode, endOffset)
	if (!startPos || !endPos) {
		return lineNode.getBoundingClientRect()
	}

	const range = document.createRange()
	range.setStart(startPos.node, startPos.offset)
	range.setEnd(endPos.node, endPos.offset)
	const rect = range.getBoundingClientRect()
	if (rect.width > 0 || rect.height > 0) {
		return rect
	}

	const getClientRects = (range as unknown as { getClientRects?: () => DOMRectList }).getClientRects
	if (typeof getClientRects === 'function') {
		const rects = getClientRects.call(range)
		if (rects.length > 0) {
			return rects[0] as DOMRect
		}
	}

	return lineNode.getBoundingClientRect()
}

function clearFocusScope(editorRoot: HTMLElement): void {
	editorRoot.classList.remove('is-focus-mode', 'is-focus-scope-line', 'is-focus-scope-sentence', 'is-focus-scope-paragraph')
	clearBlockFocusScope(editorRoot)
	clearFocusTextHighlight(editorRoot)
	editorRoot.style.removeProperty('--focus-extra-top')
	editorRoot.style.removeProperty('--focus-extra-bottom')
}

export function useFocusModeScopeEffect(
	editorRef: { current: Quill | null },
	hostRef: { current: HTMLDivElement | null },
	focusModeEnabled: boolean,
	focusScope: FocusScope,
): void {
	useEffect(() => {
		const quill = editorRef.current
		const host = hostRef.current
		if (!quill || !host) {
			return
		}

		const editorRoot = host.querySelector('.ql-editor')
		if (!(editorRoot instanceof HTMLElement)) {
			return
		}

		if (!focusModeEnabled) {
			clearFocusScope(editorRoot)
			return
		}

		editorRoot.classList.add('is-focus-mode')
		updateFocusScopeClasses(editorRoot, focusScope)
		applyFocusScope(quill, editorRoot, focusScope)

		const container = host.querySelector('.ql-container')

		const updateCenteredScroll = () => {
			if (!(container instanceof HTMLElement)) {
				return
			}

			const selection = quill.getSelection()
			if (!selection) {
				editorRoot.style.removeProperty('--focus-extra-top')
				editorRoot.style.removeProperty('--focus-extra-bottom')
				return
			}

			const selectionRect = getSelectionViewportRect(quill)
			if (!selectionRect) {
				return
			}

			const basePad = Math.max(0, Math.round(container.clientHeight / 2 - selectionRect.height / 2))
			editorRoot.style.setProperty('--focus-extra-top', `${basePad}px`)
			editorRoot.style.setProperty('--focus-extra-bottom', `${basePad}px`)

			requestAnimationFrame(() => {
				const refreshedRect = getSelectionViewportRect(quill) ?? selectionRect
				const containerRect = container.getBoundingClientRect()
				let desired = container.scrollTop
					+ (refreshedRect.top - containerRect.top)
					- (container.clientHeight / 2 - refreshedRect.height / 2)
				let maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)

				if (desired > maxScroll + 1) {
					const extraBottom = Math.ceil(desired - maxScroll) + 16
					editorRoot.style.setProperty('--focus-extra-bottom', `${basePad + extraBottom}px`)
				}

				if (desired < -1) {
					const extraTop = Math.ceil(Math.abs(desired)) + 16
					editorRoot.style.setProperty('--focus-extra-top', `${basePad + extraTop}px`)
				}

				requestAnimationFrame(() => {
					const finalRect = getSelectionViewportRect(quill) ?? refreshedRect
					const finalContainerRect = container.getBoundingClientRect()
					desired = container.scrollTop
						+ (finalRect.top - finalContainerRect.top)
						- (container.clientHeight / 2 - finalRect.height / 2)
					maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
					const target = Math.max(0, Math.min(desired, maxScroll))
					if (Math.abs(container.scrollTop - target) > 1) {
						container.scrollTop = Math.round(target)
					}
				})
			})
		}

		let rafId = 0
		const refresh = () => {
			updateFocusScopeClasses(editorRoot, focusScope)
			applyFocusScope(quill, editorRoot, focusScope)
			updateCenteredScroll()
		}

		const scheduleRefresh = () => {
			if (rafId) {
				cancelAnimationFrame(rafId)
			}

			rafId = requestAnimationFrame(() => {
				rafId = 0
				refresh()
			})
		}

		quill.on('selection-change', scheduleRefresh)
		quill.on('text-change', scheduleRefresh)
		window.addEventListener('resize', scheduleRefresh)
		scheduleRefresh()

		return () => {
			if (rafId) {
				cancelAnimationFrame(rafId)
			}

			quill.off('selection-change', scheduleRefresh)
			quill.off('text-change', scheduleRefresh)
			window.removeEventListener('resize', scheduleRefresh)
			editorRoot.style.removeProperty('--focus-extra-top')
			editorRoot.style.removeProperty('--focus-extra-bottom')
		}
	}, [editorRef, hostRef, focusModeEnabled, focusScope])
}
