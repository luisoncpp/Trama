import type { BrowserWindowConstructorOptions } from 'electron'

const isWin32 = process.platform === 'win32'
const DARK_SHELL = '#121212'

export function createMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: DARK_SHELL,
    /* Native Win11 title bars pick up accent tint; overlay pins --shell-bg without losing window controls. */
    ...(isWin32
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            color: DARK_SHELL,
            symbolColor: '#cccccc',
          },
        }
      : {}),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      spellcheck: true,
    },
  }
}
