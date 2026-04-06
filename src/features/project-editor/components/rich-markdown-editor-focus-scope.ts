import { useEffect } from 'preact/hooks'
import Quill from 'quill'
import type { FocusScope } from '../project-editor-types'

const FOCUS_TEXT_HIGHLIGHT_KEY = 'trama-focus-scope'

type HighlightRegistry = {
  set: (name: string, highlight: unknown) => void
  delete: (name: string) => void
}

type HighlightConstructor = new (...ranges: Range[]) => unknown

type DomPosition = {
  node: Text
  offset: number
}

type ScopeRange = {
  startIndex: number
  endIndex: number
}

function findSentenceBoundaries(text: string, cursorOffset: number): { start: number; end: number } {
  const limit = Math.max(0, Math.min(cursorOffset, text.length))
  const sentenceSeparator = /[.!?。！？]/

  let start = 0
  for (let index = limit - 1; index >= 0; index -= 1) {
    if (sentenceSeparator.test(text[index])) {
      start = index + 1
      break
    }
  }

  while (start < text.length && /\s/.test(text[start])) {
    start += 1
  }

  let end = text.length
  for (let index = limit; index < text.length; index += 1) {
    if (sentenceSeparator.test(text[index])) {
      end = index + 1
      break
    }
  }

  if (end <= start) {
    return { start: 0, end: text.length }
  }

  return { start, end }
}

