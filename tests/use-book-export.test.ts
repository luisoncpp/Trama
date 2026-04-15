import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useBookExport } from '../src/features/project-editor/use-book-export'
import type { BookExportFormat } from '../src/shared/ipc'

type HookState = ReturnType<typeof useBookExport>

type BookExportApiResponse = {
  ok: boolean
  data?: {
    success: boolean
    outputPath: string
    format: BookExportFormat
    exportedFiles: number
  }
  error?: {
    code: string
    message: string
  }
}

function createHookHarness(projectRoot: string | null, onState: (state: HookState) => void) {
  return function HookHarness() {
    const state = useBookExport(projectRoot)
    onState(state)
    return null
  }
}

describe('useBookExport', () => {
  let container: HTMLDivElement
  let latestState: HookState | null

  const bookExportMock = vi.fn<
    (payload: {
      projectRoot: string
      format: BookExportFormat
      outputPath: string
      title?: string
      author?: string
    }) => Promise<BookExportApiResponse>
  >()

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    latestState = null

    ;(window as unknown as { tramaApi: { bookExport: typeof bookExportMock } }).tramaApi = {
      bookExport: bookExportMock,
    }
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('builds default output path on open and exports markdown book', async () => {
    bookExportMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        outputPath: 'C:/project/exports/book.md',
        format: 'markdown',
        exportedFiles: 2,
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.setOpen(true)
    })

    expect(latestState?.outputPath).toBe('C:/project/exports/book.md')

    let result = false
    await act(async () => {
      result = await latestState!.handleExport()
    })

    expect(result).toBe(true)
    expect(bookExportMock).toHaveBeenCalledWith({
      projectRoot: 'C:/project',
      format: 'markdown',
      outputPath: 'C:/project/exports/book.md',
    })
    expect(latestState?.open).toBe(false)
    expect(latestState?.toastMessage).toBe('Book exported to C:/project/exports/book.md')

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(latestState?.toastMessage).toBeNull()
  })

  it('sends selected format and optional metadata', async () => {
    bookExportMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        outputPath: 'C:/project/exports/book.html',
        format: 'html',
        exportedFiles: 2,
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.setFormat('html')
      latestState?.setTitle('Mi Libro')
      latestState?.setAuthor('L. O.')
      latestState?.setOpen(true)
    })

    expect(latestState?.outputPath).toBe('C:/project/exports/book.html')

    await act(async () => {
      await latestState?.handleExport()
    })

    expect(bookExportMock).toHaveBeenLastCalledWith({
      projectRoot: 'C:/project',
      format: 'html',
      outputPath: 'C:/project/exports/book.html',
      title: 'Mi Libro',
      author: 'L. O.',
    })
  })

  it('stores error when IPC export fails', async () => {
    bookExportMock.mockResolvedValue({
      ok: false,
      error: {
        code: 'BOOK_EXPORT_FAILED',
        message: 'Unable to export book',
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.setOutputPath('C:/project/exports/book.md')
    })

    let result = true
    await act(async () => {
      result = await latestState!.handleExport()
    })

    expect(result).toBe(false)
    expect(latestState?.lastError).toBe('Unable to export book')
  })
})
