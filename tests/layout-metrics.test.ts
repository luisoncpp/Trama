import { describe, expect, it } from 'vitest'

import {
  SIDEBAR_RAIL_WIDTH_PX,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
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
})
