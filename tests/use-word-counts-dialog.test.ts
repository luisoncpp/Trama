import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { useWordCountsDialog } from '../src/features/project-editor/use-word-counts-dialog'

type HookState = ReturnType<typeof useWordCountsDialog>

function createHookHarness(rootPath: string | null, onState: (state: HookState) => void) {
  return function HookHarness() {
    const state = useWordCountsDialog(rootPath)
    onState(state)
    return null
  }
}

describe('useWordCountsDialog', () => {
  let container: HTMLDivElement
  let latestState: HookState | null = null

  const getWordCountsMock = vi.fn()

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    latestState = null

    ;(window as unknown as { tramaApi: { getWordCounts: typeof getWordCountsMock } }).tramaApi = {
      getWordCounts: getWordCountsMock,
    }
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('starts in closed state', () => {
    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    expect(latestState?.isOpen).toBe(false)
    expect(latestState?.loading).toBe(false)
    expect(latestState?.wordCounts).toBeNull()
    expect(latestState?.error).toBeNull()
  })

  it('opens dialog and calls getWordCounts IPC on openDialog', async () => {
    getWordCountsMock.mockResolvedValue({
      ok: true,
      data: {
        manuscript: 100,
        outline: 50,
        lore: 25,
        total: 175,
      },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.openDialog()
    })

    expect(latestState?.isOpen).toBe(true)
    expect(latestState?.loading).toBe(false)
    expect(latestState?.wordCounts).toEqual({
      manuscript: 100,
      outline: 50,
      lore: 25,
      total: 175,
    })
    expect(getWordCountsMock).toHaveBeenCalledWith('C:/project')
  })

  it('closes dialog on closeDialog call', async () => {
    getWordCountsMock.mockResolvedValue({
      ok: true,
      data: { manuscript: 10, outline: 0, lore: 0, total: 10 },
    })

    const Harness = createHookHarness('C:/project', (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    await act(async () => {
      latestState?.openDialog()
    })
    expect(latestState?.isOpen).toBe(true)

    act(() => {
      latestState?.closeDialog()
    })
    expect(latestState?.isOpen).toBe(false)
  })
})
