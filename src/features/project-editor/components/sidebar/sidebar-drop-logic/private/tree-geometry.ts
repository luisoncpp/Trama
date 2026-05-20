import type { RowGeometry } from './drop-position'
import type { SidebarTreeRow } from '../../sidebar-tree-logic'

export function buildRowGeometries(container: HTMLDivElement, rows: SidebarTreeRow[]): RowGeometry[] {
  const elements = container.querySelectorAll<HTMLButtonElement>('[data-sidebar-row-index]')
  const geometries: RowGeometry[] = []
  for (const el of Array.from(elements)) {
    const path = el.getAttribute('data-path')
    const indexAttr = el.getAttribute('data-sidebar-row-index')
    if (!path || indexAttr === null) continue
    const index = parseInt(indexAttr, 10)
    const row = rows[index]
    if (!row || row.path !== path) continue
    const rect = el.getBoundingClientRect()
    geometries.push({ path: row.path, type: row.type, top: rect.top, height: rect.height })
  }
  return geometries
}
