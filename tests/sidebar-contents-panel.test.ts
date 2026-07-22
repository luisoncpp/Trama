import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarContentsContent } from '../src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-contents-content.tsx'
import {
  DocumentContentsProvider,
  type DocumentContentsState,
} from '../src/features/project-editor/components/sidebar/document-contents-context.tsx'
import { SidebarPanel } from '../src/features/project-editor/components/sidebar/sidebar-panel/index.ts'
import type { SidebarProjectState } from '../src/features/project-editor/components/sidebar/sidebar-state-context.tsx'
import {
  buildEditorActionsSpies,
  renderWithEditorActions,
} from './helpers/editor-actions-test-helper.ts'

function buildContentsState(overrides: Partial<DocumentContentsState> = {}): DocumentContentsState {
  return {
    editorValue: '',
    documentType: undefined,
    selectedPath: 'book/Act-01/Scene-001.md',
    ...overrides,
  }
}

function buildPanelProps(
  overrides: Partial<Parameters<typeof SidebarPanel>[0]> = {},
): Parameters<typeof SidebarPanel>[0] {
  return {
    effectiveCollapsed: false,
    onImport: () => undefined,
    onImportZulu: () => undefined,
    onExportBook: (_format) => undefined,
    onExport: () => undefined,
    onCountWords: () => undefined,
    themePreference: 'dark',
    resolvedTheme: 'dark',
    onThemePreferenceChange: () => undefined,
    spellcheckEnabled: true,
    spellcheckLanguage: 'en-US',
    spellcheckLanguageOptions: ['en-US', 'es-ES'],
    spellcheckLanguageSelectionSupported: true,
    onSpellcheckEnabledChange: () => undefined,
    onSpellcheckLanguageChange: () => undefined,
    ...overrides,
  }
}

function queryRows(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('.sidebar-contents__row'))
}

