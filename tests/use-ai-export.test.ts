import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useAiExport } from '../src/features/project-editor/use-ai-export'

type HookState = ReturnType<typeof useAiExport>

type AiExportApiResponse = {
  ok: boolean
  data?: {
    success: boolean
    formattedContent: string
    fileCount: number
  }
  error?: {
    code: string
    message: string
  }
}

function createHookHarness(projectRoot: string | null, onState: (state: HookState) => void) {
  return function HookHarness() {
    const state = useAiExport(projectRoot)
    onState(state)
    return null
  }
}

describe('useAiExport', () => {
  let container: HTMLDivElement
  let latestState: HookState | null

  const aiExportMock = vi.fn<(
    payload: { filePaths: string[]; projectRoot: string; includeFrontmatter: boolean },
  ) => Promise<AiExportApiResponse>>()

  const writeClipboardMock = vi.fn<(text: string) => Promise<void>>()

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    latestState = null

    ;(window as unknown as { tramaApi: { aiExport: typeof aiExportMock } }).tramaApi = {
      aiExport: aiExportMock,
    }

    ;(navigator as unknown as { clipboard: { writeText: typeof writeClipboardMock } }).clipboard = {
      writeText: writeClipboardMock,
    }
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('calls aiExport and copies formatted content to clipboard', async () => {
    aiExportMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        formattedContent: '=== ARCHIVO: book/one.md ===\n# One',
        fileCount: 1,
      },
    })
    writeClipboardMock.mockResolvedValue(undefined)

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.setOpen(true)
      latestState?.setSelectedPaths(['book/one.md'])
      latestState?.setIncludeFrontmatter(false)
    })

    let result = false
    await act(async () => {
      result = await latestState!.handleExport()
    })

    expect(result).toBe(true)
    expect(aiExportMock).toHaveBeenCalledWith({
      filePaths: ['book/one.md'],
      projectRoot: 'C:/project',
      includeFrontmatter: false,
    })
    expect(writeClipboardMock).toHaveBeenCalledWith('=== ARCHIVO: book/one.md ===\n# One')
    expect(latestState?.open).toBe(false)
    expect(latestState?.selectedPaths).toEqual([])
    expect(latestState?.lastError).toBeNull()
  })

  it('stores error when IPC export fails', async () => {
    aiExportMock.mockResolvedValue({
      ok: false,
      error: {
        code: 'AI_EXPORT_FAILED',
        message: 'Unable to export',
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.setSelectedPaths(['book/one.md'])
    })

    let result = true
    await act(async () => {
      result = await latestState!.handleExport()
    })

    expect(result).toBe(false)
    expect(writeClipboardMock).not.toHaveBeenCalled()
    expect(latestState?.lastError).toBe('Unable to export')
  })
})
