import type { DropIndicatorPosition } from '../../drop-indicator'
import type { SidebarTreeRow } from '../../sidebar-tree-logic'

const FOLDER_ZONE_RATIO = 0.5
const EDGE_ZONE_RATIO = 0.25

export interface RowGeometry {
  path: string
  type: 'file' | 'folder'
  top: number
  height: number
}

export function calculateDropPosition(
  rows: SidebarTreeRow[],
  draggingPath: string,
  hoveredPath: string,
  clientY: number,
  rowGeometries: RowGeometry[],
): DropIndicatorPosition | null {
  const hoveredGeo = rowGeometries.find((g) => g.path === hoveredPath)
  if (!hoveredGeo) return null

  const relativeY = clientY - hoveredGeo.top
  const heightFraction = relativeY / hoveredGeo.height

  const hoveredRow = rows.find((r) => r.path === hoveredPath)
  if (!hoveredRow) return null

  const sourceRow = rows.find((r) => r.path === draggingPath)
  const isDraggingFolder = sourceRow?.type === 'folder'

  if (hoveredRow.type === 'folder') {
    // Expanded folders: the entire row means "move into this folder"
    if (hoveredRow.isExpanded) {
      return { type: 'onFolder', targetPath: hoveredRow.path }
    }
    // Collapsed folders: middle 50% = into, edges = before/after
    if (heightFraction > EDGE_ZONE_RATIO && heightFraction < 1 - EDGE_ZONE_RATIO) {
      return { type: 'onFolder', targetPath: hoveredRow.path }
    }
  }

  if (isDraggingFolder) {
    return null
  }

  const hoveredIndex = rows.findIndex((r) => r.path === hoveredPath)
  if (hoveredIndex === -1) return null

  if (heightFraction < FOLDER_ZONE_RATIO) {
    return { type: 'before', targetIndex: hoveredIndex, targetPath: hoveredRow.path }
  }

  return { type: 'after', targetIndex: hoveredIndex, targetPath: hoveredRow.path }
}
