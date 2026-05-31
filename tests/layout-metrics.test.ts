import { describe, expect, it } from 'vitest'

import {
  SIDEBAR_MAX_WIDTH_PX,
  SIDEBAR_MIN_WIDTH_PX,
  SIDEBAR_RAIL_WIDTH_PX,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
  clampSidebarWidth,
  clampSplitRatio,
  sidebarWidthPx,
} from '../src/features/project-editor/layout/layout-metrics'

describe('layout metrics', () => {
  it('returns rail width when the sidebar is collapsed', () => {
    expect(sidebarWidthPx(true, 300)).toBe(SIDEBAR_RAIL_WIDTH_PX)
  })

  it('returns panel width when the sidebar is expanded', () => {
    expect(sidebarWidthPx(false, 300)).toBe(300)
  })

  it('clamps split ratios to the configured bounds', () => {
    expect(clampSplitRatio(SPLIT_RATIO_MIN - 0.01)).toBe(SPLIT_RATIO_MIN)
    expect(clampSplitRatio(0.5)).toBe(0.5)
    expect(clampSplitRatio(SPLIT_RATIO_MAX + 0.01)).toBe(SPLIT_RATIO_MAX)
  })

  it('clamps sidebar widths to the configured bounds', () => {
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH_PX - 1)).toBe(SIDEBAR_MIN_WIDTH_PX)
    expect(clampSidebarWidth(320.6)).toBe(321)
    expect(clampSidebarWidth(SIDEBAR_MAX_WIDTH_PX + 1)).toBe(SIDEBAR_MAX_WIDTH_PX)
  })
})
