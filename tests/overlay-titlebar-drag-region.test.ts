import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/*
 * Regression test for: Sidebar rail items and revisions-rail back button were
 * partially unclickable on Win32 with the overlay titlebar.
 *
 * The .window-drag-region strip in src/styles/03-app-shell-layout.css paints
 * the top 32px of the viewport as -webkit-app-region: drag. Any control that
 * lives inside that band (sidebar rail buttons at ~y=14, revisions-rail back
 * button at ~y=16) needs -webkit-app-region: no-drag on its painted children
 * or the OS consumes the click as a window-drag gesture.
 *
 * See:
 *   - docs/lessons-learned/sidebar-rail-and-revisions-back-blocked-by-drag-strip.md
 *   - docs/lessons-learned/find-bar-toolbar-click-blocked.md (same pattern)
 */
describe('overlay-titlebar drag region opt-out', () => {
  const cssPath = resolve(__dirname, '..', 'src', 'styles', '03-app-shell-layout.css')
  const css = readFileSync(cssPath, 'utf-8')

  // The drag opt-out rule is structured as: multiple comma-separated
  // `html.has-overlay-titlebar ...` selectors, then a single block containing
  // `-webkit-app-region: no-drag`. This helper extracts the selector list and
  // the block body of every rule that has the `no-drag` declaration.
  function collectNoDragRules(): { selectorList: string; body: string }[] {
    const rules: { selectorList: string; body: string }[] = []
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g
    let match: RegExpExecArray | null
    while ((match = ruleRe.exec(css)) !== null) {
      const selectorList = match[1].trim()
      const body = match[2]
      if (/-webkit-app-region:\s*no-drag/.test(body)) {
        rules.push({ selectorList, body })
      }
    }
    return rules
  }

  it('declares the 32px drag strip with pointer-events: none and -webkit-app-region: drag', () => {
    expect(css).toMatch(/\.window-drag-region\s*\{[^}]*-webkit-app-region:\s*drag[^}]*\}/s)
    expect(css).toMatch(/\.window-drag-region\s*\{[^}]*pointer-events:\s*none[^}]*\}/s)
  })

  it('opts the sidebar rail out of the drag strip via a no-drag rule', () => {
    const rules = collectNoDragRules()
    const matches = rules.filter((rule) => /\.sidebar-rail\s+\*/.test(rule.selectorList))
    expect(matches).toHaveLength(1)
    expect(matches[0].selectorList).toMatch(/^html\.has-overlay-titlebar/)
  })

  it('opts the revisions-rail header out of the drag strip via a no-drag rule', () => {
    const rules = collectNoDragRules()
    const matches = rules.filter((rule) => /\.revisions-rail__header\s+\*/.test(rule.selectorList))
    expect(matches).toHaveLength(1)
    expect(matches[0].selectorList).toMatch(/^html\.has-overlay-titlebar/)
  })

  it('keeps the original drag opt-outs in place (workspace / pane headers and Quill toolbar)', () => {
    const rules = collectNoDragRules()
    const joined = rules.map((rule) => rule.selectorList).join('\n')
    expect(joined).toMatch(/html\.has-overlay-titlebar\s+\.workspace-panel__header\s+\*/)
    expect(joined).toMatch(/html\.has-overlay-titlebar\s+\.workspace-split-pane__header\s+\*/)
    expect(joined).toMatch(/html\.has-overlay-titlebar\s+\.rich-editor\s+\.ql-toolbar\.ql-snow\s+button/)
  })
})
