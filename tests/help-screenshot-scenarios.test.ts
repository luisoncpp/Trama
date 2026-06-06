import { describe, expect, it } from 'vitest'
import {
  computeBoundingRegion,
  computeEditTagsModalRegion,
  computeSidebarContextMenuRegion,
} from '../src/help/help-screenshot-scenario-wiki-tags'
import {
  HELP_SCREENSHOT_SCENARIO_IDS,
  HELP_SCREENSHOT_SCENARIOS,
} from '../src/help/help-screenshot-scenarios'

function mockRect(element: HTMLElement, rect: DOMRectInit): void {
  element.getBoundingClientRect = () => ({
    x: rect.x ?? 0,
    y: rect.y ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? 0,
    bottom: rect.bottom ?? 0,
    toJSON: () => ({}),
  })
}

describe('help screenshot scenarios', () => {
  it('keeps scenario ids and png file names in one-to-one alignment', () => {
    expect(HELP_SCREENSHOT_SCENARIOS).toHaveLength(HELP_SCREENSHOT_SCENARIO_IDS.length)

    const ids = HELP_SCREENSHOT_SCENARIOS.map((scenario) => scenario.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...HELP_SCREENSHOT_SCENARIO_IDS])
  })

  it('uses png file names that match scenario ids', () => {
    for (const scenario of HELP_SCREENSHOT_SCENARIOS) {
      expect(scenario.fileName).toBe(`${scenario.id}.png`)
    }
  })

  it('expands wiki-tag context menu crops to include the sidebar tree', () => {
    const tree = document.createElement('div')
    tree.className = 'sidebar-tree'
    mockRect(tree, { left: 40, top: 120, right: 300, bottom: 520 })

    const row = document.createElement('button')
    mockRect(row, { left: 56, top: 280, right: 280, bottom: 308 })

    const menu = document.createElement('div')
    menu.className = 'sidebar-context-menu'
    mockRect(menu, { left: 180, top: 292, right: 300, bottom: 380 })

    document.body.append(tree, row, menu)

    const region = computeSidebarContextMenuRegion(row, menu)

    expect(region.x).toBe(28)
    expect(region.y).toBe(108)
    expect(region.width).toBe(284)
    expect(region.height).toBe(324)
  })

  it('keeps edit-tags modal crops tight to the opaque dialog', () => {
    const dialog = document.createElement('div')
    dialog.className = 'sidebar-create-dialog'
    dialog.setAttribute('aria-label', 'Edit Tags')
    mockRect(dialog, { left: 420, top: 180, right: 860, bottom: 420 })

    const modal = document.createElement('div')
    modal.className = 'sidebar-create-modal'
    modal.append(dialog)

    const region = computeEditTagsModalRegion(modal)

    expect(region).toEqual({ x: 408, y: 168, width: 464, height: 264 })
  })
})
