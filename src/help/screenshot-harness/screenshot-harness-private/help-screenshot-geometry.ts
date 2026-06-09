import type { CaptureRegion } from '../../help-screenshot-harness-types'

export function computeBoundingRegion(elements: Element[], padding = 16): CaptureRegion {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    minX = Math.min(minX, rect.left)
    minY = Math.min(minY, rect.top)
    maxX = Math.max(maxX, rect.right)
    maxY = Math.max(maxY, rect.bottom)
  }

  const x = Math.max(0, Math.floor(minX - padding))
  const y = Math.max(0, Math.floor(minY - padding))
  const width = Math.ceil(maxX - minX + padding * 2)
  const height = Math.ceil(maxY - minY + padding * 2)

  return { x, y, width, height }
}

/** Crop around the lore sidebar tree, target row, and open context menu. */
export function computeSidebarContextMenuRegion(row: Element, menu: Element): CaptureRegion {
  const tree = document.querySelector('.sidebar-tree')
  const treeRect = tree?.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const padding = 12

  const left = (treeRect?.left ?? rowRect.left) - padding
  const top = Math.min(treeRect?.top ?? rowRect.top, rowRect.top - 56, menuRect.top) - padding
  const right = Math.max(menuRect.right, rowRect.right, treeRect?.right ?? rowRect.right) + padding
  const bottom = Math.max(menuRect.bottom, rowRect.bottom) + padding + 40

  return {
    x: Math.max(0, Math.floor(left)),
    y: Math.max(0, Math.floor(top)),
    width: Math.ceil(right - left),
    height: Math.ceil(bottom - top),
  }
}

export function computeEditTagsModalRegion(modal: Element): CaptureRegion {
  const dialog = modal.querySelector('.sidebar-create-dialog[aria-label="Edit Tags"]')
    ?? modal.querySelector('.sidebar-create-dialog')
  if (!dialog) {
    throw new Error('Edit Tags dialog element not found')
  }

  return computeBoundingRegion([dialog], 12)
}
