import type { CaptureRegion, HelpScreenshotHarnessDeps } from './help-screenshot-harness-types'
import { waitForSelector, waitForCondition, sleep, SCENARIO_SETTLE_MS } from './help-screenshot-harness-logic'

const WIKI_TAG_ROW_SELECTOR = '[data-path="characters/aldren.md"]'
const CHARACTERS_FOLDER_SELECTOR = '[data-path="characters"]'

function computeBoundingRegion(elements: Element[], padding = 16): CaptureRegion {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    minX = Math.min(minX, rect.left)
    minY = Math.min(minY, rect.top)
    maxX = Math.max(maxX, rect.right)
    maxY = Math.max(maxY, rect.bottom)
  }

  const x = Math.max(0, Math.floor(minX - padding))
  const y = Math.max(0, Math.floor(minY - padding))
  const width = Math.ceil(maxX - minX + padding * 2)
  const height = Math.ceil(maxY - minY + padding * 2)

  return { x, y, width, height }
}

/** Crop around the lore sidebar tree, target row, and open context menu. */
export function computeSidebarContextMenuRegion(row: Element, menu: Element): CaptureRegion {
  const tree = document.querySelector('.sidebar-tree')
  const treeRect = tree?.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const padding = 12

  const left = (treeRect?.left ?? rowRect.left) - padding
  const top = Math.min(treeRect?.top ?? rowRect.top, rowRect.top - 56, menuRect.top) - padding
  const right = Math.max(menuRect.right, rowRect.right, treeRect?.right ?? rowRect.right) + padding
  const bottom = Math.max(menuRect.bottom, rowRect.bottom) + padding + 40

  return {
    x: Math.max(0, Math.floor(left)),
    y: Math.max(0, Math.floor(top)),
    width: Math.ceil(right - left),
    height: Math.ceil(bottom - top),
  }
}

async function dismissOpenOverlays(): Promise<void> {
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

async function closeRevisionsRailIfOpen(): Promise<void> {
  const backButton = document.querySelector('.revisions-rail__back')
  if (backButton instanceof HTMLButtonElement) {
    backButton.click()
    await sleep(SCENARIO_SETTLE_MS)
  }
}

async function ensureWikiTagRowVisible(): Promise<HTMLElement> {
  await waitForSelector(CHARACTERS_FOLDER_SELECTOR)

  if (!document.querySelector(WIKI_TAG_ROW_SELECTOR)) {
    const folder = document.querySelector(CHARACTERS_FOLDER_SELECTOR)
    if (!(folder instanceof HTMLElement)) {
      throw new Error('Could not find characters folder row')
    }
    folder.click()
    await sleep(SCENARIO_SETTLE_MS)
  }

  await waitForSelector(WIKI_TAG_ROW_SELECTOR)
  const row = document.querySelector(WIKI_TAG_ROW_SELECTOR)
  if (!(row instanceof HTMLElement)) {
    throw new Error('Could not find row button for characters/aldren.md')
  }

  row.scrollIntoView({ block: 'center' })
  await sleep(200)
  return row
}

async function openContextMenuOnRow(): Promise<HTMLElement> {
  const row = await ensureWikiTagRowVisible()
  const rect = row.getBoundingClientRect()
  const clientX = rect.left + Math.min(rect.width * 0.65, rect.width - 4)
  const clientY = rect.top + rect.height / 2

  row.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
      clientX,
      clientY,
    }),
  )

  await waitForSelector('.sidebar-context-menu')
  await sleep(SCENARIO_SETTLE_MS)

  const contextMenu = document.querySelector('.sidebar-context-menu')
  if (!contextMenu) {
    throw new Error('Context menu not found after opening')
  }

  const menuRect = contextMenu.getBoundingClientRect()
  if (menuRect.width < 8 || menuRect.height < 8) {
    throw new Error('Context menu is not visible')
  }

  return row
}

interface PrepareWikiTagsScenarioOptions {
  openDocumentInEditor?: boolean
}

