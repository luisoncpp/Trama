import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getAppVersion(): string {
  try {
    let currentDir = app.getAppPath()
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(currentDir, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string }
        if (pkg.version) {
          return pkg.version
        }
      }
      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) {
        break
      }
      currentDir = parentDir
    }
  } catch (err) {
    console.error('Failed to read package.json version', err)
  }
  return app.getVersion()
}

let helpWindow: BrowserWindow | null = null

const ALLOWED_HELP_PAGES = [
  'getting-started',
  'about',
  'maps',
  'wiki-tags',
  'ai-import-export',
  'book-export',
  'git-snapshots',
]

export function openHelpPage(
  _mainWin: BrowserWindow | null,
  { page, resolvedTheme }: { page: string; resolvedTheme: 'light' | 'dark' },
): void {
  if (!ALLOWED_HELP_PAGES.includes(page)) {
    console.error(`Rejected invalid help page request: ${page}`)
    return
  }

  if (helpWindow && !helpWindow.isDestroyed()) {
    const pagePath = path.join(__dirname, '../../help/en', `${page}.html`)
    void helpWindow.loadFile(pagePath)
    helpWindow.focus()
    return
  }

  const preloadPath = path.join(__dirname, '../help-preload.cjs')
  helpWindow = new BrowserWindow({
    width: 900,
    height: 640,
    resizable: true,
    autoHideMenuBar: true,
    title: 'Trama Help',
    webPreferences: {
      contextIsolation: true,
      // Match the main window: sandboxed preloads cannot require local helper modules.
      sandbox: false,
      nodeIntegration: false,
      preload: preloadPath,
    },
  })

  helpWindow.on('closed', () => {
    helpWindow = null
  })

  helpWindow.webContents.on('did-finish-load', () => {
    if (!helpWindow || helpWindow.isDestroyed()) return
    const version = getAppVersion()
    void helpWindow.webContents.executeJavaScript(`
      document.documentElement.dataset.theme = '${resolvedTheme}';
      document.documentElement.style.colorScheme = '${resolvedTheme}';
      window.__TRAMA_VERSION__ = '${version}';
      if (window.__TRAMA_THEME_UPDATE__) {
        window.__TRAMA_THEME_UPDATE__('${resolvedTheme}');
      }
      const versionEl = document.getElementById('app-version');
      if (versionEl) {
        versionEl.textContent = '${version}';
      }
    `)
  })

  const pagePath = path.join(__dirname, '../../help/en', `${page}.html`)
  void helpWindow.loadFile(pagePath)
}

export function closeHelpWindow(): void {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.close()
  }
}
