// @Architecture(descriptionShort="Viewport clamp math for fixed context menus")
export interface ContextMenuPoint {
  x: number
  y: number
}

export interface ContextMenuViewport {
  width: number
  height: number
}

/** Keep a fixed-position menu inside the viewport with a small edge padding. */
export function clampContextMenuPosition(
  preferred: ContextMenuPoint,
  menuSize: { width: number; height: number },
  viewport: ContextMenuViewport,
  padding = 8,
): ContextMenuPoint {
  const maxX = Math.max(padding, viewport.width - menuSize.width - padding)
  const maxY = Math.max(padding, viewport.height - menuSize.height - padding)
  return {
    x: Math.min(Math.max(preferred.x, padding), maxX),
    y: Math.min(Math.max(preferred.y, padding), maxY),
  }
}
