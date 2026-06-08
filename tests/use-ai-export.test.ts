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

function createHookHarness(projectRoot: string | null, onState: (state: HookState) => void): () => null
function createHookHarness(projectRoot: string | null, snapshot: any, onState: (state: HookState) => void): () => null
function createHookHarness(
  projectRoot: string | null,
  snapshotOrOnState: any,
  maybeOnState?: (state: HookState) => void,
) {
  const snapshot = maybeOnState ? snapshotOrOnState : null
  const onState = maybeOnState ? maybeOnState : snapshotOrOnState

  return function HookHarness() {
    const state = useAiExport(projectRoot, snapshot)
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
    vi.useFakeTimers()
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
    vi.useRealTimers()
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
    expect(latestState?.copyToastMessage).toBe('Copied 1 file to clipboard.')

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(latestState?.copyToastMessage).toBeNull()
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

  it('automatically sorts selectedPaths according to the snapshot tree and index', async () => {
    const mockSnapshot = {
      rootPath: 'C:/project',
      tree: [
        {
          id: 'book',
          title: 'book',
          path: 'book',
          type: 'folder',
          children: [
            {
              id: 'book/Act-01',
              title: 'Act-01',
              path: 'book/Act-01',
              type: 'folder',
              children: [
                { id: 'book/Act-01/scene-1.md', title: 'scene-1', path: 'book/Act-01/scene-1.md', type: 'file' },
                { id: 'book/Act-01/scene-2.md', title: 'scene-2', path: 'book/Act-01/scene-2.md', type: 'file' },
              ],
            },
          ],
        },
        {
          id: 'outline',
          title: 'outline',
          path: 'outline',
          type: 'folder',
          children: [
            { id: 'outline/out-1.md', title: 'out-1', path: 'outline/out-1.md', type: 'file' },
          ],
        },
        {
          id: 'lore',
          title: 'lore',
          path: 'lore',
          type: 'folder',
          children: [
            { id: 'lore/character-1.md', title: 'character-1', path: 'lore/character-1.md', type: 'file' },
          ],
        },
      ],
      markdownFiles: [
        'book/Act-01/scene-1.md',
        'book/Act-01/scene-2.md',
        'outline/out-1.md',
        'lore/character-1.md',
      ],
      index: {
        version: '1.0.0',
        corkboardOrder: {
          'book/Act-01': ['book/Act-01/scene-2.md', 'book/Act-01/scene-1.md'],
        },
        cache: {
          'book/Act-01/scene-1.md': {},
          'book/Act-01/scene-2.md': {},
          'outline/out-1.md': {},
          'lore/character-1.md': {},
        },
      },
    }

    const Harness = createHookHarness('C:/project', mockSnapshot, (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.setSelectedPaths([
        'lore/character-1.md',
        'outline/out-1.md',
        'book/Act-01/scene-1.md',
        'book/Act-01/scene-2.md',
      ])
    })

    expect(latestState?.selectedPaths).toEqual([
      'book/Act-01/scene-2.md',
      'book/Act-01/scene-1.md',
      'outline/out-1.md',
      'lore/character-1.md',
    ])
  })
})
