import { WORKSPACE_CONTEXT_MENU_EVENT } from '../shared/workspace-context-menu'
import type { ResolvedTheme } from '../theme/theme-types'
import type { CaptureRegion, HelpScreenshotHarnessDeps } from './help-screenshot-harness-types'
import type { HelpScreenshotScenarioId } from './help-screenshot-scenarios'
import {
  runEditTagsContextMenuScenario,
  runEditTagsModalScenario,
} from './help-screenshot-scenario-wiki-tags'

const EDITOR_POLL_INTERVAL_MS = 100
const EDITOR_POLL_TIMEOUT_MS = 20_000

export const SCENARIO_SETTLE_MS = 600

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function dispatchWorkspaceCommand(
  command:
    | { type: 'toggle-split' }
    | { type: 'toggle-focus' }
    | { type: 'see-revisions'; pane: 'primary'; path: string },
): void {
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, {
      detail: command,
    }),
  )
}

function applyResolvedThemeForScreenshot(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
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

async function waitForActiveEditorSurfaceIdle(): Promise<void> {
  await waitForCondition(() => {
    const activePane = document.querySelector('.workspace-split-pane.is-active .editor-manuscript')
      ?? document.querySelector('.editor-panel-root .editor-manuscript')
    return Boolean(activePane && !activePane.classList.contains('is-muted'))
  }, 45_000)
}

async function waitForRichEditor(): Promise<void> {
  await waitForActiveEditorSurfaceIdle()
  await waitForSelector('.rich-editor .ql-editor')
}

async function waitForSplitLayout(): Promise<void> {
  await waitForSelector('.workspace-split')
  await waitForSelector('.workspace-split-divider')
  await waitForSelector('.workspace-split-pane')
}

async function ensureProjectOpen(deps: HelpScreenshotHarnessDeps): Promise<void> {
  await deps.openProject(deps.projectRoot)
  await waitForSelector('.editor-workspace')
}

async function openDocument(deps: HelpScreenshotHarnessDeps, relativePath: string): Promise<void> {
  await deps.actions.selectFile(relativePath)
  await waitForRichEditor()
  await sleep(SCENARIO_SETTLE_MS)
}

function isSplitLayoutActive(): boolean {
  return Boolean(document.querySelector('.editor-shell.is-split, .workspace-split'))
}

async function ensureSinglePaneLayout(deps: HelpScreenshotHarnessDeps): Promise<void> {
  if (isSplitLayoutActive()) {
    deps.actions.toggleWorkspaceLayoutMode()
    await sleep(SCENARIO_SETTLE_MS)
  }
}

async function ensureFocusModeDisabled(deps: HelpScreenshotHarnessDeps): Promise<void> {
  if (document.querySelector('.editor-shell.is-focus-mode')) {
    deps.actions.toggleFocusMode()
    await waitForCondition(() => !document.querySelector('.editor-shell.is-focus-mode'))
    await sleep(SCENARIO_SETTLE_MS)
  }
}

async function getActiveQuill() {
  const { default: Quill } = await import('quill')
  const container = document.querySelector(
    '.workspace-split-pane.is-active .rich-editor .ql-container, .editor-panel-root .rich-editor .ql-container, .rich-editor .ql-container',
  )
  if (!(container instanceof HTMLElement)) {
    return null
  }

  const quill = Quill.find(container)
  return quill instanceof Quill ? quill : null
}

async function placeCaretInBodyParagraph(): Promise<void> {
  const quill = await getActiveQuill()
  if (!quill) {
    throw new Error('HELP_SCREENSHOT_QUILL_UNAVAILABLE')
  }

  const length = quill.getLength()
  let targetIndex = Math.min(180, Math.max(0, length - 2))

  for (let index = 80; index < Math.min(length - 1, 700); index += 1) {
    const [line] = quill.getLine(index)
    const text = line?.domNode?.textContent ?? ''
    if (text.trim().length > 60) {
      targetIndex = index
      break
    }
  }

  quill.focus()
  quill.setSelection(targetIndex, 0, 'user')
  await sleep(SCENARIO_SETTLE_MS)
}

async function waitForFocusEmphasis(): Promise<void> {
  await waitForCondition(() => {
    const editor = document.querySelector('.rich-editor .ql-editor.is-focus-mode')
    return Boolean(editor?.querySelector('.is-focus-emphasis'))
  }, 15_000)
  await sleep(SCENARIO_SETTLE_MS * 2)
}

async function ensureFocusModeEnabled(deps: HelpScreenshotHarnessDeps): Promise<void> {
  if (!document.querySelector('.editor-shell.is-focus-mode')) {
    deps.actions.toggleFocusMode()
    await waitForSelector('.editor-shell.is-focus-mode')
    await waitForSelector('.rich-editor .ql-editor.is-focus-mode')
    await sleep(SCENARIO_SETTLE_MS)
  }

  await waitForFocusEmphasis()
}

async function prepareBase(deps: HelpScreenshotHarnessDeps, theme: ResolvedTheme): Promise<void> {
  applyResolvedThemeForScreenshot(theme)
  await ensureProjectOpen(deps)
  await ensureFocusModeDisabled(deps)
  await ensureSinglePaneLayout(deps)
  deps.actions.setSidebarSection('explorer')
}

async function runWorkspaceOverview(
  deps: HelpScreenshotHarnessDeps,
  theme: ResolvedTheme,
): Promise<void> {
  await prepareBase(deps, theme)
  await openDocument(deps, 'book/chapter-01.md')
}

async function runSplitPanes(deps: HelpScreenshotHarnessDeps): Promise<void> {
  await prepareBase(deps, 'dark')
  await openDocument(deps, 'book/chapter-01.md')
  deps.actions.toggleWorkspaceLayoutMode()
  await waitForSplitLayout()
  deps.actions.openFileInPane('book/chapter-02.md', 'secondary')
  await sleep(SCENARIO_SETTLE_MS * 3)
}

async function runFocusMode(deps: HelpScreenshotHarnessDeps): Promise<void> {
  await prepareBase(deps, 'dark')
  await openDocument(deps, 'book/chapter-01.md')
  deps.actions.setFocusScope('paragraph')
  await placeCaretInBodyParagraph()
  await ensureFocusModeEnabled(deps)
}

async function runMapDocument(deps: HelpScreenshotHarnessDeps): Promise<void> {
  await prepareBase(deps, 'dark')
  const probe = await window.tramaApi.readDocument({ path: 'lore/map.md' })
  if (!probe.ok) {
    throw new Error(`MAP_DOCUMENT_READ_FAILED: ${probe.error.message}`)
  }
  if (probe.data.meta.type !== 'map') {
    throw new Error('MAP_DOCUMENT_META_TYPE_MISMATCH')
  }
  await deps.actions.selectFile('lore/map.md')
  await waitForSelector('.map-editor', 90_000)
  await waitForSelector('.map-editor__image, .map-editor__stage', 90_000)
  await sleep(SCENARIO_SETTLE_MS * 2)
}

async function waitForRevisionsLoaded(): Promise<void> {
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

async function runGitSnapshots(deps: HelpScreenshotHarnessDeps): Promise<void> {
  await prepareBase(deps, 'dark')
  await openDocument(deps, 'book/chapter-01.md')
  dispatchWorkspaceCommand({
    type: 'see-revisions',
    pane: 'primary',
    path: 'book/chapter-01.md',
  })
  await waitForRevisionsLoaded()
}

export async function runHelpScreenshotScenario(
  deps: HelpScreenshotHarnessDeps,
  scenarioId: HelpScreenshotScenarioId,
): Promise<CaptureRegion | undefined> {
  switch (scenarioId) {
    case 'workspace-overview-dark':
      await runWorkspaceOverview(deps, 'dark')
      return undefined
    case 'workspace-overview-light':
      await runWorkspaceOverview(deps, 'light')
      return undefined
    case 'split-panes-dark':
      await runSplitPanes(deps)
      return undefined
    case 'focus-mode-dark':
      await runFocusMode(deps)
      return undefined
    case 'map-document-dark':
      await runMapDocument(deps)
      return undefined
    case 'git-snapshots-dark':
      await runGitSnapshots(deps)
      return undefined
    case 'edit-tags-context-menu-dark':
      await prepareBase(deps, 'dark')
      return runEditTagsContextMenuScenario(deps)
    case 'edit-tags-modal-dark':
      await prepareBase(deps, 'dark')
      return runEditTagsModalScenario(deps)
    default: {
      const exhaustive: never = scenarioId
      throw new Error(`Unknown help screenshot scenario: ${exhaustive}`)
    }
  }
}
