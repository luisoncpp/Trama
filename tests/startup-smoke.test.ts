import { describe, expect, it } from 'vitest'
import { createMainWindowOptions } from '../electron/window-config'

describe('App startup smoke', () => {
  it('creates BrowserWindow with secure defaults', () => {
    const options = createMainWindowOptions('preload.js')

    expect(options.webPreferences?.nodeIntegration).toBe(false)
    expect(options.webPreferences?.contextIsolation).toBe(true)
    expect(options.webPreferences?.sandbox).toBe(false)
    expect(options.webPreferences?.preload).toBe('preload.js')
  })
})
