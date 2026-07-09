import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarSearchContent } from '../src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-search-content.tsx'
import { consumeGlobalFindRequest, clearGlobalFindRequest } from '../src/features/project-editor/global-search/index.ts'
import { resetGlobalSearchSnapshot } from '../src/features/project-editor/global-search/private/global-search-controller.ts'
import type { SearchProjectRequest } from '../src/shared/ipc.ts'
import {
  buildEditorActionsSpies,
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

type SearchProjectMock = ReturnType<typeof vi.fn>

function stubSearchProjectApi(searchProject: SearchProjectMock) {
  ;(window as unknown as { tramaApi: { searchProject: SearchProjectMock } }).tramaApi = {
    searchProject,
  }
}

function queryInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('.sidebar-search__input') as HTMLInputElement
}

function submitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('.sidebar-search__submit') as HTMLButtonElement
}

async function runSearch(container: HTMLElement, query: string) {
  await act(async () => {
    const input = queryInput(container)
    input.value = query
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    submitButton(container).click()
  })
}

describe('sidebar global search panel', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    resetGlobalSearchSnapshot()
    clearGlobalFindRequest()
  })

  afterEach(() => {
    document.body.removeChild(container)
    delete (window as unknown as { tramaApi?: unknown }).tramaApi
  })

  it('runs a search and lists the matching files', async () => {
    const searchProject = vi.fn(async (_payload: SearchProjectRequest) => ({
      ok: true as const,
      data: {
        files: [
          { path: 'book/Scene-001.md', matchCount: 3 },
          { path: 'lore/Beasts.md', matchCount: 1 },
        ],
      },
    }))
    stubSearchProjectApi(searchProject)
    renderWithEditorActions(h(SidebarSearchContent, {}), { container })

    await runSearch(container, 'dragon')

    expect(searchProject).toHaveBeenCalledWith({ query: 'dragon', caseSensitive: false, wholeWord: false })
    expect(container.textContent).toContain('4 matches in 2 documents')
    expect(container.textContent).toContain('Scene-001')
    expect(container.textContent).toContain('lore/Beasts.md')
  })

  it('sends the toggled case/whole-word options with the search', async () => {
    const searchProject = vi.fn(async (_payload: SearchProjectRequest) => ({
      ok: true as const,
      data: { files: [] },
    }))
    stubSearchProjectApi(searchProject)
    renderWithEditorActions(h(SidebarSearchContent, {}), { container })

    await act(async () => {
      ;(container.querySelector('[aria-label="Match case"]') as HTMLButtonElement).click()
      ;(container.querySelector('[aria-label="Match whole word"]') as HTMLButtonElement).click()
    })
    await runSearch(container, 'Dragon')

    expect(searchProject).toHaveBeenCalledWith({ query: 'Dragon', caseSensitive: true, wholeWord: true })
    expect(container.textContent).toContain('No documents contain “Dragon”.')
  })

  it('opens a clicked result in the active pane and posts a find request', async () => {
    const searchProject = vi.fn(async (_payload: SearchProjectRequest) => ({
      ok: true as const,
      data: { files: [{ path: 'book/Scene-001.md', matchCount: 3 }] },
    }))
    stubSearchProjectApi(searchProject)
    const actions = buildEditorActionsSpies()
    renderWithEditorActions(h(SidebarSearchContent, {}), { container, actions })

    await runSearch(container, 'dragon')
    await act(async () => {
      ;(container.querySelector('.sidebar-search__result') as HTMLButtonElement).click()
    })

    expect(actions.selectFile).toHaveBeenCalledWith('book/Scene-001.md')
    expect(consumeGlobalFindRequest('book/Scene-001.md')).toEqual({
      path: 'book/Scene-001.md',
      query: 'dragon',
      options: { caseSensitive: false, wholeWord: false },
    })
  })

  it('shows the backend error message when the search fails', async () => {
    const searchProject = vi.fn(async (_payload: SearchProjectRequest) => ({
      ok: false as const,
      error: { code: 'PROJECT_SEARCH_FAILED', message: 'No project is open' },
    }))
    stubSearchProjectApi(searchProject)
    renderWithEditorActions(h(SidebarSearchContent, {}), { container })

    await runSearch(container, 'dragon')

    expect(container.textContent).toContain('No project is open')
  })
})
