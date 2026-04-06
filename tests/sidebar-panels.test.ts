import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarPanel } from '../src/features/project-editor/components/sidebar/sidebar-panel.tsx'
import { SidebarExplorerContent } from '../src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx'
import { SidebarSettingsContent } from '../src/features/project-editor/components/sidebar/sidebar-settings-content.tsx'
import type { ThemePreference } from '../src/theme/theme-types'

function buildPanelProps(
  overrides: Partial<Parameters<typeof SidebarPanel>[0]> = {},
): Parameters<typeof SidebarPanel>[0] {
  return {
    visibleFiles: [
      'book/Act-01/Chapter-01/Scene-001.md',
      'outline/arc-general.md',
      'lore/personajes/protagonista.md',
    ],
    selectedPath: 'book/Act-01/Chapter-01/Scene-001.md',
    loadingDocument: false,
    onSelectFile: () => undefined,
    sidebarActiveSection: 'explorer',
    sidebarPanelCollapsed: false,
    sidebarPanelWidth: 320,
    onSelectSidebarSection: () => undefined,
    onToggleSidebarPanelCollapsed: () => undefined,
    onSidebarPanelWidthChange: () => undefined,
    onCreateArticle: () => undefined,
    onCreateCategory: () => undefined,
    onRenameFile: () => undefined,
    onDeleteFile: () => undefined,
    apiAvailable: true,
    loadingProject: false,
    rootPath: 'C:/Proyectos/test_trama',
    onPickFolder: () => undefined,
    themePreference: 'dark',
    resolvedTheme: 'dark',
    onThemePreferenceChange: () => undefined,
    focusModeEnabled: false,
    focusScope: 'paragraph',
    onFocusScopeChange: () => undefined,
    ...overrides,
  }
}

