import type { BrowserWindow } from 'electron'
import { nativeTheme } from 'electron'
import type { ResolvedTheme } from '../src/theme/theme-types.js'

const WINDOW_CHROME: Record<
  ResolvedTheme,
  { backgroundColor: string; titleBarColor: string; symbolColor: string }
> = {
  dark: {
    backgroundColor: '#121212',
    titleBarColor: '#121212',
    symbolColor: '#cccccc',
  },
  light: {
    backgroundColor: '#edf3fb',
    titleBarColor: '#edf3fb',
    symbolColor: '#1f2a3d',
  },
}

export function applyWindowChrome(win: BrowserWindow, theme: ResolvedTheme): void {
  if (win.isDestroyed()) {
    return
  }

  nativeTheme.themeSource = theme
  const chrome = WINDOW_CHROME[theme]
  win.setBackgroundColor(chrome.backgroundColor)

  if (process.platform === 'win32') {
    win.setTitleBarOverlay({
      color: chrome.titleBarColor,
      symbolColor: chrome.symbolColor,
    })
  }
}
