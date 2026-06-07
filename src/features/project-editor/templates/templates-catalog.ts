import type { FilteredTemplate } from './templates-catalog-private/filter-template-paths'
import { filterTemplatePaths } from './templates-catalog-private/filter-template-paths'

export type TemplatesCatalogSnapshot = {
  query: string
  selectedPath: string | null
  filteredPaths: FilteredTemplate[]
}

export type TemplatesCatalogListener = (snapshot: TemplatesCatalogSnapshot) => void

export class TemplatesCatalog {
  private getTemplatePaths: () => string[]
  private query = ''
  private selectedPath: string | null = null
  private listeners = new Set<TemplatesCatalogListener>()

  constructor(getTemplatePaths: () => string[]) {
    this.getTemplatePaths = getTemplatePaths
  }

  subscribe(listener: TemplatesCatalogListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setSearchQuery(value: string): void {
    this.query = value
    this.notify()
  }

  selectTemplate(path: string | null): void {
    this.selectedPath = path
    this.notify()
  }

  clearSelection(): void {
    this.selectedPath = null
    this.notify()
  }

  getSnapshot(): TemplatesCatalogSnapshot {
    return {
      query: this.query,
      selectedPath: this.selectedPath,
      filteredPaths: filterTemplatePaths(this.getTemplatePaths(), this.query),
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }
}
