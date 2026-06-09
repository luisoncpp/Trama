const EDITOR_POLL_INTERVAL_MS = 100
const EDITOR_POLL_TIMEOUT_MS = 20_000

export const SCENARIO_SETTLE_MS = 600

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function waitForCondition(predicate: () => boolean, timeoutMs = EDITOR_POLL_TIMEOUT_MS): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return
    }

    await sleep(EDITOR_POLL_INTERVAL_MS)
  }

  throw new Error('HELP_SCREENSHOT_TIMEOUT waiting for UI condition')
}

export async function waitForSelector(selector: string, timeoutMs = EDITOR_POLL_TIMEOUT_MS): Promise<void> {
  await waitForCondition(() => Boolean(document.querySelector(selector)), timeoutMs)
}

export async function waitForActiveEditorSurfaceIdle(): Promise<void> {
  await waitForCondition(() => {
    const activePane = document.querySelector('.workspace-split-pane.is-active .editor-manuscript')
      ?? document.querySelector('.editor-panel-root .editor-manuscript')
    return Boolean(activePane && !activePane.classList.contains('is-muted'))
  }, 45_000)
}

export async function waitForRichEditor(): Promise<void> {
  await waitForActiveEditorSurfaceIdle()
  await waitForSelector('.rich-editor .ql-editor')
}

export async function waitForSplitLayout(): Promise<void> {
  await waitForSelector('.workspace-split')
  await waitForSelector('.workspace-split-divider')
  await waitForSelector('.workspace-split-pane')
}

export async function waitForFocusEmphasis(): Promise<void> {
  await waitForCondition(() => {
    const editor = document.querySelector('.rich-editor .ql-editor.is-focus-mode')
    return Boolean(editor?.querySelector('.is-focus-emphasis'))
  }, 15_000)
  await sleep(SCENARIO_SETTLE_MS * 2)
}

export async function waitForRevisionsLoaded(): Promise<void> {
  await waitForSelector('.revisions-rail')
  await waitForCondition(() => {
    const loading = Array.from(document.querySelectorAll('.revisions-rail__hint'))
      .some((element) => element.textContent?.includes('Loading revisions'))
    if (loading) {
      return false
    }

    return document.querySelectorAll('.revisions-rail__item').length > 0
  }, 45_000)
  await sleep(SCENARIO_SETTLE_MS * 2)
}

export async function waitForContextMenuStable(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })

  const contextMenu = document.querySelector('.sidebar-context-menu')
  if (!contextMenu) {
    throw new Error('Context menu closed before capture')
  }

  const menuRect = contextMenu.getBoundingClientRect()
  if (menuRect.width < 8 || menuRect.height < 8) {
    throw new Error('Context menu is not visible before capture')
  }
}

export async function dismissOpenOverlays(): Promise<void> {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await sleep(200)

  const contextMenuLayer = document.querySelector('.sidebar-context-menu-layer')
  if (contextMenuLayer) {
    contextMenuLayer.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await sleep(200)
  }

  const modal = document.querySelector('.sidebar-create-modal')
  if (modal) {
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await sleep(200)
  }
}

export async function closeRevisionsRailIfOpen(): Promise<void> {
  const backButton = document.querySelector('.revisions-rail__back')
  if (backButton instanceof HTMLButtonElement) {
    backButton.click()
    await sleep(SCENARIO_SETTLE_MS)
  }
}

export async function dismissSidebarContextMenuLayer(): Promise<void> {
  const layer = document.querySelector('.sidebar-context-menu-layer')
  if (layer instanceof HTMLElement) {
    layer.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await sleep(200)
  }
}