describe('sidebar panels', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('renders explorer, outline, lore and settings sections with scoped trees', () => {
    act(() => {
      render(h(SidebarPanel, buildPanelProps()), container)
    })

    expect(container.textContent).toContain('Manuscript')
    expect(container.textContent).toContain('C:/Proyectos/test_trama/book')
    expect(container.textContent).toContain('Scene-001.md')
    expect(container.textContent).not.toContain('arc-general.md')

    act(() => {
      render(
        h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'outline' })),
        container,
      )
    })

    expect(container.textContent).toContain('Outline')
    expect(container.textContent).toContain('C:/Proyectos/test_trama/outline')
    expect(container.textContent).toContain('arc-general.md')
    expect(container.textContent).not.toContain('Scene-001.md')

    act(() => {
      render(
        h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'lore' })),
        container,
      )
    })

    expect(container.textContent).toContain('Lore')
    expect(container.textContent).toContain('C:/Proyectos/test_trama/lore')
    expect(container.textContent).toContain('protagonista.md')

    act(() => {
      render(
        h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'settings' })),
        container,
      )
    })

    expect(container.textContent).toContain('Settings')
    expect(container.textContent).toContain('Theme')
    expect(container.textContent).toContain('Focus Mode Scope')
    expect(container.textContent).toContain('Resolved now: Dark')
    expect(container.textContent).toContain('Panel width: 320px')
  })

  it('maps scoped file selections back to project-relative paths', () => {
    const onSelectFile = vi.fn()

    act(() => {
      render(
        h(SidebarPanel, buildPanelProps({ onSelectFile })),
        container,
      )
    })

    const rowButtons = Array.from(container.querySelectorAll('.sidebar-tree__row')) as HTMLButtonElement[]
    const fileRowButton = rowButtons.find((button) => button.textContent?.includes('Scene-001.md'))
    expect(fileRowButton).toBeTruthy()

    act(() => {
      fileRowButton?.click()
    })

    expect(onSelectFile).toHaveBeenCalledWith('book/Act-01/Chapter-01/Scene-001.md')
  })

  it('uses explorer gear button to pick a folder and does not render status text', () => {
    const onPickFolder = vi.fn()
    const onFilterQueryChange = vi.fn()

    act(() => {
      render(
        h(SidebarExplorerContent, {
          title: 'Manuscript',
          visibleFiles: ['docs/README.md'],
          selectedPath: 'docs/README.md',
          loadingDocument: false,
          onSelectFile: () => undefined,
          apiAvailable: true,
          loadingProject: false,
          scopePathLabel: 'C:/Proyectos/test_trama/book',
          filterQuery: '',
          onFilterQueryChange,
          onCreateArticle: () => undefined,
          onCreateCategory: () => undefined,
          onRenameFile: () => undefined,
          onDeleteFile: () => undefined,
          onPickFolder,
        }),
        container,
      )
    })

    const folderButton = container.querySelector('[aria-label="Select Project Folder..."]') as HTMLButtonElement
    expect(folderButton).toBeTruthy()
    expect(folderButton?.getAttribute('title')).toBe('Select Project Folder...')
    expect(container.textContent).not.toContain('Loaded document:')
    expect(container.textContent).not.toContain('Project folder selection was canceled.')

    act(() => {
      folderButton.click()
    })

    expect(onPickFolder).toHaveBeenCalledTimes(1)

    const filterInput = container.querySelector('.sidebar-filter__input') as HTMLInputElement
    expect(filterInput).toBeTruthy()
  })

  it('focuses the sidebar filter with Ctrl+F shortcut', () => {
    act(() => {
      render(
        h(SidebarExplorerContent, {
          title: 'Manuscript',
          visibleFiles: ['docs/README.md'],
          selectedPath: 'docs/README.md',
          loadingDocument: false,
          onSelectFile: () => undefined,
          apiAvailable: true,
          loadingProject: false,
          scopePathLabel: 'C:/Proyectos/test_trama/book',
          filterQuery: '',
          onFilterQueryChange: () => undefined,
          onCreateArticle: () => undefined,
          onCreateCategory: () => undefined,
          onRenameFile: () => undefined,
          onDeleteFile: () => undefined,
          onPickFolder: () => undefined,
        }),
        container,
      )
    })

    const filterInput = container.querySelector('.sidebar-filter__input') as HTMLInputElement
    expect(filterInput).toBeTruthy()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    expect(document.activeElement).toBe(filterInput)
  })

  it('shows loading and api-unavailable sidebar states', () => {
    act(() => {
      render(
        h(SidebarExplorerContent, {
          title: 'Manuscript',
          visibleFiles: ['docs/README.md'],
          selectedPath: 'docs/README.md',
          loadingDocument: false,
          onSelectFile: () => undefined,
          apiAvailable: true,
          loadingProject: true,
          scopePathLabel: 'C:/Proyectos/test_trama/book',
          filterQuery: '',
          onFilterQueryChange: () => undefined,
          onCreateArticle: () => undefined,
          onCreateCategory: () => undefined,
          onRenameFile: () => undefined,
          onDeleteFile: () => undefined,
          onPickFolder: () => undefined,
        }),
        container,
      )
    })

    expect(container.textContent).toContain('Loading project files...')

    act(() => {
      render(
        h(SidebarExplorerContent, {
          title: 'Manuscript',
          visibleFiles: ['docs/README.md'],
          selectedPath: 'docs/README.md',
          loadingDocument: false,
          onSelectFile: () => undefined,
          apiAvailable: false,
          loadingProject: false,
          scopePathLabel: 'C:/Proyectos/test_trama/book',
          filterQuery: '',
          onFilterQueryChange: () => undefined,
          onCreateArticle: () => undefined,
          onCreateCategory: () => undefined,
          onRenameFile: () => undefined,
          onDeleteFile: () => undefined,
          onPickFolder: () => undefined,
        }),
        container,
      )
    })

    expect(container.textContent).toContain('Preload API unavailable.')
  })

  it('triggers create article/category callbacks from footer actions', () => {
    const onCreateArticle = vi.fn()
    const onCreateCategory = vi.fn()

    act(() => {
      render(
        h(SidebarPanel, buildPanelProps({ onCreateArticle, onCreateCategory })),
        container,
      )
    })

    const createArticleButton = Array.from(container.querySelectorAll('.sidebar-footer-actions .editor-button')).find(
      (node) => node.textContent?.includes('+ Article'),
    ) as HTMLButtonElement
    const createCategoryButton = Array.from(container.querySelectorAll('.sidebar-footer-actions .editor-button')).find(
      (node) => node.textContent?.includes('+ Category'),
    ) as HTMLButtonElement

    expect(createArticleButton).toBeTruthy()
    expect(createCategoryButton).toBeTruthy()

    act(() => {
      createArticleButton.click()
    })

    const articleDirectoryInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Act-01/Chapter-01"]',
    ) as HTMLInputElement
    const articleNameInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Scene-001"]',
    ) as HTMLInputElement
    const articleSubmitButton = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find(
      (node) => node.textContent?.includes('Create article'),
    ) as HTMLButtonElement

    expect(articleDirectoryInput).toBeTruthy()
    expect(articleNameInput).toBeTruthy()
    expect(articleSubmitButton).toBeTruthy()

    act(() => {
      articleDirectoryInput.value = 'Act-01/Chapter-03'
      articleDirectoryInput.dispatchEvent(new Event('input', { bubbles: true }))
      articleNameInput.value = 'Scene-007'
      articleNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      articleSubmitButton.click()
    })

    expect(onCreateArticle).toHaveBeenCalledWith({
      directory: 'Act-01/Chapter-03',
      name: 'Scene-007',
    })

    act(() => {
      createCategoryButton.click()
    })

    const categoryDirectoryInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Act-01/Chapter-01"]',
    ) as HTMLInputElement
    const categoryNameInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Locations"]',
    ) as HTMLInputElement
    const categorySubmitButton = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find(
      (node) => node.textContent?.includes('Create category'),
    ) as HTMLButtonElement

    expect(categoryDirectoryInput).toBeTruthy()
    expect(categoryNameInput).toBeTruthy()
    expect(categorySubmitButton).toBeTruthy()

    act(() => {
      categoryDirectoryInput.value = 'World'
      categoryDirectoryInput.dispatchEvent(new Event('input', { bubbles: true }))
      categoryNameInput.value = 'Cities'
      categoryNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      categorySubmitButton.click()
    })

    expect(onCreateArticle).toHaveBeenCalledTimes(1)
    expect(onCreateCategory).toHaveBeenCalledWith({
      directory: 'World',
      name: 'Cities',
    })
  })

  it('triggers rename and delete callbacks from file context menu', () => {
    const onRenameFile = vi.fn()
    const onDeleteFile = vi.fn()

    act(() => {
      render(
        h(SidebarPanel, buildPanelProps({ onRenameFile, onDeleteFile })),
        container,
      )
    })

    const fileRowButton = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Scene-001.md'),
    ) as HTMLButtonElement
    expect(fileRowButton).toBeTruthy()

    act(() => {
      fileRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }))
    })

    const renameMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Rename'),
    ) as HTMLButtonElement

    expect(renameMenuItem).toBeTruthy()

    act(() => {
      renameMenuItem.click()
    })

    const renameInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Scene-002.md"]',
    ) as HTMLInputElement
    const renameConfirm = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Rename'),
    ) as HTMLButtonElement

    expect(renameInput).toBeTruthy()
    expect(renameConfirm).toBeTruthy()

    act(() => {
      renameInput.value = 'Scene-009.md'
      renameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      renameConfirm.click()
    })

    expect(onRenameFile).toHaveBeenCalledWith('book/Act-01/Chapter-01/Scene-001.md', 'Scene-009.md')

    act(() => {
      fileRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 180, clientY: 220 }))
    })

    const deleteMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Delete'),
    ) as HTMLButtonElement

    expect(deleteMenuItem).toBeTruthy()

    act(() => {
      deleteMenuItem.click()
    })

    const deleteConfirm = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Delete'),
    ) as HTMLButtonElement

    expect(deleteConfirm).toBeTruthy()

    act(() => {
      deleteConfirm.click()
    })

    expect(onDeleteFile).toHaveBeenCalledWith('book/Act-01/Chapter-01/Scene-001.md')
  })

  it('updates panel width from settings slider', () => {
    const onPanelWidthChange = vi.fn()

    act(() => {
      render(
        h(SidebarSettingsContent, {
          panelWidth: 320,
          onPanelWidthChange,
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange: () => undefined,
          focusScope: 'paragraph',
          onFocusScopeChange: () => undefined,
        }),
        container,
      )
    })

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider).toBeTruthy()

    act(() => {
      slider.value = '410'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(onPanelWidthChange).toHaveBeenCalledWith(410)
  })

  it('updates theme preference from settings buttons', () => {
    const onThemePreferenceChange = vi.fn<(preference: ThemePreference) => void>()

    act(() => {
      render(
        h(SidebarSettingsContent, {
          panelWidth: 320,
          onPanelWidthChange: () => undefined,
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange,
          focusScope: 'paragraph',
          onFocusScopeChange: () => undefined,
        }),
        container,
      )
    })

    const systemButton = Array.from(container.querySelectorAll('.theme-preference-option')).find((button) =>
      button.textContent?.includes('System'),
    ) as HTMLButtonElement

    expect(systemButton).toBeTruthy()

    act(() => {
      systemButton.click()
    })

    expect(onThemePreferenceChange).toHaveBeenCalledWith('system')
  })

  it('updates focus scope from settings select', () => {
    const onFocusScopeChange = vi.fn()

    act(() => {
      render(
        h(SidebarSettingsContent, {
          panelWidth: 320,
          onPanelWidthChange: () => undefined,
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange: () => undefined,
          focusScope: 'paragraph',
          onFocusScopeChange,
        }),
        container,
      )
    })

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select).toBeTruthy()

    act(() => {
      select.value = 'sentence'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onFocusScopeChange).toHaveBeenCalledWith('sentence')
  })

  it('auto-collapses sidebar on narrow viewport', () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 860 })

    act(() => {
      render(h(SidebarPanel, buildPanelProps()), container)
    })

    const shell = container.querySelector('.sidebar-shell') as HTMLElement
    expect(shell.className).toContain('is-collapsed')
    expect(container.textContent).not.toContain('Scene-001.md')

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
  })
})