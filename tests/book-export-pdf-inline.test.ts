import { describe, expect, it } from 'vitest'
import { inlineTokens } from '../electron/services/book-export-pdf-inline'

describe('book export pdf inline tokens', () => {
  it('marks markdown strong tokens as bold', () => {
    const tokens = inlineTokens('Inicio **texto en negrita** final')
    const boldTokens = tokens.filter((token) => token.bold).map((token) => token.text)

    expect(boldTokens).toEqual(['texto', 'en', 'negrita'])
  })

  it('marks html strong and b tags as bold', () => {
    const tokens = inlineTokens('Inicio <strong>muy fuerte</strong> y <b>tambien</b>')
    const boldTokens = tokens.filter((token) => token.bold).map((token) => token.text)

    expect(boldTokens).toEqual(['muy', 'fuerte', 'tambien'])
  })

  it('marks underscore emphasis as italic', () => {
    const tokens = inlineTokens('called _The Weight of Three_?')
    const italicTokens = tokens.filter((token) => token.italic).map((token) => token.text)

    expect(italicTokens).toEqual(['The', 'Weight', 'of', 'Three'])
    expect(tokens.map((token) => token.text).join(' ')).toContain('Three')
    expect(tokens.some((token) => token.text.includes('?'))).toBe(true)
    expect(tokens.some((token) => token.text.includes('_'))).toBe(false)
  })

  it('marks asterisk emphasis in headings as italic', () => {
    const tokens = inlineTokens('*Bold Title*')
    const italicTokens = tokens.filter((token) => token.italic).map((token) => token.text)

    expect(italicTokens).toEqual(['Bold', 'Title'])
    expect(tokens.some((token) => token.text.includes('*'))).toBe(false)
  })
})
