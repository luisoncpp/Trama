import { BrowserWindow, Menu } from 'electron'
import type { ContextMenuParams, MenuItemConstructorOptions } from 'electron'
import {
  WORKSPACE_CONTEXT_MENU_STATE_GLOBAL,
  WORKSPACE_CONTEXT_MENU_EVENT,
  type WorkspaceContextMenuState,
  type WorkspaceContextCommand,
} from '../../src/shared/workspace-context-menu.js'

function dispatchWorkspaceCommand(win: BrowserWindow, command: WorkspaceContextCommand): void {
  const commandPayload = JSON.stringify(command)
  void win.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(WORKSPACE_CONTEXT_MENU_EVENT)}, { detail: ${commandPayload} }));`,
    true,
  )
}

async function readWorkspaceContextMenuState(win: BrowserWindow): Promise<WorkspaceContextMenuState | null> {
  try {
    const rawState = await win.webContents.executeJavaScript(
      `window[${JSON.stringify(WORKSPACE_CONTEXT_MENU_STATE_GLOBAL)}] ?? null`,
      true,
    )
    if (!rawState || typeof rawState !== 'object') {
      return null
    }
    const candidate = rawState as Partial<WorkspaceContextMenuState>
    const validPane = candidate.pane === 'primary' || candidate.pane === 'secondary' || candidate.pane === null
    if (typeof candidate.gitAvailable !== 'boolean' || !validPane || typeof candidate.previewReadOnly !== 'boolean') {
      return null
    }
    if (candidate.path !== undefined && candidate.path !== null && typeof candidate.path !== 'string') {
      return null
    }
    const pane = candidate.pane ?? null
    const path = candidate.path ?? null
    return {
      gitAvailable: candidate.gitAvailable,
      pane,
      path,
      previewReadOnly: candidate.previewReadOnly,
    }
  } catch {
    return null
  }
}

function buildWorkspaceMenuItems(win: BrowserWindow): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Toggle Split Layout',
      accelerator: 'CmdOrCtrl+.',
      click: () => dispatchWorkspaceCommand(win, { type: 'toggle-split' }),
    },
    {
      label: 'Toggle Fullscreen',
      accelerator: 'CmdOrCtrl+Shift+F',
      click: () => dispatchWorkspaceCommand(win, { type: 'toggle-fullscreen' }),
    },
    {
      label: 'Toggle Focus Mode',
      accelerator: 'CmdOrCtrl+Shift+M',
      click: () => dispatchWorkspaceCommand(win, { type: 'toggle-focus' }),
    },
  ]
}

function buildRevisionMenuItem(win: BrowserWindow, state: WorkspaceContextMenuState | null): MenuItemConstructorOptions | null {
  if (!state?.gitAvailable || !state.pane || !state.path) {
    return null
  }
  const pane = state.pane
  const path = state.path
  return {
    label: 'See Revisions',
    click: () => dispatchWorkspaceCommand(win, { type: 'see-revisions', pane, path }),
  }
}

function appendRevisionItem(template: MenuItemConstructorOptions[], revisionItem: MenuItemConstructorOptions | null): void {
  if (!revisionItem) {
    return
  }
  template.push({ type: 'separator' })
  template.push(revisionItem)
}

function appendEditableMenuItems(
  template: MenuItemConstructorOptions[],
  win: BrowserWindow,
  state: WorkspaceContextMenuState | null,
  revisionItem: MenuItemConstructorOptions | null,
): void {
  if (!state?.previewReadOnly) {
    template.push({ label: 'Cut', role: 'cut' })
  }
  template.push({ label: 'Copy', role: 'copy' })
  template.push({
    label: 'Copy as Markdown',
    click: () => dispatchWorkspaceCommand(win, { type: 'copy-as-markdown' }),
  })
  if (!state?.previewReadOnly) {
    template.push({
      label: 'Paste Markdown',
      click: () => dispatchWorkspaceCommand(win, { type: 'paste-markdown' }),
    })
    template.push({ label: 'Paste', role: 'paste' })
  }
  appendRevisionItem(template, revisionItem)
  template.push({ type: 'separator' })
  template.push(...buildWorkspaceMenuItems(win))
}

function buildContextMenuTemplate(
  win: BrowserWindow,
  params: ContextMenuParams,
  state: WorkspaceContextMenuState | null,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []
  const revisionItem = buildRevisionMenuItem(win, state)

  if (params.misspelledWord) {
    const suggestions = params.dictionarySuggestions || []
    if (suggestions.length > 0) {
      suggestions.slice(0, 5).forEach((suggestion: string) => {
        template.push({
          label: suggestion,
          click: () => {
            win.webContents.replaceMisspelling(suggestion)
          },
        })
      })
      template.push({ type: 'separator' })
    }

    template.push({
      label: 'Add to Dictionary',
      click: () => {
        win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      },
    })
    template.push({ type: 'separator' })
  }

  if (params.isEditable) {
    appendEditableMenuItems(template, win, state, revisionItem)
  } else if (params.selectionText) {
    template.push({ label: 'Copy', role: 'copy' })
    appendRevisionItem(template, revisionItem)
  } else if (revisionItem) {
    template.push(revisionItem)
  }

  return template
}

export function setupContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', async (_event, params) => {
    const state = await readWorkspaceContextMenuState(win)
    const template = buildContextMenuTemplate(win, params, state)
    if (template.length === 0) {
      return
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  })
}
