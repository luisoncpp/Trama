import { describe, expect, it, vi } from 'vitest'
import {
  handleGetGettingStartedDismissed,
  handleOpenHelp,
  handleSetGettingStartedDismissed,
} from '../electron/ipc/handlers/help-handlers'
import type { BrowserWindow } from 'electron'

// Mock help-window main-process module to avoid Electron BrowserWindow initialization side-effects
vi.mock('../electron/main-process/help-window.js', () => ({
  openHelpPage: vi.fn(),
  closeHelpWindow: vi.fn(),
}))

const STORAGE_KEY = 'trama.help.getting-started.dismissed.v1'

function createMockMainWindow(): {
  mockExecuteJavaScript: ReturnType<typeof vi.fn>
  win: BrowserWindow
} {
  const mockExecuteJavaScript = vi.fn()
  const mockWin = {
    isDestroyed: () => false,
    webContents: {
      executeJavaScript: mockExecuteJavaScript,
    },
  } as unknown as BrowserWindow
  return { mockExecuteJavaScript, win: mockWin }
}

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

  it('reads the dismissal key from the main window local storage', async () => {
    const { mockExecuteJavaScript, win } = createMockMainWindow()
    mockExecuteJavaScript.mockResolvedValue('true')
    const getMainWindow = () => win

    const res = await handleGetGettingStartedDismissed(getMainWindow)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.dismissed).toBe(true)
    }
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(`localStorage.getItem("${STORAGE_KEY}")`)
  })

  it('treats any non-true storage value as not dismissed', async () => {
    const { mockExecuteJavaScript, win } = createMockMainWindow()
    mockExecuteJavaScript.mockResolvedValue('false')
    const getMainWindow = () => win

    const res = await handleGetGettingStartedDismissed(getMainWindow)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.dismissed).toBe(false)
    }
  })

  it('returns not dismissed when the main window is unavailable', async () => {
    const getMainWindow = () => null

    const res = await handleGetGettingStartedDismissed(getMainWindow)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.dismissed).toBe(false)
    }
  })

  it('persists the dismissal flag when the checkbox is checked', async () => {
    const { mockExecuteJavaScript, win } = createMockMainWindow()
    const getMainWindow = () => win

    const res = await handleSetGettingStartedDismissed(getMainWindow, { dismissed: true })
    expect(res.ok).toBe(true)
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      `localStorage.setItem("${STORAGE_KEY}", "true")`,
    )
  })

  it('removes the dismissal flag when the checkbox is unchecked', async () => {
    const { mockExecuteJavaScript, win } = createMockMainWindow()
    const getMainWindow = () => win

    const res = await handleSetGettingStartedDismissed(getMainWindow, { dismissed: false })
    expect(res.ok).toBe(true)
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      `localStorage.removeItem("${STORAGE_KEY}")`,
    )
  })

  it('rejects invalid set-dismissed payloads', async () => {
    const { mockExecuteJavaScript, win } = createMockMainWindow()
    const getMainWindow = () => win

    const res = await handleSetGettingStartedDismissed(getMainWindow, { dismissed: 'yes' as unknown as boolean })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION_ERROR')
    }
    expect(mockExecuteJavaScript).not.toHaveBeenCalled()
  })
})
