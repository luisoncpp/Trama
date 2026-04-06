import { useEffect } from 'preact/hooks'
import Quill from 'quill'
import {
	findVisualLineBoundaries,
	findSentenceBoundaries,
	measureInlineBounds,
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

function hideFocusOverlay(editorRoot: HTMLElement): void {
	editorRoot.classList.remove('is-focus-overlay-visible')
	editorRoot.style.removeProperty('--focus-overlay-left')
	editorRoot.style.removeProperty('--focus-overlay-top')
	editorRoot.style.removeProperty('--focus-overlay-width')
	editorRoot.style.removeProperty('--focus-overlay-height')
}

function showFocusOverlay(editorRoot: HTMLElement, bounds: { left: number; top: number; width: number; height: number }): void {
	editorRoot.style.setProperty('--focus-overlay-left', `${bounds.left}px`)
	editorRoot.style.setProperty('--focus-overlay-top', `${bounds.top}px`)
	editorRoot.style.setProperty('--focus-overlay-width', `${Math.max(8, bounds.width)}px`)
	editorRoot.style.setProperty('--focus-overlay-height', `${Math.max(16, bounds.height)}px`)
	editorRoot.classList.add('is-focus-overlay-visible')
}

function applyInlineFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
	const selection = quill.getSelection()
	const selectionIndex = selection?.index ?? 0

	const [line, lineOffset] = quill.getLine(selectionIndex)
	const lineNode = line?.domNode
	if (!(lineNode instanceof HTMLElement)) {
		hideFocusOverlay(editorRoot)
		return
	}

	const lineText = lineNode.textContent ?? ''
	if (!lineText.trim()) {
		hideFocusOverlay(editorRoot)
		return
	}

	const lineCursor = Math.max(0, Math.min(lineOffset, lineText.length))
	const lineStartIndex = selectionIndex - lineOffset
	const boundaries = scope === 'sentence'
		? findSentenceBoundaries(lineText, lineCursor)
		: findVisualLineBoundaries(quill, selectionIndex, lineStartIndex, lineText.length)

	clearFocusTextHighlight(editorRoot)
	if (applyFocusTextHighlight(editorRoot, lineNode, boundaries.start, boundaries.end)) {
		hideFocusOverlay(editorRoot)
		return
	}

	const bounds = measureInlineBounds(lineNode, editorRoot, boundaries.start, boundaries.end)
	if (bounds) {
		showFocusOverlay(editorRoot, bounds)
		return
	}

	const cursorBounds = quill.getBounds(selectionIndex, 1)
	if (cursorBounds && cursorBounds.width > 0 && cursorBounds.height > 0) {
		showFocusOverlay(editorRoot, cursorBounds)
		return
	}

	const rootRect = editorRoot.getBoundingClientRect()
	const lineRect = lineNode.getBoundingClientRect()
	showFocusOverlay(editorRoot, {
		left: lineRect.left - rootRect.left + editorRoot.scrollLeft,
		top: lineRect.top - rootRect.top + editorRoot.scrollTop,
		width: Math.max(10, lineRect.width),
		height: Math.max(16, lineRect.height),
	})
}

function applyFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
	clearBlockFocusScope(editorRoot)
	if (scope !== 'paragraph') {
		applyInlineFocusScope(quill, editorRoot, scope)
		return
	}

	clearFocusTextHighlight(editorRoot)
	hideFocusOverlay(editorRoot)
	const selection = quill.getSelection()
	const [line] = quill.getLine(selection?.index ?? 0)
	const targetNode = line?.domNode
	if (targetNode instanceof HTMLElement) {
		targetNode.classList.add('is-focus-emphasis')
	}
}

function clearFocusScope(editorRoot: HTMLElement): void {
	editorRoot.classList.remove('is-focus-mode', 'is-focus-scope-line', 'is-focus-scope-sentence', 'is-focus-scope-paragraph')
	clearBlockFocusScope(editorRoot)
	clearFocusTextHighlight(editorRoot)
	hideFocusOverlay(editorRoot)
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

		let rafId = 0
		const refresh = () => {
			updateFocusScopeClasses(editorRoot, focusScope)
			applyFocusScope(quill, editorRoot, focusScope)
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

		return () => {
			if (rafId) {
				cancelAnimationFrame(rafId)
			}

			quill.off('selection-change', scheduleRefresh)
			quill.off('text-change', scheduleRefresh)
		}
	}, [editorRef, hostRef, focusModeEnabled, focusScope])
}
