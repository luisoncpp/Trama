import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, type VNode } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarPanel } from '../src/features/project-editor/components/sidebar/sidebar-panel.tsx'
import { SidebarExplorerContent } from '../src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx'
import { SidebarSettingsContent } from '../src/features/project-editor/components/sidebar/sidebar-settings.tsx'
import type { ThemePreference } from '../src/theme/theme-types'
import {
  buildEditorActionsSpies,
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

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
    sidebarActiveSection: 'explorer',
    sidebarPanelCollapsed: false,
    effectiveCollapsed: false,
    apiAvailable: true,
    loadingProject: false,
    rootPath: 'C:/Proyectos/test_trama',
    statusMessage: '',
    gitHistory: {
      gitAvailable: true,
      repositoryRoot: 'C:/Proyectos/test_trama/.git',
      usesParentRepository: false,
      needsInitialization: false,
      loading: false,
    },
    onImport: () => undefined,
    onImportZulu: () => undefined,
    onExportBook: (_format) => undefined,
    onExport: () => undefined,
    themePreference: 'dark',
    resolvedTheme: 'dark',
    onThemePreferenceChange: () => undefined,
    spellcheckEnabled: true,
    spellcheckLanguage: 'en-US',
    spellcheckLanguageOptions: ['en-US', 'es-ES'],
    spellcheckLanguageSelectionSupported: true,
    onSpellcheckEnabledChange: () => undefined,
    onSpellcheckLanguageChange: () => undefined,
    focusModeEnabled: false,
    focusScope: 'paragraph',
    ...overrides,
  }
}

