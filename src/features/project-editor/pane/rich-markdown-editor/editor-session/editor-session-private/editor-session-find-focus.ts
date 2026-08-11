// @Architecture(descriptionShort="Find bar focus helpers: detect focused region and restore find input safely")
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
