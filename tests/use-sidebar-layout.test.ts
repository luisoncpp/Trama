import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'

import { useSidebarLayout } from '../src/features/project-editor/layout/use-sidebar-layout'
import { SIDEBAR_RAIL_WIDTH_PX } from '../src/features/project-editor/layout/layout-metrics'

type HookState = ReturnType<typeof useSidebarLayout>

function createHookHarness(
  props: Parameters<typeof useSidebarLayout>[0],
  onState: (state: HookState) => void,
) {
  return function HookHarness() {
    const state = useSidebarLayout(props)
    onState(state)
    return null
  }
}

describe('useSidebarLayout', () => {
  let container: HTMLDivElement
  let latestState: HookState | null
  let originalInnerWidth: number

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    latestState = null
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    document.body.removeChild(container)
  })

  it('collapses when the persisted sidebar state is collapsed', () => {
    const Harness = createHookHarness({ sidebarPanelCollapsed: true, sidebarPanelWidth: 320 }, (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    expect(latestState?.effectiveCollapsed).toBe(true)
    expect(latestState?.sidebarWidthPx).toBe(SIDEBAR_RAIL_WIDTH_PX)
  })

  it('collapses on narrow viewports even when the persisted state is expanded', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 860 })
    const Harness = createHookHarness({ sidebarPanelCollapsed: false, sidebarPanelWidth: 320 }, (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    expect(latestState?.effectiveCollapsed).toBe(true)
    expect(latestState?.sidebarWidthPx).toBe(SIDEBAR_RAIL_WIDTH_PX)
  })

  it('uses the configured width on wide viewports when expanded', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    const Harness = createHookHarness({ sidebarPanelCollapsed: false, sidebarPanelWidth: 320 }, (state) => {
      latestState = state
    })

    act(() => {
      render(h(Harness, {}), container)
    })

    expect(latestState?.effectiveCollapsed).toBe(false)
    expect(latestState?.sidebarWidthPx).toBe(320)
  })
})
