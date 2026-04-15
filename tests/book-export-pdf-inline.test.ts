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
})