describe('sidebar panels', () => {
  let container: HTMLDivElement

  function renderSidebar(vnode: VNode<any>, actions = buildEditorActionsSpies(), scopeRoot?: string) {
    return renderWithEditorActions(vnode, { container, actions, scopeRoot })
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('renders explorer, outline, lore and settings sections with scoped trees', () => {
    renderSidebar(h(SidebarPanel, buildPanelProps()))

    expect(container.textContent).toContain('Manuscript')
    expect(container.textContent).toContain('test_trama')
    expect(container.textContent).not.toContain('.../book')
    expect(container.textContent).toContain('Scene-001.md')
    expect(container.textContent).not.toContain('arc-general.md')

    renderSidebar(h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'outline' })))

    expect(container.textContent).toContain('Outline')
    expect(container.textContent).toContain('test_trama')
    expect(container.textContent).toContain('arc-general.md')
    expect(container.textContent).not.toContain('Scene-001.md')

    renderSidebar(h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'lore' })))

    expect(container.textContent).toContain('Lore')
    expect(container.textContent).toContain('test_trama')
    expect(container.textContent).toContain('protagonista.md')

    renderSidebar(h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'transfer' })))

    expect(container.textContent).toContain('Import / Export')
    expect(container.textContent).toContain('Import AI Content')
    expect(container.textContent).toContain('Export Book')
    expect(container.textContent).toContain('Export Files')
    expect(container.textContent).toContain('Save Snapshot')
    expect(container.textContent).toContain('Markdown (.md)')
    expect(container.textContent).toContain('HTML (.html)')
    expect(container.textContent).toContain('DOCX (.docx)')
    expect(container.textContent).toContain('EPUB (.epub)')
    expect(container.textContent).toContain('PDF (.pdf)')

    renderSidebar(h(SidebarPanel, buildPanelProps({ sidebarActiveSection: 'settings' })))

    expect(container.textContent).toContain('Settings')
    expect(container.textContent).toContain('Theme')
    expect(container.textContent).toContain('Focus Mode Scope')
    expect(container.textContent).toContain('Resolved now: Dark')
  })

  it('hides Save Snapshot when Git is unavailable', () => {
    renderSidebar(h(SidebarPanel, buildPanelProps({
      sidebarActiveSection: 'transfer',
      gitHistory: {
        gitAvailable: false,
        repositoryRoot: null,
        usesParentRepository: false,
        needsInitialization: false,
        loading: false,
      },
    })))

    expect(container.textContent).not.toContain('Save Snapshot')
  })

  it('maps scoped file selections back to project-relative paths', () => {
    const actions = buildEditorActionsSpies()

    renderSidebar(h(SidebarPanel, buildPanelProps()), actions)

    const rowButtons = Array.from(container.querySelectorAll('.sidebar-tree__row')) as HTMLButtonElement[]
    const fileRowButton = rowButtons.find((button) => button.textContent?.includes('Scene-001.md'))
    expect(fileRowButton).toBeTruthy()

    act(() => {
      fileRowButton?.click()
    })

    expect(actions.selectFile).toHaveBeenCalledWith('book/Act-01/Chapter-01/Scene-001.md')
  })

  it('uses project-root breadcrumb to pick a folder and does not render status text', () => {
    const onPickFolder = vi.fn()
    const onFilterQueryChange = vi.fn()
    const actions = buildEditorActionsSpies({ pickProjectFolder: onPickFolder })

    renderSidebar(h(SidebarExplorerContent, {
      title: 'Manuscript',
      visibleFiles: ['docs/README.md'],
      selectedPath: 'docs/README.md',
      loadingDocument: false,
      apiAvailable: true,
      loadingProject: false,
      statusMessage: '',
      projectRootPath: 'C:/Proyectos/test_trama',
      pickFolderDisabled: false,
      filterQuery: '',
      onFilterQueryChange,
    }), actions, 'book/')

    const folderButton = container.querySelector('.path-breadcrumb-trigger') as HTMLButtonElement
    expect(folderButton).toBeTruthy()
    expect(container.textContent).not.toContain('Loaded document:')
    expect(container.textContent).not.toContain('Project folder selection was canceled.')
    expect(container.querySelector('[aria-label="Select Project Folder..."]')).toBeNull()

    act(() => {
      folderButton.click()
    })

    expect(onPickFolder).toHaveBeenCalledTimes(1)

    const filterInput = container.querySelector('.sidebar-filter__input') as HTMLInputElement
    expect(filterInput).toBeTruthy()
  })

  it('does not capture Ctrl+F in the sidebar filter anymore', () => {
    renderSidebar(h(SidebarExplorerContent, {
      title: 'Manuscript',
      visibleFiles: ['docs/README.md'],
      selectedPath: 'docs/README.md',
      loadingDocument: false,
      apiAvailable: true,
      loadingProject: false,
      statusMessage: '',
      projectRootPath: 'C:/Proyectos/test_trama',
      pickFolderDisabled: false,
      filterQuery: '',
      onFilterQueryChange: () => undefined,
    }), buildEditorActionsSpies(), 'book/')

    const filterInput = container.querySelector('.sidebar-filter__input') as HTMLInputElement
    expect(filterInput).toBeTruthy()

    const before = document.activeElement
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
    })

    expect(document.activeElement).toBe(before)
    expect(document.activeElement).not.toBe(filterInput)
  })

  it('shows loading and api-unavailable sidebar states', () => {
    renderSidebar(h(SidebarExplorerContent, {
      title: 'Manuscript',
      visibleFiles: ['docs/README.md'],
      selectedPath: 'docs/README.md',
      loadingDocument: false,
      apiAvailable: true,
      loadingProject: true,
      statusMessage: '',
      projectRootPath: 'C:/Proyectos/test_trama',
      pickFolderDisabled: true,
      filterQuery: '',
      onFilterQueryChange: () => undefined,
    }), buildEditorActionsSpies(), 'book/')

    const treeEl = container.querySelector('.sidebar-tree')
    expect(treeEl).toBeTruthy()
    expect(treeEl?.classList.contains('is-loading')).toBe(true)
    expect(container.textContent).toContain('README.md')

    renderSidebar(h(SidebarExplorerContent, {
      title: 'Manuscript',
      visibleFiles: ['docs/README.md'],
      selectedPath: 'docs/README.md',
      loadingDocument: false,
      apiAvailable: false,
      loadingProject: false,
      statusMessage: '',
      projectRootPath: 'C:/Proyectos/test_trama',
      pickFolderDisabled: true,
      filterQuery: '',
      onFilterQueryChange: () => undefined,
    }), buildEditorActionsSpies(), 'book/')

    expect(container.textContent).toContain('Preload API unavailable.')
  })

  it('triggers create article/category callbacks from footer actions', async () => {
    const actions = buildEditorActionsSpies()

    renderSidebar(h(SidebarPanel, buildPanelProps()), actions)

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

    expect(actions.createArticle).toHaveBeenCalledWith({
      directory: 'Act-01/Chapter-03',
      name: 'Scene-007',
      sourceImagePath: '',
    }, null)

    const articleMenuButton = container.querySelector('.sidebar-split-button__toggle') as HTMLButtonElement
    expect(articleMenuButton).toBeTruthy()

    act(() => {
      articleMenuButton.click()
    })

    const createMapMenuItem = container.querySelector('.sidebar-split-button__menu-item') as HTMLButtonElement
    expect(createMapMenuItem).toBeTruthy()

    ;(window as unknown as { tramaApi: { selectMapImage: () => Promise<{ ok: true; data: { filePath: string } }> } }).tramaApi = {
      selectMapImage: () => Promise.resolve({ ok: true, data: { filePath: 'C:/maps/world.png' } }),
    }

    await act(async () => {
      createMapMenuItem.click()
      await Promise.resolve()
    })

    const mapDirectoryInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Act-01/Chapter-01"]',
    ) as HTMLInputElement
    const mapNameInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="World Map"]',
    ) as HTMLInputElement
    const browseButton = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Browse...'),
    ) as HTMLButtonElement
    const mapSubmitButton = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Create map'),
    ) as HTMLButtonElement

    expect(mapDirectoryInput).toBeTruthy()
    expect(mapNameInput).toBeTruthy()
    expect(browseButton).toBeTruthy()
    expect(mapSubmitButton).toBeTruthy()

    act(() => {
      mapDirectoryInput.value = 'World'
      mapDirectoryInput.dispatchEvent(new Event('input', { bubbles: true }))
      mapNameInput.value = 'Realm Atlas'
      mapNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      browseButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const selectedMapImageInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="No image selected"]',
    ) as HTMLInputElement

    expect(selectedMapImageInput.value).toBe('C:/maps/world.png')

    await act(async () => {
      mapSubmitButton.click()

      expect(actions.createMap).toHaveBeenCalledWith({
        directory: 'World',
        name: 'Realm Atlas',
        sourceImagePath: 'C:/maps/world.png',
      })

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

    expect(actions.createArticle).toHaveBeenCalledTimes(1)
    expect(actions.createMap).toHaveBeenCalledTimes(1)
    expect(actions.createCategory).toHaveBeenCalledWith({
      directory: 'World',
      name: 'Cities',
      sourceImagePath: '',
    })
  })

  it('loads templates from disk when opening the article dialog', async () => {
    ;(window as unknown as {
      tramaApi: {
        getTemplates: () => Promise<{ ok: true; data: { paths: string[] } }>
      }
    }).tramaApi = {
      getTemplates: async () => ({
        ok: true,
        data: {
          paths: [
            'templates/character.md',
            'templates/newly-added-template.md',
          ],
        },
      }),
    }

    renderSidebar(h(SidebarPanel, buildPanelProps()))

    const createArticleButton = Array.from(container.querySelectorAll('.sidebar-footer-actions .editor-button')).find(
      (node) => node.textContent?.includes('+ Article'),
    ) as HTMLButtonElement

    await act(async () => {
      createArticleButton.click()
      await Promise.resolve()
    })

    const templateInput = container.querySelector('.template-picker__input') as HTMLInputElement
    expect(templateInput).toBeTruthy()

    await act(async () => {
      templateInput.focus()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('newly-added-template')
  })

  it('triggers edit tags, rename and delete callbacks from file context menu', async () => {
    const actions = buildEditorActionsSpies()

    const readDocumentMock = vi.fn(async () => ({
      ok: true,
      data: {
        path: 'book/Act-01/Chapter-01/Scene-001.md',
        content: '# Scene',
        meta: { tags: ['magic', 'north'] },
        linkedImagePaths: ['res/book_act_01_chapter_01_scene_001_0.png'],
      },
    }))

    ;(window as unknown as { tramaApi: { readDocument: typeof readDocumentMock } }).tramaApi = {
      readDocument: readDocumentMock,
    }

    renderSidebar(h(SidebarPanel, buildPanelProps()), actions)

    const fileRowButton = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Scene-001.md'),
    ) as HTMLButtonElement
    expect(fileRowButton).toBeTruthy()

    act(() => {
      fileRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }))
    })

    const editTagsMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Edit tags'),
    ) as HTMLButtonElement
    expect(editTagsMenuItem).toBeTruthy()

    await act(async () => {
      editTagsMenuItem.click()
      await Promise.resolve()
    })

    expect(readDocumentMock).toHaveBeenCalledWith({ path: 'book/Act-01/Chapter-01/Scene-001.md' })

    const tagsInput = document.querySelector(
      '.sidebar-create-dialog textarea',
    ) as HTMLTextAreaElement
    const saveTagsConfirm = Array.from(document.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Save Tags'),
    ) as HTMLButtonElement

    expect(tagsInput).toBeTruthy()
    expect(saveTagsConfirm).toBeTruthy()
    expect(tagsInput.value).toContain('magic')

    act(() => {
      tagsInput.value = 'magic, north, magic, selene valeria'
      tagsInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      saveTagsConfirm.click()
    })

    expect(actions.editFileTags).toHaveBeenCalledWith('book/Act-01/Chapter-01/Scene-001.md', ['magic', 'north', 'selene valeria'])

    act(() => {
      fileRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 160, clientY: 180 }))
    })

    const renameMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Rename'),
    ) as HTMLButtonElement

    expect(renameMenuItem).toBeTruthy()

    act(() => {
      renameMenuItem.click()
    })

    const renameInput = document.querySelector(
      '.sidebar-create-dialog input[placeholder="Scene-002.md"]',
    ) as HTMLInputElement
    const renameConfirm = Array.from(document.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
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

    expect(actions.renameFile).toHaveBeenCalledWith({ path: 'book/Act-01/Chapter-01/Scene-001.md', newName: 'Scene-009.md' })

    act(() => {
      fileRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 180, clientY: 220 }))
    })

    const deleteMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Delete'),
    ) as HTMLButtonElement

    expect(deleteMenuItem).toBeTruthy()

    await act(async () => {
      deleteMenuItem.click()
      await Promise.resolve()
    })

    const deleteConfirm = Array.from(document.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Delete'),
    ) as HTMLButtonElement
    const deleteImagesCheckbox = document.querySelector('.sidebar-create-dialog input[type="checkbox"]') as HTMLInputElement

    expect(deleteConfirm).toBeTruthy()

    if (deleteImagesCheckbox) {
      act(() => {
        deleteImagesCheckbox.checked = true
        deleteImagesCheckbox.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    act(() => {
      deleteConfirm.click()
    })

    expect(actions.deleteFile).toHaveBeenCalledWith(
      'book/Act-01/Chapter-01/Scene-001.md',
      deleteImagesCheckbox ? { deleteAssociatedImages: true } : undefined,
    )
  })

  it('triggers rename and delete callbacks from folder context menu', () => {
    const actions = buildEditorActionsSpies()

    renderSidebar(h(SidebarPanel, buildPanelProps()), actions)

    const folderRowButton = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Chapter-01'),
    ) as HTMLButtonElement
    expect(folderRowButton).toBeTruthy()

    act(() => {
      folderRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }))
    })

    const renameMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Rename'),
    ) as HTMLButtonElement

    expect(renameMenuItem).toBeTruthy()

    act(() => {
      renameMenuItem.click()
    })

    const renameInput = container.querySelector(
      '.sidebar-create-dialog input[placeholder="Chapter-02"]',
    ) as HTMLInputElement
    const renameConfirm = Array.from(container.querySelectorAll('.sidebar-create-dialog .editor-button')).find((node) =>
      node.textContent?.includes('Rename'),
    ) as HTMLButtonElement

    expect(renameInput).toBeTruthy()
    expect(renameConfirm).toBeTruthy()

    act(() => {
      renameInput.value = 'Chapter-09'
      renameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      renameConfirm.click()
    })

    expect(actions.renameFolder).toHaveBeenCalledWith({ path: 'book/Act-01/Chapter-01', newName: 'Chapter-09' })

    act(() => {
      folderRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 160, clientY: 180 }))
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

    expect(actions.deleteFolder).toHaveBeenCalledWith('book/Act-01/Chapter-01')
  })

  it('updates theme preference from settings buttons', () => {
    const onThemePreferenceChange = vi.fn<(preference: ThemePreference) => void>()
    const actions = buildEditorActionsSpies()

    act(() => {
      renderWithEditorActions(
        h(SidebarSettingsContent, {
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange,
          spellcheckEnabled: true,
          spellcheckLanguage: 'en-US',
          spellcheckLanguageOptions: ['en-US', 'es-ES'],
          spellcheckLanguageSelectionSupported: true,
          onSpellcheckEnabledChange: () => undefined,
          onSpellcheckLanguageChange: () => undefined,
          focusScope: 'paragraph',
        }),
        { container, actions },
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
    const actions = buildEditorActionsSpies()

    act(() => {
      renderWithEditorActions(
        h(SidebarSettingsContent, {
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange: () => undefined,
          spellcheckEnabled: true,
          spellcheckLanguage: 'en-US',
          spellcheckLanguageOptions: ['en-US', 'es-ES'],
          spellcheckLanguageSelectionSupported: true,
          onSpellcheckEnabledChange: () => undefined,
          onSpellcheckLanguageChange: () => undefined,
          focusScope: 'paragraph',
        }),
        { container, actions },
      )
    })

    const selects = container.querySelectorAll('select')
    const select = selects[1] as HTMLSelectElement
    expect(select).toBeTruthy()

    act(() => {
      select.value = 'sentence'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(actions.setFocusScope).toHaveBeenCalledWith('sentence')
  })

  it('updates spellcheck enabled state from settings checkbox', () => {
    const onSpellcheckEnabledChange = vi.fn()
    const actions = buildEditorActionsSpies()

    act(() => {
      renderWithEditorActions(
        h(SidebarSettingsContent, {
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange: () => undefined,
          spellcheckEnabled: true,
          spellcheckLanguage: 'en-US',
          spellcheckLanguageOptions: ['en-US', 'es-ES'],
          spellcheckLanguageSelectionSupported: true,
          onSpellcheckEnabledChange,
          onSpellcheckLanguageChange: () => undefined,
          focusScope: 'paragraph',
        }),
        { container, actions },
      )
    })

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox).toBeTruthy()

    act(() => {
      checkbox.checked = false
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onSpellcheckEnabledChange).toHaveBeenCalledWith(false)
  })

  it('updates spellcheck language from settings select', () => {
    const onSpellcheckLanguageChange = vi.fn()
    const actions = buildEditorActionsSpies()

    act(() => {
      renderWithEditorActions(
        h(SidebarSettingsContent, {
          themePreference: 'dark',
          resolvedTheme: 'dark',
          onThemePreferenceChange: () => undefined,
          spellcheckEnabled: true,
          spellcheckLanguage: 'en-US',
          spellcheckLanguageOptions: ['en-US', 'es-ES'],
          spellcheckLanguageSelectionSupported: true,
          onSpellcheckEnabledChange: () => undefined,
          onSpellcheckLanguageChange,
          focusScope: 'paragraph',
        }),
        { container, actions },
      )
    })

    const selects = container.querySelectorAll('select')
    const spellcheckSelect = selects[0] as HTMLSelectElement
    expect(spellcheckSelect).toBeTruthy()

    act(() => {
      spellcheckSelect.value = 'es-ES'
      spellcheckSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onSpellcheckLanguageChange).toHaveBeenCalledWith('es-ES')
  })

  it('hides panel body when effectiveCollapsed is true', () => {
    renderSidebar(h(SidebarPanel, buildPanelProps({ effectiveCollapsed: true })))

    const shell = container.querySelector('.sidebar-shell') as HTMLElement
    expect(shell.className).toContain('is-collapsed')
    expect(container.textContent).not.toContain('Scene-001.md')
  })

  it('triggers reveal callback from file context menu', () => {
    const actions = buildEditorActionsSpies()

    renderSidebar(h(SidebarPanel, buildPanelProps()), actions)

    const fileRowButton = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Scene-001.md'),
    ) as HTMLButtonElement
    expect(fileRowButton).toBeTruthy()

    act(() => {
      fileRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }))
    })

    const revealMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Reveal in file explorer') || node.textContent?.includes('Reveal in Finder')
    ) as HTMLButtonElement
    expect(revealMenuItem).toBeTruthy()

    act(() => {
      revealMenuItem.click()
    })

    expect(actions.revealInFileManager).toHaveBeenCalledWith('book/Act-01/Chapter-01/Scene-001.md')
  })

  it('triggers reveal callback from folder context menu', () => {
    const actions = buildEditorActionsSpies()

    renderSidebar(h(SidebarPanel, buildPanelProps()), actions)

    const folderRowButton = Array.from(container.querySelectorAll('.sidebar-tree__row')).find((node) =>
      node.textContent?.includes('Chapter-01'),
    ) as HTMLButtonElement
    expect(folderRowButton).toBeTruthy()

    act(() => {
      folderRowButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }))
    })

    const revealMenuItem = Array.from(container.querySelectorAll('.sidebar-context-menu__item')).find((node) =>
      node.textContent?.includes('Reveal in file explorer') || node.textContent?.includes('Reveal in Finder')
    ) as HTMLButtonElement
    expect(revealMenuItem).toBeTruthy()

    act(() => {
      revealMenuItem.click()
    })

    expect(actions.revealInFileManager).toHaveBeenCalledWith('book/Act-01/Chapter-01')
  })
})

