import type { BrowserWindow } from 'electron'
import { nativeTheme } from 'electron'
import type { ResolvedTheme } from '../src/theme/theme-types.js'

/** Lets window controls sit over the shell without a painted title-bar band (Win32). */
const TITLE_BAR_OVERLAY_COLOR = 'rgba(0, 0, 0, 0)'

const WINDOW_CHROME: Record<
  ResolvedTheme,
  { backgroundColor: string; symbolColor: string }
> = {
  dark: {
    backgroundColor: '#121212',
    symbolColor: '#cccccc',
  },
  light: {
    backgroundColor: '#edf3fb',
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
      color: TITLE_BAR_OVERLAY_COLOR,
      symbolColor: chrome.symbolColor,
    })
  }
}