function findVisualLineBoundaries(
  quill: Quill,
  selectionIndex: number,
  lineStartIndex: number,
  lineTextLength: number,
): { start: number; end: number } {
  if (lineTextLength <= 0) {
    return { start: 0, end: 0 }
  }

  const lineEndIndex = lineStartIndex + lineTextLength
  const maxAnchor = Math.max(lineStartIndex, lineEndIndex - 1)
  let anchorIndex = Math.min(Math.max(selectionIndex, lineStartIndex), maxAnchor)

  let anchorBounds = quill.getBounds(anchorIndex, 1)
  if (!anchorBounds || anchorBounds.width <= 0 || anchorBounds.height <= 0) {
    anchorIndex = Math.max(lineStartIndex, anchorIndex - 1)
    anchorBounds = quill.getBounds(anchorIndex, 1)
  }

  if (!anchorBounds || anchorBounds.width <= 0 || anchorBounds.height <= 0) {
    return { start: 0, end: lineTextLength }
  }

  const sameLineTolerance = 1
  const anchorTop = anchorBounds.top

  let startIndex = anchorIndex
  while (startIndex > lineStartIndex) {
    const previous = startIndex - 1
    const bounds = quill.getBounds(previous, 1)
    if (!bounds || Math.abs(bounds.top - anchorTop) > sameLineTolerance) {
      break
    }

    startIndex = previous
  }

  let endIndex = anchorIndex + 1
  while (endIndex < lineEndIndex) {
    const bounds = quill.getBounds(endIndex, 1)
    if (!bounds || Math.abs(bounds.top - anchorTop) > sameLineTolerance) {
      break
    }

    endIndex += 1
  }

  return {
    start: startIndex - lineStartIndex,
    end: endIndex - lineStartIndex,
  }
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

function getHighlightRegistry(): HighlightRegistry | null {
  const cssValue = globalThis.CSS as unknown
  if (!cssValue || typeof cssValue !== 'object') {
    return null
  }

  const highlights = (cssValue as { highlights?: HighlightRegistry }).highlights
  if (!highlights || typeof highlights.set !== 'function' || typeof highlights.delete !== 'function') {
    return null
  }

  return highlights
}

function getHighlightConstructor(): HighlightConstructor | null {
  const ctor = (globalThis as { Highlight?: HighlightConstructor }).Highlight
  if (typeof ctor !== 'function') {
    return null
  }

  return ctor
}

function clearFocusTextHighlight(): void {
  const registry = getHighlightRegistry()
  if (!registry) {
    return
  }

  registry.delete(FOCUS_TEXT_HIGHLIGHT_KEY)
}

function resolveTextNode(leafDomNode: unknown): Text | null {
  if (leafDomNode instanceof Text) {
    return leafDomNode
  }

  if (!(leafDomNode instanceof HTMLElement)) {
    return null
  }

  const walker = document.createTreeWalker(leafDomNode, NodeFilter.SHOW_TEXT)
  const currentNode = walker.nextNode()
  return currentNode instanceof Text ? currentNode : null
}

function resolveStartPosition(quill: Quill, index: number): DomPosition | null {
  const [leaf, leafOffset] = quill.getLeaf(index)
  const textNode = resolveTextNode(leaf?.domNode)
  if (!textNode) {
    return null
  }

  return {
    node: textNode,
    offset: Math.max(0, Math.min(leafOffset, textNode.data.length)),
  }
}

function resolveEndPosition(quill: Quill, endExclusive: number): DomPosition | null {
  if (endExclusive <= 0) {
    return resolveStartPosition(quill, 0)
  }

  const endAnchor = endExclusive - 1
  const [leaf, leafOffset] = quill.getLeaf(endAnchor)
  const textNode = resolveTextNode(leaf?.domNode)
  if (!textNode) {
    return null
  }

  return {
    node: textNode,
    offset: Math.max(0, Math.min(leafOffset + 1, textNode.data.length)),
  }
}

function createTextRange(quill: Quill, scopeRange: ScopeRange): Range | null {
  if (scopeRange.endIndex <= scopeRange.startIndex) {
    return null
  }

  const start = resolveStartPosition(quill, scopeRange.startIndex)
  const end = resolveEndPosition(quill, scopeRange.endIndex)
  if (!start || !end) {
    return null
  }

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  return range
}

function applyFocusTextHighlight(quill: Quill, scopeRange: ScopeRange): boolean {
  const registry = getHighlightRegistry()
  const HighlightCtor = getHighlightConstructor()
  if (!registry || !HighlightCtor) {
    return false
  }

  const range = createTextRange(quill, scopeRange)
  if (!range) {
    registry.delete(FOCUS_TEXT_HIGHLIGHT_KEY)
    return false
  }

  registry.set(FOCUS_TEXT_HIGHLIGHT_KEY, new HighlightCtor(range))
  return true
}

function getInlineScopeRange(quill: Quill, scope: FocusScope): ScopeRange | null {
  const selection = quill.getSelection()
  const selectionIndex = selection?.index ?? 0

  const [line, lineOffset] = quill.getLine(selectionIndex)
  const lineNode = line?.domNode
  if (!(lineNode instanceof HTMLElement)) {
    return null
  }

  const lineText = lineNode.textContent ?? ''
  if (!lineText.trim()) {
    return null
  }

  const lineCursor = Math.max(0, Math.min(lineOffset, lineText.length))
  const lineStartIndex = selectionIndex - lineOffset
  const boundaries = scope === 'sentence'
    ? findSentenceBoundaries(lineText, lineCursor)
    : findVisualLineBoundaries(quill, selectionIndex, lineStartIndex, lineText.length)

  const startIndex = lineStartIndex + boundaries.start
  const endIndex = Math.max(startIndex + 1, lineStartIndex + boundaries.end)
  return { startIndex, endIndex }
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
  const scopeRange = getInlineScopeRange(quill, scope)
  if (!scopeRange) {
    clearFocusTextHighlight()
    hideFocusOverlay(editorRoot)
    return
  }

  if (applyFocusTextHighlight(quill, scopeRange)) {
    hideFocusOverlay(editorRoot)
    return
  }

  clearFocusTextHighlight()
  const length = Math.max(1, scopeRange.endIndex - scopeRange.startIndex)
  const bounds = quill.getBounds(scopeRange.startIndex, length)
  if (bounds && bounds.width > 0 && bounds.height > 0) {
    showFocusOverlay(editorRoot, bounds)
    return
  }

  const selection = quill.getSelection()
  const selectionIndex = selection?.index ?? 0
  const cursorBounds = quill.getBounds(selectionIndex, 1)
  if (cursorBounds && cursorBounds.width > 0 && cursorBounds.height > 0) {
    showFocusOverlay(editorRoot, cursorBounds)
    return
  }

  hideFocusOverlay(editorRoot)
}

function applyFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
  clearBlockFocusScope(editorRoot)
  if (scope !== 'paragraph') {
    applyInlineFocusScope(quill, editorRoot, scope)
    return
  }

  hideFocusOverlay(editorRoot)
  clearFocusTextHighlight()
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
  clearFocusTextHighlight()
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
