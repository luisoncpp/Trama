import { app, BrowserWindow } from 'electron'

export function setupSmokeTestHooks(win: BrowserWindow): void {
  win.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('SMOKE_TEST_FAIL', `LOAD_FAIL ${code}: ${description}`)
    app.exit(1)
  })

  setTimeout(() => {
    console.error('SMOKE_TEST_FAIL', 'SMOKE_TIMEOUT')
    app.exit(1)
  }, 10_000)
}