describe('sidebar contents panel', () => {
  let container: HTMLDivElement

  function renderContents(
    contentsState: DocumentContentsState,
    actions = buildEditorActionsSpies(),
    sidebarState?: Partial<SidebarProjectState>,
  ) {
    return renderWithEditorActions(
      h(DocumentContentsProvider, { value: contentsState, children: h(SidebarContentsContent, {}) }),
      { container, actions, sidebarState },
    )
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('lists headings in document order with level indentation classes and full-text tooltips', () => {
    const longTitle = 'A very long chapter title that will overflow the narrow sidebar row width'
    const markdown = ['# Part One', 'Intro.', '## Chapter 1', `### ${longTitle}`, '## Chapter 2'].join('\n')

    renderContents(buildContentsState({ editorValue: markdown }))

    const rows = queryRows(container)
    expect(rows.map((row) => row.textContent)).toEqual(['Part One', 'Chapter 1', longTitle, 'Chapter 2'])
    expect(rows[0].classList.contains('sidebar-contents__row--h1')).toBe(true)
    expect(rows[1].classList.contains('sidebar-contents__row--h2')).toBe(true)
    expect(rows[2].classList.contains('sidebar-contents__row--h3')).toBe(true)
    expect(rows[3].classList.contains('sidebar-contents__row--h2')).toBe(true)
    expect(rows[2].getAttribute('title')).toBe(longTitle)
  })

  it('dispatches revealDocumentHeading with the heading ordinal, level, and text on click', () => {
    const actions = buildEditorActionsSpies()
    renderContents(buildContentsState({ editorValue: '# Alpha\n\nBody.\n\n## Beta\n\n### Gamma' }), actions)

    const rows = queryRows(container)
    act(() => {
      rows[1].click()
    })

    expect(actions.revealDocumentHeading).toHaveBeenCalledWith({ ordinal: 1, level: 2, text: 'Beta' })
  })

  it('keeps duplicate heading texts independently addressable by ordinal', () => {
    const actions = buildEditorActionsSpies()
    renderContents(buildContentsState({ editorValue: '## Repeat\n\nFirst.\n\n## Repeat\n\nSecond.' }), actions)

    const rows = queryRows(container)
    expect(rows).toHaveLength(2)
    act(() => {
      rows[1].click()
    })

    expect(actions.revealDocumentHeading).toHaveBeenCalledWith({ ordinal: 1, level: 2, text: 'Repeat' })
  })

  it('refreshes the list when the editor value changes', () => {
    renderContents(buildContentsState({ editorValue: '# One' }))
    expect(queryRows(container).map((row) => row.textContent)).toEqual(['One'])

    renderContents(buildContentsState({ editorValue: '# One\n\n## Two' }))
    expect(queryRows(container).map((row) => row.textContent)).toEqual(['One', 'Two'])
  })

  it('shows the empty state when the document has no items', () => {
    renderContents(buildContentsState({ editorValue: 'Just prose.\nMore prose.' }))

    expect(container.textContent).toContain('No items in document contents.')
    expect(queryRows(container)).toHaveLength(0)
  })

  it('renders page breaks and spacers alongside headings with icons and toggles', () => {
    const markdown = [
      '# Intro',
      '<!-- trama:pagebreak -->',
      '<!-- trama:spacer lines=2 -->',
      '## Chapter 1',
    ].join('\n')

    renderContents(buildContentsState({ editorValue: markdown }))

    const rows = queryRows(container)
    expect(rows.map((row) => row.textContent)).toEqual(['Intro', '⎘Page Break', '↕Spacer (2 lines)', 'Chapter 1'])
    expect(rows[1].classList.contains('sidebar-contents__row--pagebreak')).toBe(true)
    expect(rows[2].classList.contains('sidebar-contents__row--spacer')).toBe(true)
  })

  it('filters page breaks or spacers when toggled', () => {
    const markdown = [
      '# Intro',
      '<!-- trama:pagebreak -->',
      '<!-- trama:spacer lines=2 -->',
      '## Chapter 1',
    ].join('\n')

    renderContents(buildContentsState({ editorValue: markdown }))

    const toggleButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.sidebar-contents__toggle'))
    expect(toggleButtons).toHaveLength(2)

    // Toggle Page breaks off
    act(() => {
      toggleButtons[0].click()
    })

    expect(queryRows(container).map((row) => row.textContent)).toEqual(['Intro', '↕Spacer (2 lines)', 'Chapter 1'])

    // Toggle Spacers off
    act(() => {
      toggleButtons[1].click()
    })

    expect(queryRows(container).map((row) => row.textContent)).toEqual(['Intro', 'Chapter 1'])
  })

  it('shows the unavailable state for map documents even when the body has headings', () => {
    renderContents(buildContentsState({ documentType: 'map', editorValue: '# Hidden heading' }))

    expect(container.textContent).toContain('Contents is not available for this document type.')
    expect(queryRows(container)).toHaveLength(0)
  })

  it('shows the unavailable state for relationships documents', () => {
    renderContents(buildContentsState({ documentType: 'relationships', editorValue: '# Hidden heading' }))

    expect(container.textContent).toContain('Contents is not available for this document type.')
    expect(queryRows(container)).toHaveLength(0)
  })

  it('renders a neutral blank state when no document is open', () => {
    renderContents(buildContentsState({ selectedPath: null, editorValue: '' }))

    expect(container.textContent).toContain('Table of contents')
    expect(queryRows(container)).toHaveLength(0)
    expect(container.textContent).not.toContain('No headings in this document.')
    expect(container.textContent).not.toContain('not available')
  })

  it('renders the contents body inside the sidebar panel when the contents section is active', () => {
    renderWithEditorActions(
      h(DocumentContentsProvider, {
        value: buildContentsState({ editorValue: '# Alpha\n\n## Beta' }),
        children: h(SidebarPanel, buildPanelProps()),
      }),
      { container, sidebarState: { sidebarActiveSection: 'contents' } },
    )

    expect(queryRows(container).map((row) => row.textContent)).toEqual(['Alpha', 'Beta'])
    const railItem = container.querySelector('[aria-label*="Table of contents"]') as HTMLButtonElement
    expect(railItem).toBeTruthy()
    expect(railItem.className).toContain('is-active')
  })

  it('selects the contents section from the rail and includes a separator above contents', () => {
    const actions = buildEditorActionsSpies()
    renderWithEditorActions(
      h(DocumentContentsProvider, {
        value: buildContentsState(),
        children: h(SidebarPanel, buildPanelProps()),
      }),
      { container, actions },
    )

    const separator = container.querySelector('.sidebar-rail__separator')
    expect(separator).toBeTruthy()

    const railItem = container.querySelector('[aria-label*="Table of contents"]') as HTMLButtonElement
    expect(railItem).toBeTruthy()
    act(() => {
      railItem.click()
    })

    expect(actions.setSidebarSection).toHaveBeenCalledWith('contents')
  })
})