async function prepareWikiTagsScenario(
  deps: HelpScreenshotHarnessDeps,
  options: PrepareWikiTagsScenarioOptions = {},
): Promise<void> {
  await dismissOpenOverlays()
  await closeRevisionsRailIfOpen()

  deps.actions.setSidebarSection('lore')
  await sleep(SCENARIO_SETTLE_MS)

  if (options.openDocumentInEditor !== false) {
    await deps.actions.selectFile('lore/characters/aldren.md')
    await sleep(SCENARIO_SETTLE_MS * 2)
  }

  await ensureWikiTagRowVisible()
}

function tryFindEditTagsModal(): HTMLElement | null {
  const modal = Array.from(document.querySelectorAll('.sidebar-create-modal')).find((candidate) => {
    const title = candidate.querySelector('.sidebar-create-dialog__title')
    return title?.textContent?.trim() === 'Edit Tags'
  })

  return modal instanceof HTMLElement ? modal : null
}

export function computeEditTagsModalRegion(modal: Element): CaptureRegion {
  const dialog = modal.querySelector('.sidebar-create-dialog[aria-label="Edit Tags"]')
    ?? modal.querySelector('.sidebar-create-dialog')
  if (!dialog) {
    throw new Error('Edit Tags dialog element not found')
  }

  return computeBoundingRegion([dialog], 12)
}

async function dismissSidebarContextMenuLayer(): Promise<void> {
  const layer = document.querySelector('.sidebar-context-menu-layer')
  if (layer instanceof HTMLElement) {
    layer.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await sleep(200)
  }
}

async function waitForEditTagsDialogReady(): Promise<HTMLElement> {
  await waitForSelector('.sidebar-create-modal .sidebar-create-dialog[aria-label="Edit Tags"]')
  await waitForCondition(() => {
    const modal = tryFindEditTagsModal()
    if (!modal) {
      return false
    }

    const dialog = modal.querySelector('.sidebar-create-dialog')
    const textarea = modal.querySelector('textarea')
    const saveButton = Array.from(modal.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save Tags',
    )
    const dialogRect = dialog?.getBoundingClientRect()
    return Boolean(
      dialog
      && saveButton
      && textarea instanceof HTMLTextAreaElement
      && !textarea.disabled
      && dialogRect
      && dialogRect.width > 120
      && dialogRect.height > 120,
    )
  }, 20_000)
  await dismissSidebarContextMenuLayer()
  await sleep(SCENARIO_SETTLE_MS * 2)

  const modal = tryFindEditTagsModal()
  if (!modal) {
    throw new Error('Edit Tags modal not found after ready wait')
  }

  return modal
}

export async function runEditTagsContextMenuScenario(
  deps: HelpScreenshotHarnessDeps,
): Promise<CaptureRegion> {
  await prepareWikiTagsScenario(deps)

  const rowElement = await openContextMenuOnRow()
  await waitForContextMenuStable()

  const contextMenu = document.querySelector('.sidebar-context-menu')
  if (!contextMenu) {
    throw new Error('Context menu not found after opening')
  }

  return computeSidebarContextMenuRegion(rowElement, contextMenu)
}

async function waitForContextMenuStable(): Promise<void> {
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

export async function runEditTagsModalScenario(
  deps: HelpScreenshotHarnessDeps,
): Promise<CaptureRegion> {
  await prepareWikiTagsScenario(deps, { openDocumentInEditor: false })

  await openContextMenuOnRow()
  await waitForContextMenuStable()

  const editTagsBtn = Array.from(
    document.querySelectorAll('.sidebar-context-menu__item'),
  ).find((el) => el.textContent?.trim() === 'Edit tags') as HTMLButtonElement | undefined

  if (!editTagsBtn) {
    throw new Error('Could not find Edit tags context menu item')
  }

  editTagsBtn.click()
  const modal = await waitForEditTagsDialogReady()

  return computeEditTagsModalRegion(modal)
}
