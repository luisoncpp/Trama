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

    const unknown = document.createElement('div')
    unknown.setAttribute('data-trama-directive', 'unknown')
    unknown.setAttribute('data-trama-raw', encodeURIComponent('<!-- trama:custom mode=soft -->'))

    expect(serializeDirectiveArtifactNode(spacer)).toBe('<!-- trama:spacer lines=2 -->')
    expect(serializeDirectiveArtifactNode(unknown)).toBe('<!-- trama:custom mode=soft -->')
  })

  it('converts repeated blank lines into spacer directives', () => {
    const source = ['Linea A', '', '', '', 'Linea B'].join('\n')
    const normalized = normalizeBlankLinesToSpacerDirectives(source)

    expect(normalized).toContain('<!-- trama:spacer lines=2 -->')
  })
})
