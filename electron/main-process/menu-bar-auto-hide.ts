import { BrowserWindow, Menu, nativeTheme, type Input } from 'electron'
import { getTitleBarOverlayOptions, type ResolvedTheme } from '../window-chrome.js'

const isWin32 = process.platform === 'win32'

function resolveTheme(): ResolvedTheme {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

/** Whether a main-process input event should reveal the menu bar. */
export function shouldRevealMenuBarOnAlt(input: Input): boolean {
  if (input.type !== 'keyDown' || input.isAutoRepeat) {
    return false
  }

  if (isWin32 && input.code === 'AltRight') {
    return false
  }

  return input.key === 'Alt' || input.code === 'AltLeft'
}

function applyWin32TitleBarForMenuBar(win: BrowserWindow, menuBarVisible: boolean): void {
  if (!isWin32 || win.isDestroyed()) {
    return
  }

  win.setTitleBarOverlay(getTitleBarOverlayOptions(resolveTheme(), { includeMenuBar: menuBarVisible }))
}

function attachMenuToWindow(win: BrowserWindow): void {
  const menu = Menu.getApplicationMenu()
  if (menu) {
    win.setMenu(menu)
  }
}

/** Show the native menu bar, or fall back to a menu popup on Win32 overlay titlebars. */
export function revealMenuBar(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return
  }

  const menu = Menu.getApplicationMenu()
  if (!menu) {
    return
  }

  // Hidden Win32 title bars do not paint a menu strip; popup is the reliable Alt menu.
  if (isWin32) {
    menu.popup({ window: win, x: 0, y: 0 })
    return
  }

  attachMenuToWindow(win)
  win.setAutoHideMenuBar(true)
  win.setMenuBarVisibility(true)
}

export function hideMenuBar(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return
  }

  win.setMenuBarVisibility(false)
  applyWin32TitleBarForMenuBar(win, false)
}

/**
 * Keeps the menu bar hidden by default and reveals it on Alt.
 * Win32 overlay titlebars also need renderer → IPC because bare Alt often never reaches the main process.
 */
export function configureAutoHideMenuBar(win: BrowserWindow): void {
  win.setAutoHideMenuBar(true)
  win.setMenuBarVisibility(false)
  applyWin32TitleBarForMenuBar(win, false)

  win.webContents.on('before-input-event', (_event, input) => {
    if (!shouldRevealMenuBarOnAlt(input) || win.isMenuBarVisible()) {
      return
    }
    revealMenuBar(win)
  })

  win.webContents.on('before-mouse-event', (_event, input) => {
    if (input.type === 'mouseDown' && win.isMenuBarVisible()) {
      hideMenuBar(win)
    }
  })
}
