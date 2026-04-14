import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useAiImport } from '../src/features/project-editor/use-ai-import'

type HookState = ReturnType<typeof useAiImport>

type AiImportPreviewApiResponse = {
  ok: boolean
  data?: {
    files: Array<{ path: string; content: string; exists: boolean }>
    totalFiles: number
    newFiles: number
    existingFiles: number
  }
  error?: {
    code: string
    message: string
  }
}

type AiImportExecuteApiResponse = {
  ok: boolean
  data?: {
    success: boolean
    created: string[]
    appended: string[]
    replaced: string[]
    skipped: string[]
    errors: Array<{ path: string; error: string }>
  }
  error?: {
    code: string
    message: string
  }
}

function createHookHarness(projectRoot: string | null, onState: (state: HookState) => void) {
  return function HookHarness() {
    const state = useAiImport(projectRoot)
    onState(state)
    return null
  }
}

describe('useAiImport', () => {
  let container: HTMLDivElement
  let latestState: HookState | null
  let logSpy: ReturnType<typeof vi.spyOn>

  const aiImportPreviewMock = vi.fn<(
    payload: { clipboardContent: string; projectRoot: string; importMode: 'append' | 'replace' },
  ) => Promise<AiImportPreviewApiResponse>>()

  const aiImportMock = vi.fn<(
    payload: { clipboardContent: string; projectRoot: string; importMode: 'append' | 'replace' },
  ) => Promise<AiImportExecuteApiResponse>>()

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    latestState = null
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    ;(window as unknown as {
      tramaApi: {
        aiImportPreview: typeof aiImportPreviewMock
        aiImport: typeof aiImportMock
      }
    }).tramaApi = {
      aiImportPreview: aiImportPreviewMock,
      aiImport: aiImportMock,
    }
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('passes import mode to preview requests', async () => {
    aiImportPreviewMock.mockResolvedValue({
      ok: true,
      data: {
        files: [{ path: 'book/one.md', content: '# One', exists: true }],
        totalFiles: 1,
        newFiles: 0,
        existingFiles: 1,
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      await latestState?.handlePreview('=== FILE: book/one.md ===\n# One', 'append')
    })

    expect(aiImportPreviewMock).toHaveBeenCalledWith({
      clipboardContent: '=== FILE: book/one.md ===\n# One',
      projectRoot: 'C:/project',
      importMode: 'append',
    })
  })

  it('passes import mode to execute requests and logs the result summary', async () => {
    aiImportMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        created: ['book/new.md'],
        appended: [],
        replaced: ['book/old.md'],
        skipped: [],
        errors: [],
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    let result = false
    await act(async () => {
      result = await latestState!.handleExecute('=== FILE: book/old.md ===\n# Updated', 'replace')
    })

    expect(result).toBe(true)
    expect(aiImportMock).toHaveBeenCalledWith({
      clipboardContent: '=== FILE: book/old.md ===\n# Updated',
      projectRoot: 'C:/project',
      importMode: 'replace',
    })
    expect(logSpy).toHaveBeenCalledWith('AI Import: 1 created, 0 appended, 1 replaced, 0 skipped, 0 errors')
  })
})