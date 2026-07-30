import { describe, expect, it } from 'vitest'
import {
  extractDirectives,
  renderDirectiveArtifactsToMarkdown,
  serializeDirectiveArtifactNode,
} from '../src/shared/markdown-layout-directives'
import { normalizeBlankLinesToSpacerDirectives } from '../src/shared/markdown-layout-directives-spacing'

describe('markdown-layout-directives', () => {
  it('extracts valid directives and removes them from markdown body', () => {
    const source = [
      '# Title',
      '<!-- trama:center:start -->',
      'Centered text',
      '<!-- trama:center:end -->',
      '<!-- trama:spacer lines=2 -->',
      '<!-- trama:pagebreak -->',
    ].join('\n')

    const result = extractDirectives(source)

    expect(result.markdownWithoutDirectives).toContain('# Title')
    expect(result.markdownWithoutDirectives).toContain('Centered text')
    expect(result.markdownWithoutDirectives).not.toContain('trama:center')
    expect(result.directives.map((item) => item.type)).toEqual([
      'center-start',
      'center-end',
      'spacer',
      'pagebreak',
    ])
    expect(result.warnings).toEqual([])
  })

  it('falls back spacer lines to 1 and emits warning for invalid values', () => {
    const source = '<!-- trama:spacer lines=999 -->\nBody'
    const result = extractDirectives(source)

    expect(result.directives[0]?.type).toBe('spacer')
    expect(result.directives[0]?.lines).toBe(1)
    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0]?.line).toBe(1)
  })

  it('keeps unclosed center markers as plain markdown comments', () => {
    const source = [
      '# Heading',
      '<!-- trama:center:start -->',
      'Body',
    ].join('\n')

    const result = extractDirectives(source)

    expect(result.markdownWithoutDirectives).toContain('<!-- trama:center:start -->')
    expect(result.directives).toEqual([])
    expect(result.warnings.length).toBe(1)
  })

  it('converts directives into editor artifact markup', () => {
    const source = [
      '<!-- trama:center:start -->',
      'Body',
      '<!-- trama:center:end -->',
      '<!-- trama:spacer lines=2 -->',
      '<!-- trama:pagebreak -->',
      '<!-- trama:custom mode=soft -->',
    ].join('\n')

    const result = renderDirectiveArtifactsToMarkdown(source)

    expect(result.markdownWithArtifacts).toContain('data-trama-directive="center"')
    expect(result.markdownWithArtifacts).toContain('data-trama-directive="spacer"')
    expect(result.markdownWithArtifacts).toContain('data-trama-directive="pagebreak"')
    expect(result.markdownWithArtifacts).toContain('data-trama-directive="unknown"')
  })

  it('serializes artifact node attributes back to canonical comments', () => {
    const spacer = document.createElement('div')
    spacer.setAttribute('data-trama-directive', 'spacer')
    spacer.setAttribute('data-trama-lines', '2')
    spacer.setAttribute('data-trama-label', 'Scene transition')

    const pagebreak = document.createElement('div')
    pagebreak.setAttribute('data-trama-directive', 'pagebreak')
    pagebreak.setAttribute('data-trama-label', 'Part II')

    const unknown = document.createElement('div')
    unknown.setAttribute('data-trama-directive', 'unknown')
    unknown.setAttribute('data-trama-raw', encodeURIComponent('<!-- trama:custom mode=soft -->'))

    expect(serializeDirectiveArtifactNode(spacer)).toBe('<!-- trama:spacer lines=2 label="Scene transition" -->')
    expect(serializeDirectiveArtifactNode(pagebreak)).toBe('<!-- trama:pagebreak label="Part II" -->')
    expect(serializeDirectiveArtifactNode(unknown)).toBe('<!-- trama:custom mode=soft -->')
  })

  it('converts repeated blank lines into spacer directives', () => {
    const source = ['Linea A', '', '', '', 'Linea B'].join('\n')
    const normalized = normalizeBlankLinesToSpacerDirectives(source)

    expect(normalized).toContain('<!-- trama:spacer lines=2 -->')
  })

  it('preserves labels on canonical spacer and page-break directives', () => {
    const source = [
      '<!-- trama:spacer lines=2 label="Scene transition" -->',
      '<!-- trama:pagebreak label="Part II" -->',
    ].join('\n')

    const extracted = extractDirectives(source)
    const rendered = renderDirectiveArtifactsToMarkdown(source)

    expect(extracted.directives).toEqual([
      { type: 'spacer', line: 1, lines: 2, label: 'Scene transition' },
      { type: 'pagebreak', line: 2, label: 'Part II' },
    ])
    expect(rendered.markdownWithArtifacts).toContain('data-trama-label="Scene transition"')
    expect(rendered.markdownWithArtifacts).toContain('data-trama-label="Part II"')
  })

  it('preserves special label characters across HTML artifacts and source serialization', () => {
    const label = 'A & "B" <C>'
    const rendered = renderDirectiveArtifactsToMarkdown(`<!-- trama:pagebreak label=${JSON.stringify(label)} -->`)
    const pagebreak = document.createElement('div')
    pagebreak.setAttribute('data-trama-directive', 'pagebreak')
    pagebreak.setAttribute('data-trama-label', label)

    expect(rendered.markdownWithArtifacts).toContain('data-trama-label="A &amp; &quot;B&quot; &lt;C&gt;"')
    expect(serializeDirectiveArtifactNode(pagebreak)).toBe('<!-- trama:pagebreak label="A & \\"B\\" \\u003cC\\u003e" -->')
  })
})
