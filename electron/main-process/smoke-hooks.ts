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

export async function runSmokeTest(win: BrowserWindow): Promise<void> {
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
      if (!win.isDestroyed()) {
        win.destroy()
      }
      app.exit(0)
      setTimeout(() => {
        process.exit(0)
      }, 0)
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
