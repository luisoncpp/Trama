import { describe, expect, it } from 'vitest'
import { parseClipboardContent } from '../src/shared/ai-import-parser'

/** @vitest-environment node */

describe('ai-import-parser', () => {
  it('parses a single file with frontmatter', () => {
    const input = `=== FILE: book/Acto-01/Capitulo-01/Escena-001.md ===
---
nombre: El Despertar
tipo: scene
orden: 1
---

# El Despertar

Elena abrió los ojos. La torre brillaba en la distancia.

—Es hora —murmuró.`

    const result = parseClipboardContent(input)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('book/Acto-01/Capitulo-01/Escena-001.md')
    expect(result[0].content).toContain('# El Despertar')
    expect(result[0].content).toContain('Elena abrió los ojos')
  })

  it('parses multiple files', () => {
    const input = `=== FILE: book/Acto-01/Capitulo-01/Escena-001.md ===
---
nombre: El Despertar
tipo: scene
---

# El Despertar

Elena abrió los ojos.

=== FILE: lore/locaciones/torre-cristalina.md ===
---
nombre: Torre Cristalina
tipo: location
---

# Torre Cristalina

Una estructura ancestral.

=== FILE: outline/arco-magia.md ===
# Arco de Magia

El sistema de magia.`

    const result = parseClipboardContent(input)

    expect(result).toHaveLength(3)
    expect(result[0].path).toBe('book/Acto-01/Capitulo-01/Escena-001.md')
    expect(result[1].path).toBe('lore/locaciones/torre-cristalina.md')
    expect(result[2].path).toBe('outline/arco-magia.md')
    expect(result[0].content).toContain('# El Despertar')
    expect(result[1].content).toContain('# Torre Cristalina')
    expect(result[2].content).toContain('# Arco de Magia')
  })

  it('handles Windows line endings (CRLF)', () => {
    const input = '=== FILE: test.md ===\r\n\r\nContent here.\r\n'

    const result = parseClipboardContent(input)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('test.md')
    expect(result[0].content).toBe('Content here.')
  })

  it('returns empty array for empty input', () => {
    expect(parseClipboardContent('')).toHaveLength(0)
    expect(parseClipboardContent('   ')).toHaveLength(0)
  })

  it('skips entries with no content after header', () => {
    const input = `=== FILE: empty.md ===
=== FILE: valid.md ===
Some content`

    const result = parseClipboardContent(input)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('valid.md')
  })
})
