import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers, shutdownIpcServices } from './ipc.js'
import { setupContextMenu } from './main-process/context-menu.js'
import { setupSmokeTestHooks } from './main-process/smoke-hooks.js'
import { createMainWindowOptions } from './window-config.js'
import { IPC_CHANNELS } from '../src/shared/ipc.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let mainWindow: BrowserWindow | null = null
const isSmokeTest = process.env.TRAMA_SMOKE_TEST === '1'
const DEV_LOAD_RETRIES = 12
const DEV_LOAD_RETRY_DELAY_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('ERR_CONNECTION_REFUSED') ||
    message.includes('ERR_CONNECTION_RESET') ||
    message.includes('ERR_ABORTED')
  )
}

async function loadRendererDevUrlWithRetry(win: BrowserWindow, url: string): Promise<void> {
  for (let attempt = 1; attempt <= DEV_LOAD_RETRIES; attempt += 1) {
    try {
      await win.loadURL(url)
      return
    } catch (error) {
      if (!isRetryableLoadError(error) || attempt === DEV_LOAD_RETRIES) {
        throw error
      }

      await sleep(DEV_LOAD_RETRY_DELAY_MS)
    }
  }
}

async function loadRendererEntry(win: BrowserWindow, renderer: { isDev: boolean; entry: string }): Promise<void> {
  if (renderer.isDev) {
    console.log('MAIN_LOAD_DEV_URL', renderer.entry)
    await loadRendererDevUrlWithRetry(win, renderer.entry)
    return
  }

  console.log('MAIN_LOAD_FILE', renderer.entry)
  await win.loadFile(renderer.entry)
}

async function runSmokeTest(win: BrowserWindow): Promise<void> {
  try {
    const result = await win.webContents.executeJavaScript(
      `(async () => {
        if (!window.tramaApi?.ping) {
          return { ok: false, reason: 'PRELOAD_API_UNAVAILABLE' }
        }

        const response = await window.tramaApi.ping({ message: 'smoke-test' })
        return { ok: true, response }
      })();`,
      true,
    )

    const pass =
      result?.ok === true &&
      result?.response?.ok === true &&
      result?.response?.data?.echo === 'smoke-test'

    if (pass) {
      console.log('SMOKE_TEST_PASS')
      app.exit(0)
      return
    }

    console.error('SMOKE_TEST_FAIL', JSON.stringify(result))
    app.exit(1)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('SMOKE_TEST_FAIL', message)
    app.exit(1)
  }
}

function getRendererEntry(): { isDev: boolean; entry: string } {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    return { isDev: true, entry: devServerUrl }
  }

  const entry = path.resolve(__dirname, '../../dist/index.html')
  return { isDev: false, entry }
}

function showWindow(win: BrowserWindow): void {
  if (!win.isDestroyed() && !win.isVisible()) {
    win.show()
  }
}

function configureWindowShowBehavior(win: BrowserWindow): void {
  win.once('ready-to-show', () => {
    console.log('MAIN_READY_TO_SHOW')
    showWindow(win)
  })

  win.webContents.once('did-finish-load', () => {
    // Fallback for cases where ready-to-show can fire before listener wiring.
    console.log('MAIN_DID_FINISH_LOAD')
    showWindow(win)
  })
}

function emitFullscreenState(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return
  }

  win.webContents.send(IPC_CHANNELS.fullscreenChanged, {
    enabled: win.isFullScreen(),
    timestamp: new Date().toISOString(),
  })
}

function configureFullscreenEvents(win: BrowserWindow): void {
  win.on('enter-full-screen', () => {
    emitFullscreenState(win)
  })

  win.on('leave-full-screen', () => {
    emitFullscreenState(win)
  })
}

async function createMainWindow(): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.cjs')
  const win = new BrowserWindow(createMainWindowOptions(preloadPath))
  mainWindow = win

  if (isSmokeTest) {
    setupSmokeTestHooks(win)
  } else {
    configureWindowShowBehavior(win)
  }

  configureFullscreenEvents(win)

  const renderer = getRendererEntry()
  await loadRendererEntry(win, renderer)

  if (isSmokeTest) {
    void runSmokeTest(win)
  } else {
    showWindow(win)
  }
  setupContextMenu(win)

  win.on('closed', () => {
    mainWindow = null
  })
}

app
  .whenReady()
  .then(async () => {
    registerIpcHandlers(ipcMain, () => mainWindow)
    await createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow()
      }
    })
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('MAIN_STARTUP_FAIL', message)
    app.exit(1)
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void shutdownIpcServices()
})
