import type { CaptureRegion, HelpScreenshotHarnessDeps } from '../../help-screenshot-harness-types'
import {
  waitForSelector,
  waitForCondition,
  sleep,
  SCENARIO_SETTLE_MS,
  dismissOpenOverlays,
  closeRevisionsRailIfOpen,
  dismissSidebarContextMenuLayer,
  waitForContextMenuStable,
} from './help-screenshot-utils'
import {
  computeSidebarContextMenuRegion,
  computeEditTagsModalRegion,
} from './help-screenshot-geometry'

const WIKI_TAG_ROW_SELECTOR = '[data-path="characters/aldren.md"]'
const CHARACTERS_FOLDER_SELECTOR = '[data-path="characters"]'

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
