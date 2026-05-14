import { BrowserWindow, Menu } from 'electron'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../src/shared/workspace-context-menu.js'

function dispatchWorkspaceCommand(win: BrowserWindow, command: { type: 'toggle-split' } | { type: 'toggle-fullscreen' } | { type: 'toggle-focus' }): void {
  const commandPayload = JSON.stringify(command)
  void win.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(WORKSPACE_CONTEXT_MENU_EVENT)}, { detail: ${commandPayload} }));`,
    true,
  )
}

export function setupApplicationMenu(win: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
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
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => dispatchWorkspaceCommand(win, { type: 'toggle-fullscreen' }),
        },
      ],
    },
    { role: 'help' },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}