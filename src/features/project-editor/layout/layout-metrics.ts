export const SIDEBAR_RAIL_WIDTH_PX = 72
export const SIDEBAR_DEFAULT_WIDTH_PX = 300
export const SIDEBAR_MIN_WIDTH_PX = 260
export const SIDEBAR_MAX_WIDTH_PX = 460
export const SIDEBAR_RESPONSIVE_BREAKPOINT_PX = 900
export const SIDEBAR_RESIZE_HANDLE_WIDTH_PX = 12
export const SPLIT_RATIO_MIN = 0.2
export const SPLIT_RATIO_MAX = 0.8
export const SPLIT_DIVIDER_WIDTH_PX = 12

export function clampSplitRatio(value: number): number {
  return Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, value))
}

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH_PX, Math.max(SIDEBAR_MIN_WIDTH_PX, Math.round(width)))
}

export function sidebarWidthPx(effectiveCollapsed: boolean, panelWidth: number): number {
  return effectiveCollapsed ? SIDEBAR_RAIL_WIDTH_PX : panelWidth
}
