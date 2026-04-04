import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { SidebarPanel } from '../src/features/project-editor/components/sidebar/sidebar-panel.tsx'
import { SidebarExplorerContent } from '../src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx'
import { SidebarSettingsContent } from '../src/features/project-editor/components/sidebar/sidebar-settings-content.tsx'

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
    apiAvailable: true,
    loadingProject: false,
    rootPath: 'C:/Proyectos/test_trama',
    onPickFolder: () => undefined,
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

    expect(container.textContent).toContain('Configuración')
    expect(container.textContent).toContain('Ancho de panel: 320px')
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
          onPickFolder,
        }),
        container,
      )
    })

    const gearButton = container.querySelector('[aria-label="Elegir carpeta del proyecto"]') as HTMLButtonElement
    expect(gearButton).toBeTruthy()
    expect(container.textContent).not.toContain('Documento cargado:')
    expect(container.textContent).not.toContain('Seleccion de carpeta cancelada.')

    act(() => {
      gearButton.click()
    })

    expect(onPickFolder).toHaveBeenCalledTimes(1)
  })

  it('updates panel width from settings slider', () => {
    const onPanelWidthChange = vi.fn()

    act(() => {
      render(
        h(SidebarSettingsContent, {
          panelWidth: 320,
          onPanelWidthChange,
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
})