import type { BrowserWindowConstructorOptions } from 'electron'

export function createMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    /* Match --shell-bg / --title-bar-bg; keep the native title bar so "Trama" stays visible. */
    backgroundColor: '#121212',
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
