import type { BrowserWindowConstructorOptions } from 'electron'

const isWin32 = process.platform === 'win32'
const DARK_SHELL = '#121212'

export function createMainWindowOptions(preloadPath: string, iconPath?: string): BrowserWindowConstructorOptions {
  return {
    icon: iconPath,
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: DARK_SHELL,
    /* Hidden title bar + transparent overlay so native controls blend with the shell. */
    ...(isWin32
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            color: 'rgba(0, 0, 0, 0)',
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
