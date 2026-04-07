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

export function clearFocusTextHighlight(editorRoot: HTMLElement): void {
	editorRoot.classList.remove('is-focus-text-highlight')
	getHighlightRegistry()?.delete(FOCUS_TEXT_HIGHLIGHT_NAME)
}

export function applyFocusTextHighlight(
	editorRoot: HTMLElement,
	lineNode: HTMLElement,
	startOffset: number,
	endOffset: number,
): boolean {
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

export function updateFocusScopeClasses(editorRoot: HTMLElement, scope: FocusScope): void {
	editorRoot.classList.remove('is-focus-scope-line', 'is-focus-scope-sentence', 'is-focus-scope-paragraph')
	editorRoot.classList.add(`is-focus-scope-${scope}`)
}

export function clearBlockFocusScope(editorRoot: HTMLElement): void {
	const blocks = Array.from(editorRoot.children)
	for (const block of blocks) {
		if (block instanceof HTMLElement) {
			block.classList.remove('is-focus-emphasis')
		}
	}
}

export function applyInlineFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
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
	const boundaries =
		scope === 'sentence'
			? findSentenceBoundaries(lineText, lineCursor)
			: findVisualLineBoundaries(quill, selectionIndex, lineStartIndex, lineText.length)

	clearFocusTextHighlight(editorRoot)
	if (applyFocusTextHighlight(editorRoot, lineNode, boundaries.start, boundaries.end)) {
		return
	}

	// If native Highlights API is unavailable, fallback to line-level emphasis without DOM overlays.
	lineNode.classList.add('is-focus-emphasis')
}

export function applyFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
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

export function getSelectionViewportRect(quill: Quill): DOMRect | null {
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

export function clearFocusScope(editorRoot: HTMLElement): void {
	editorRoot.classList.remove('is-focus-mode', 'is-focus-scope-line', 'is-focus-scope-sentence', 'is-focus-scope-paragraph')
	clearBlockFocusScope(editorRoot)
	clearFocusTextHighlight(editorRoot)
	editorRoot.style.removeProperty('--focus-extra-top')
	editorRoot.style.removeProperty('--focus-extra-bottom')
}
