import { BrowserWindow, type IpcMain } from 'electron'
import { hideMenuBar, revealMenuBar } from '../main-process/menu-bar-auto-hide.js'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels.js'

export function registerMenuBarHandlers(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(IPC_CHANNELS.revealMenuBar, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow()
    if (!win || win.isDestroyed()) {
      return
    }
    revealMenuBar(win)
  })

  ipcMain.handle(IPC_CHANNELS.hideMenuBar, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow()
    if (!win || win.isDestroyed()) {
      return
    }
    hideMenuBar(win)
  })
}
