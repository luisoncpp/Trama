import { BrowserWindow, Menu } from 'electron'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../src/shared/workspace-context-menu.js'
import { openHelpPage } from './help-window.js'

async function openHelpFromMenu(win: BrowserWindow, page: string): Promise<void> {
  let resolvedTheme: 'light' | 'dark' = 'dark'
  if (win && !win.isDestroyed()) {
    try {
      const theme = await win.webContents.executeJavaScript(
        "document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'",
      )
      if (theme === 'light' || theme === 'dark') {
        resolvedTheme = theme
      }
    } catch (err) {
      console.error('Failed to resolve theme for help window from menu action:', err)
    }
  }
  openHelpPage(win, { page, resolvedTheme })
}

function dispatchWorkspaceCommand(
  win: BrowserWindow,
  command:
    | { type: 'toggle-split' }
    | { type: 'toggle-fullscreen' }
    | { type: 'toggle-focus' }
    | { type: 'history-back' }
    | { type: 'history-forward' },
): void {
  const commandPayload = JSON.stringify(command)
  void win.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(WORKSPACE_CONTEXT_MENU_EVENT)}, { detail: ${commandPayload} }));`,
    true,
  )
}

function buildMenuTemplate(win: BrowserWindow): Electron.MenuItemConstructorOptions[] {
  return [
    {
      label: 'File',
      submenu: [{ role: 'close' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => dispatchWorkspaceCommand(win, { type: 'history-back' }),
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => dispatchWorkspaceCommand(win, { type: 'history-forward' }),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => dispatchWorkspaceCommand(win, { type: 'toggle-fullscreen' }),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Getting Started', click: () => { void openHelpFromMenu(win, 'getting-started') } },
        { label: 'About Trama', click: () => { void openHelpFromMenu(win, 'about') } },
      ],
    },
  ]
}

export function setupApplicationMenu(win: BrowserWindow): void {
  const template = buildMenuTemplate(win)
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  if (process.platform === 'win32') {
    win.setMenu(menu)
  }
}
