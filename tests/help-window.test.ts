import { describe, expect, it, vi } from 'vitest'
import { handleOpenHelp, handleDismissGettingStarted } from '../electron/ipc/handlers/help-handlers'
import type { BrowserWindow } from 'electron'

// Mock help-window main-process module to avoid Electron BrowserWindow initialization side-effects
vi.mock('../electron/main-process/help-window.js', () => ({
  openHelpPage: vi.fn(),
  closeHelpWindow: vi.fn(),
}))

describe('help handlers', () => {
  it('validates help page request payloads correctly', async () => {
    const getMainWindow = () => null

    const invalidRes = await handleOpenHelp(getMainWindow, { page: 'invalid-page-id' })
    expect(invalidRes.ok).toBe(false)
    if (!invalidRes.ok) {
      expect(invalidRes.error.code).toBe('VALIDATION_ERROR')
    }

    const validRes = await handleOpenHelp(getMainWindow, { page: 'getting-started' })
    expect(validRes.ok).toBe(true)
  })

  it('handles dismissal storage injection via executeJavaScript mock', async () => {
    const mockExecuteJavaScript = vi.fn().mockResolvedValue(undefined)
    const mockWin = {
      isDestroyed: () => false,
      webContents: {
        executeJavaScript: mockExecuteJavaScript,
      },
    } as unknown as BrowserWindow

    const getMainWindow = () => mockWin

    const res = await handleDismissGettingStarted(getMainWindow)
    expect(res.ok).toBe(true)
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      "localStorage.setItem('trama.help.getting-started.dismissed.v1', 'true')"
    )
  })
})
