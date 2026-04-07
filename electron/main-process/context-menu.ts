import { BrowserWindow, Menu } from 'electron'
import type { ContextMenuParams, MenuItemConstructorOptions } from 'electron'
import {
  WORKSPACE_CONTEXT_MENU_EVENT,
  type WorkspaceContextCommand,
} from '../../src/shared/workspace-context-menu.js'

function dispatchWorkspaceCommand(win: BrowserWindow, command: WorkspaceContextCommand): void {
  const commandPayload = JSON.stringify(command)
  void win.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(WORKSPACE_CONTEXT_MENU_EVENT)}, { detail: ${commandPayload} }));`,
    true,
  )
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

function buildContextMenuTemplate(
  win: BrowserWindow,
  params: ContextMenuParams,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []

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
    template.push({ label: 'Cut', role: 'cut' })
    template.push({ label: 'Copy', role: 'copy' })
    template.push({
      label: 'Paste Markdown',
      click: () => dispatchWorkspaceCommand(win, { type: 'paste-markdown' as any }),
    })
    template.push({ label: 'Paste', role: 'paste' })
    template.push({ type: 'separator' })
    template.push(...buildWorkspaceMenuItems(win))
  } else if (params.selectionText) {
    template.push({ label: 'Copy', role: 'copy' })
  }

  return template
}

export function setupContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_event, params) => {
    const template = buildContextMenuTemplate(win, params)
    if (template.length === 0) {
      return
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  })
}
