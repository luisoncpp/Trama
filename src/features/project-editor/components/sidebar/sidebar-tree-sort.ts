import type { SidebarTreeRow } from './sidebar-tree-logic'

export function sortTreeRowsByOrder(
  rows: SidebarTreeRow[],
  corkboardOrder: Record<string, string[]>,
): SidebarTreeRow[] {
  if (Object.keys(corkboardOrder).length === 0) return rows

  const result = [...rows]

  for (const [folderKey, order] of Object.entries(corkboardOrder)) {
    if (!order || order.length === 0) continue

    if (folderKey === '') {
      reorderDirectChildFiles(result, -1, 0, order)
      continue
    }

    const folderIdx = result.findIndex((r) => r.path === folderKey && r.type === 'folder')
    if (folderIdx === -1 || !result[folderIdx].isExpanded) continue

    const folderDepth = result[folderIdx].depth
    reorderDirectChildFiles(result, folderIdx, folderDepth + 1, order)
  }

  return result
}

function reorderDirectChildFiles(
  rows: SidebarTreeRow[],
  parentIdx: number,
  childDepth: number,
  order: string[],
): void {
  const range = findChildRange(rows, parentIdx, childDepth)
  if (!range) return

  const { fileIndices } = range
  if (fileIndices.length === 0) return

  const fileRows = fileIndices.map((idx) => rows[idx])
  const folderKey = parentIdx >= 0 ? rows[parentIdx].path : ''

  const usedPaths = new Set<string>()
  const ordered: SidebarTreeRow[] = []

  for (const id of order) {
    const row = resolveIdToRow(id, fileRows, folderKey)
    if (row && !usedPaths.has(row.path)) {
      ordered.push(row)
      usedPaths.add(row.path)
    }
  }

  const remaining = fileRows.filter((r) => !usedPaths.has(r.path))
  remaining.sort((a, b) => a.name.localeCompare(b.name))

  const allOrdered = [...ordered, ...remaining]

  const insertPos = findFileInsertPosition(rows, range.start, childDepth)
  for (let i = 0; i < allOrdered.length; i++) {
    rows[insertPos + i] = allOrdered[i]
  }
}

function findChildRange(
  rows: SidebarTreeRow[],
  parentIdx: number,
  childDepth: number,
): { start: number; fileIndices: number[] } | null {
  const start = parentIdx + 1
  if (start >= rows.length) return null
  if (rows[start].depth !== childDepth) return null

  const fileIndices: number[] = []
  let end = start

  while (end < rows.length && rows[end].depth >= childDepth) {
    if (rows[end].depth === childDepth && rows[end].type === 'file') {
      fileIndices.push(end)
    }
    end++
  }

  if (end === start) return null
  return { start, fileIndices }
}

function findFileInsertPosition(
  rows: SidebarTreeRow[],
  start: number,
  childDepth: number,
): number {
  let pos = start
  while (pos < rows.length && rows[pos].depth >= childDepth) {
    if (rows[pos].depth === childDepth && rows[pos].type === 'file') {
      return pos
    }
    pos++
  }
  return start
}

function resolveIdToRow(id: string, rows: SidebarTreeRow[], parentKey: string): SidebarTreeRow | undefined {
  const fullPath = parentKey ? `${parentKey}/${id}` : id
  const byPath = rows.find((r) => r.path === fullPath)
  if (byPath) return byPath
  return rows.find((r) => r.name === id)
}
