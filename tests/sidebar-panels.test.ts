import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { FileListPanel } from '../src/features/project-editor/components/file-list-panel.tsx'
import { SidebarExplorerContent } from '../src/features/project-editor/components/sidebar-explorer-content.tsx'
import { SidebarSettingsContent } from '../src/features/project-editor/components/sidebar-settings-content.tsx'

function buildPanelProps(
  overrides: Partial<Parameters<typeof FileListPanel>[0]> = {},
): Parameters<typeof FileListPanel>[0] {
  return {
    visibleFiles: ['docs/README.md'],
    selectedPath: 'docs/README.md',
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

  it('renders explorer, settings, and planner sections from the shell', () => {
    act(() => {
      render(h(FileListPanel, buildPanelProps()), container)
    })

    expect(container.textContent).toContain('Proyecto')
    expect(container.textContent).toContain('C:/Proyectos/test_trama')

    act(() => {
      render(
        h(FileListPanel, buildPanelProps({ sidebarActiveSection: 'settings' })),
        container,
      )
    })

    expect(container.textContent).toContain('Configuración')
    expect(container.textContent).toContain('Ancho de panel: 320px')

    act(() => {
      render(
        h(FileListPanel, buildPanelProps({ sidebarActiveSection: 'planner' })),
        container,
      )
    })

    expect(container.textContent).toContain('Planner estara disponible en una fase posterior.')
  })

  it('uses explorer gear button to pick a folder and does not render status text', () => {
    const onPickFolder = vi.fn()

    act(() => {
      render(
        h(SidebarExplorerContent, {
          visibleFiles: ['docs/README.md'],
          selectedPath: 'docs/README.md',
          loadingDocument: false,
          onSelectFile: () => undefined,
          apiAvailable: true,
          loadingProject: false,
          rootPath: 'C:/Proyectos/test_trama',
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