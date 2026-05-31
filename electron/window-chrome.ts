import type { BrowserWindow } from 'electron'
import { nativeTheme } from 'electron'
import type { ResolvedTheme } from '../src/theme/theme-types.js'

const WINDOW_BACKGROUND: Record<ResolvedTheme, string> = {
  dark: '#121212',
  light: '#edf3fb',
}

export function applyWindowChrome(win: BrowserWindow, theme: ResolvedTheme): void {
  if (win.isDestroyed()) {
    return
  }

  nativeTheme.themeSource = theme
  win.setBackgroundColor(WINDOW_BACKGROUND[theme])
}
