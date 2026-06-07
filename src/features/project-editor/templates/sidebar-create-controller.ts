import type { SidebarCreateInput } from '../project-editor-types'
import type { SidebarCreateMode } from '../components/sidebar/sidebar-create-dialog.tsx'
import { TemplatesCatalog, type TemplatesCatalogSnapshot } from './templates-catalog'

export type CreateControllerSnapshot = {
  mode: SidebarCreateMode | null
  input: SidebarCreateInput
  catalog: TemplatesCatalogSnapshot
  showTemplatePicker: boolean
}

export type CreateControllerListener = (snapshot: CreateControllerSnapshot) => void

export interface CreateControllerDeps {
  getTemplatePaths: () => string[]
  isActiveSectionContent: (section: string) => boolean
  getActiveSection: () => string
  getSelectedPath: () => string | null
  getProjectRoot: () => string
}

function normalizeDirectory(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function getSelectedDirectory(selectedPath: string | null): string {
  if (!selectedPath || selectedPath.endsWith('/')) {
    return ''
  }
  const slashIndex = selectedPath.lastIndexOf('/')
  if (slashIndex < 0) {
    return ''
  }
  return selectedPath.slice(0, slashIndex)
}

function buildInitialInput(selectedPath: string | null): SidebarCreateInput {
  return {
    directory: getSelectedDirectory(selectedPath),
    name: '',
    sourceImagePath: '',
  }
}

export class SidebarCreateController {
  private deps: CreateControllerDeps
  private catalog: TemplatesCatalog
  private templatePaths: string[]
  private mode: SidebarCreateMode | null = null
  private input: SidebarCreateInput = buildInitialInput(null)
  private listeners = new Set<CreateControllerListener>()
  private catalogUnsubscribe: (() => void) | null = null

  constructor(deps: CreateControllerDeps) {
    this.deps = deps
    this.templatePaths = deps.getTemplatePaths()
    this.catalog = new TemplatesCatalog(() => this.templatePaths)
  }

  subscribe(listener: CreateControllerListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  open(mode: SidebarCreateMode): void {
    this.mode = mode
    this.input = buildInitialInput(this.deps.getSelectedPath())
    this.catalog.clearSelection()
    this.catalog.setSearchQuery('')
    this.catalogUnsubscribe = this.catalog.subscribe(() => this.notify())
    this.notify()
    if (mode === 'article') {
      void this.refreshTemplatesFromDisk()
    }
  }

  close(): void {
    this.mode = null
    this.input = { directory: '', name: '', sourceImagePath: '' }
    this.catalogUnsubscribe?.()
    this.catalogUnsubscribe = null
    this.notify()
  }

  setDirectory(value: string): void {
    this.input = { ...this.input, directory: value }
    this.notify()
  }

  setName(value: string): void {
    this.input = { ...this.input, name: value }
    this.notify()
  }

  setSourceImagePath(value: string): void {
    this.input = { ...this.input, sourceImagePath: value }
    this.notify()
  }

  async browseSourceImage(): Promise<void> {
    const response = await window.tramaApi.selectMapImage()
    if (!response.ok || !response.data.filePath) {
      return
    }
    this.setSourceImagePath(response.data.filePath)
  }

  setTemplateSearch(query: string): void {
    this.catalog.setSearchQuery(query)
  }

  selectTemplate(path: string | null): void {
    this.catalog.selectTemplate(path)
  }

  getSnapshot(): CreateControllerSnapshot {
    const activeSection = this.deps.getActiveSection()
    return {
      mode: this.mode,
      input: this.input,
      catalog: this.catalog.getSnapshot(),
      showTemplatePicker:
        this.mode === 'article' && this.deps.isActiveSectionContent(activeSection),
    }
  }

  buildSubmitPayload(): {
    mode: SidebarCreateMode
    input: SidebarCreateInput
    selectedTemplatePath: string | null
  } | null {
    if (!this.mode) {
      return null
    }

    return {
      mode: this.mode,
      input: {
        directory: normalizeDirectory(this.input.directory),
        name: this.input.name.trim(),
        sourceImagePath: this.input.sourceImagePath.trim(),
      },
      selectedTemplatePath: this.catalog.getSnapshot().selectedPath,
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  private async refreshTemplatesFromDisk(): Promise<void> {
    const projectRoot = this.deps.getProjectRoot().trim()
    if (!projectRoot || !window.tramaApi?.getTemplates) {
      return
    }

    const response = await window.tramaApi.getTemplates()
    if (!response.ok) {
      return
    }

    this.templatePaths = response.data.paths
    const selectedPath = this.catalog.getSnapshot().selectedPath
    if (selectedPath && !this.templatePaths.includes(selectedPath)) {
      this.catalog.clearSelection()
      return
    }
    this.notify()
  }
}
