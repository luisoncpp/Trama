// @Architecture(descriptionShort="Find bar focus helpers, shortcut scope, and Ctrl+F/H intercept")
import { isModF, isModH } from './editor-session-find-state'

export function isFindBarFocused(inputRef: { current: HTMLInputElement | null }): boolean {
  const input = inputRef.current
  if (!input) {
    return false
  }

  const active = document.activeElement
  if (active === input) {
    return true
  }

  const findbar = input.closest('.editor-findbar')
  return Boolean(findbar && active instanceof Node && findbar.contains(active))
}

export function isEditorBodyFocused(
  hostRef: { current: HTMLDivElement | null },
  inputRef: { current: HTMLInputElement | null },
): boolean {
  const host = hostRef.current
  if (!host) {
    return false
  }

  const active = document.activeElement
  if (!(active instanceof Node) || !host.contains(active) || isFindBarFocused(inputRef)) {
    return false
  }

  const editorRoot = host.querySelector('.ql-editor')
  return editorRoot instanceof HTMLElement && (active === editorRoot || editorRoot.contains(active))
}

export function isFindShortcutInScope(
  host: HTMLElement | null,
  editor: { hasFocus(): boolean } | null,
  target: EventTarget | null,
): boolean {
  if (editor?.hasFocus()) {
    return true
  }
  if (!(target instanceof Node)) {
    return false
  }
  if (host?.contains(target)) {
    return true
  }
  const findBar = host?.parentElement?.querySelector(':scope > .editor-findbar')
  return Boolean(findBar?.contains(target))
}

function describeShortcutTarget(target: EventTarget | null): { tag: string | null; className: string | null } {
  if (!(target instanceof HTMLElement)) {
    return { tag: null, className: null }
  }
  return { tag: target.tagName, className: target.className }
}

export function handleFindReplaceShortcut(
  event: KeyboardEvent,
  host: HTMLElement | null,
  editor: { hasFocus(): boolean } | null,
  onOpenFind: () => void,
  onOpenReplace: () => void,
): void {
  if (!isFindShortcutInScope(host, editor, event.target)) {
    return
  }

  if (isModF(event)) {
    console.info('[trama-find-shortcut] intercept Ctrl+F', describeShortcutTarget(event.target))
    event.preventDefault()
    onOpenFind()
    return
  }

  if (isModH(event)) {
    console.info('[trama-find-shortcut] intercept Ctrl+H', describeShortcutTarget(event.target))
    event.preventDefault()
    onOpenReplace()
  }
}

export function buildKeepFindFocus(
  hostRef: { current: HTMLDivElement | null },
  inputRef: { current: HTMLInputElement | null },
): () => void {
  return () => {
    window.setTimeout(() => {
      if (isEditorBodyFocused(hostRef, inputRef)) {
        return
      }
      inputRef.current?.focus()
    }, 0)
  }
}
