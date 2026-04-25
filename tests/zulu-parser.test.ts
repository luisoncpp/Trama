/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { parseZuluContent } from '../src/shared/zulu-parser'

const MINIMAL_ZULU = `<?xml version="1.0" ?>
<!-- ZuluPad Document -->
<ZuluDoc>
    <date>1234567890</date>
    <docname><![CDATA[Test Doc]]></docname>
    <index>
        <name>Index Page</name>
        <content><![CDATA[Welcome content]]></content>
    </index>
    <content>
    </content>
</ZuluDoc>`

const FULL_ZULU = `<?xml version="1.0" ?>
<!-- ZuluPad Document -->
<ZuluDoc>
    <date>1234567890</date>
    <docname><![CDATA[Mi Wiki]]></docname>
    <index>
        <name>Index Page</name>
        <content><![CDATA[Bienvenido a mi wiki]]></content>
    </index>
    <content>
        <page>
            <name><![CDATA[Sistema de Magia]]></name>
            <content><![CDATA[Los golems usan piedra endinstantada.

Cada tipo de golem tiene afinidad elemental.
Potencias de 1 a 10 escalan de forma logartmica.]]></content>
        </page>
        <page>
            <name><![CDATA[Historia Local]]></name>
            <content><![CDATA[Section heading

Era una vez en un pueblo peque\u00f1o.

Otra secci\u00f3n con \u00f1 y acentos.]]></content>
        </page>
        <page>
            <name><![CDATA[Pgina Con Caracteres Especiales]]></name>
            <content><![CDATA[Contiene <tag> y &amp; en el contenido]]></content>
        </page>
        <page>
            <name><![CDATA[Pgina Sin CDATA]]></name>
            <content>Contenido sin envoltura CDATA</content>
        </page>
        <page>
            <name><![CDATA[Pgina Vaca]]></name>
            <content><![CDATA[]]></content>
        </page>
    </content>
</ZuluDoc>`

const ZULU_NO_CDATA = `<?xml version="1.0" ?>
<ZuluDoc>
    <date>1234567890</date>
    <index>
        <name>Index Page</name>
        <content>Index content plain</content>
    </index>
    <content>
        <page>
            <name>Simple Title</name>
            <content>Simple content</content>
        </page>
    </content>
</ZuluDoc>`

describe('zulu parser', () => {
  it('parses minimal zulu with empty content section', () => {
    const pages = parseZuluContent(MINIMAL_ZULU)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toEqual({ title: 'Index Page', content: 'Welcome content' })
  })

  it('parses index page correctly', () => {
    const pages = parseZuluContent(FULL_ZULU)
    expect(pages[0]).toEqual({ title: 'Index Page', content: 'Bienvenido a mi wiki' })
  })

  it('parses regular pages correctly', () => {
    const pages = parseZuluContent(FULL_ZULU)
    expect(pages[1]).toEqual({
      title: 'Sistema de Magia',
      content: 'Los golems usan piedra endinstantada.\n\nCada tipo de golem tiene afinidad elemental.\nPotencias de 1 a 10 escalan de forma logartmica.',
    })
  })

  it('handles CDATA wrapper removal and trimming', () => {
    const pages = parseZuluContent(FULL_ZULU)
    expect(pages[1].content).not.toContain('<![CDATA[')
    expect(pages[1].content.trim()).toBe(pages[1].content)
  })

  it('handles content with XML special characters in CDATA', () => {
    const pages = parseZuluContent(FULL_ZULU)
    const specialPage = pages.find((p) => p.title === 'Pgina Con Caracteres Especiales')
    expect(specialPage?.content).toContain('<tag>')
    expect(specialPage?.content).toContain('&amp;')
  })

  it('handles pages without CDATA wrapper', () => {
    const pages = parseZuluContent(FULL_ZULU)
    const plainPage = pages.find((p) => p.title === 'Pgina Sin CDATA')
    expect(plainPage?.content).toBe('Contenido sin envoltura CDATA')
  })

  it('handles plain content without CDATA (minimal format)', () => {
    const pages = parseZuluContent(ZULU_NO_CDATA)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toEqual({ title: 'Index Page', content: 'Index content plain' })
    expect(pages[1]).toEqual({ title: 'Simple Title', content: 'Simple content' })
  })

  it('skips pages with empty title', () => {
    const emptyTitleZulu = `<?xml version="1.0" ?>
<ZuluDoc>
    <content>
        <page>
            <name><![CDATA[   ]]></name>
            <content><![CDATA[Body]]></content>
        </page>
    </content>
</ZuluDoc>`
    const pages = parseZuluContent(emptyTitleZulu)
    expect(pages).toHaveLength(0)
  })

  it('skips index page with empty title', () => {
    const noIndexName = `<?xml version="1.0" ?>
<ZuluDoc>
    <index>
        <content><![CDATA[Some content]]></content>
    </index>
</ZuluDoc>`
    const pages = parseZuluContent(noIndexName)
    expect(pages).toHaveLength(0)
  })

  it('handles multiple pages in order', () => {
    const pages = parseZuluContent(FULL_ZULU)
    expect(pages).toHaveLength(6)
    expect(pages.map((p) => p.title)).toEqual([
      'Index Page',
      'Sistema de Magia',
      'Historia Local',
      'Pgina Con Caracteres Especiales',
      'Pgina Sin CDATA',
      'Pgina Vaca',
    ])
  })

  it('handles empty content on pages', () => {
    const pages = parseZuluContent(FULL_ZULU)
    const emptyContentPage = pages.find((p) => p.title === 'Sistema de Magia')
    expect(emptyContentPage?.content.length).toBeGreaterThan(0)
  })

  it('normalizes whitespace in titles', () => {
    const whitespaceTitle = `<?xml version="1.0" ?>
<ZuluDoc>
    <index>
        <name><![CDATA[  Index Page  ]]></name>
        <content><![CDATA[Content]]></content>
    </index>
</ZuluDoc>`
    const pages = parseZuluContent(whitespaceTitle)
    expect(pages[0].title).toBe('Index Page')
  })
})