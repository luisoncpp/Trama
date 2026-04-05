import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('sidebar scroll regression', () => {
  it('index.css contains layout rules to allow internal sidebar scrolling', () => {
    const cssPath = resolve(__dirname, '..', 'src', 'index.css')
    const css = readFileSync(cssPath, 'utf-8')

    // Ensure the workspace sidebar panel is a column flex container with min-height:0
    expect(css).toMatch(/\.workspace-panel--sidebar\s*\{[^}]*display:\s*flex[^}]*\}/s)
    expect(css).toMatch(/\.workspace-panel--sidebar\s*\{[^}]*min-height:\s*0[^}]*\}/s)

    // Ensure the file-tree uses flex:1 and overflow:auto to enable internal scrolling
    expect(css).toMatch(/\.file-tree\s*\{[^}]*flex:\s*1\s+1\s+auto[^}]*\}/s)
    expect(css).toMatch(/\.file-tree\s*\{[^}]*overflow:\s*auto[^}]*\}/s)
  })
})
