import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers } from './ipc.js'
import { createMainWindowOptions } from './window-config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let mainWindow: BrowserWindow | null = null
const isSmokeTest = process.env.TRAMA_SMOKE_TEST === '1'

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

async function createMainWindow(): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.cjs')
  const win = new BrowserWindow(createMainWindowOptions(preloadPath))
  mainWindow = win

  if (isSmokeTest) {
    win.webContents.on('did-fail-load', (_event, code, description) => {
      console.error('SMOKE_TEST_FAIL', `LOAD_FAIL ${code}: ${description}`)
      app.exit(1)
    })

    setTimeout(() => {
      console.error('SMOKE_TEST_FAIL', 'SMOKE_TIMEOUT')
      app.exit(1)
    }, 10_000)
  }

  const renderer = getRendererEntry()
  if (renderer.isDev) {
    await win.loadURL(renderer.entry)
  } else {
    await win.loadFile(renderer.entry)
  }

  if (isSmokeTest) {
    void runSmokeTest(win)
  } else {
    win.once('ready-to-show', () => {
      win.show()
    })
  }

  win.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  registerIpcHandlers(ipcMain)
  await createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
