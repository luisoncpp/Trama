import { describe, expect, it } from 'vitest'
import { createTramaTurndownService, normalizeMarkdownOutput, TurndownServiceFlags } from '../src/shared/turndown-service-factory'

describe('turndown-service-factory', () => {
  describe('createTramaTurndownService', () => {
    it('creates TurndownService with correct base options', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.None)
      expect(td).toBeDefined()
    })

    it('converts image placeholder img tags to placeholder comments when HasImages flag is set', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.HasImages)
      const html = '<img src="trama-image-placeholder:img_0">'
      const result = td.turndown(html)
      expect(result).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
    })

    it('does NOT convert image placeholders when HasImages flag is NOT set', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.None)
      const html = '<img src="trama-image-placeholder:img_0">'
      const result = td.turndown(html)
      expect(result).not.toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
    })

    it('converts multiple image placeholders', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.HasImages)
      const html = '<p><img src="trama-image-placeholder:img_0"></p><p><img src="trama-image-placeholder:img_1"></p>'
      const result = td.turndown(html)
      expect(result).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
      expect(result).toContain('<!-- IMAGE_PLACEHOLDER:img_1 -->')
    })

    it('does not convert non-placeholder img tags', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.HasImages)
      const html = '<img src="https://example.com/image.png">'
      const result = td.turndown(html)
      expect(result).not.toContain('IMAGE_PLACEHOLDER')
    })

    it('does not convert trama-image-placeholder protocol for non-img elements', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.HasImages)
      const html = '<div src="trama-image-placeholder:img_0"></div>'
      const result = td.turndown(html)
      expect(result).not.toContain('IMAGE_PLACEHOLDER')
    })

    it('handles documents without images', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.None)
      const html = '<p>Simple paragraph</p>'
      const result = td.turndown(html)
      expect(result).toContain('Simple paragraph')
    })

    it('converts image placeholders with HasImages flag', () => {
      const service = createTramaTurndownService(TurndownServiceFlags.HasImages)
      const html = '<img src="trama-image-placeholder:img_test">'
      const result = service.turndown(html)
      expect(result).toContain('<!-- IMAGE_PLACEHOLDER:img_test -->')
    })

    it('handles complex HTML with images embedded in various tags', () => {
      const td = createTramaTurndownService(TurndownServiceFlags.HasImages)
      const html = '<div><p><img src="trama-image-placeholder:img_x"></p></div>'
      const result = td.turndown(html)
      expect(result).toContain('<!-- IMAGE_PLACEHOLDER:img_x -->')
    })

  })

  describe('normalizeMarkdownOutput', () => {
    it('converts CRLF to LF', () => {
      const input = 'Line 1\r\nLine 2\r\nLine 3'
      const result = normalizeMarkdownOutput(input)
      expect(result).not.toContain('\r')
    })

    it('trims trailing whitespace from each line', () => {
      const input = 'Line 1   \nLine 2   \n'
      const result = normalizeMarkdownOutput(input)
      expect(result.endsWith('\n')).toBe(false)
    })

    it('applies normalizeBlankLinesToSpacerDirectives', () => {
      const input = 'Paragraph 1\n\n\n\nParagraph 2'
      const result = normalizeMarkdownOutput(input)
      expect(result).toContain('<!-- trama:spacer lines=')
    })

    it('returns input unchanged when already normalized', () => {
      const input = 'Line 1\nLine 2'
      const result = normalizeMarkdownOutput(input)
      expect(result).toBe('Line 1\nLine 2')
    })

    it('handles empty string', () => {
      const result = normalizeMarkdownOutput('')
      expect(result).toBe('')
    })

    it('handles string with only newlines', () => {
      const result = normalizeMarkdownOutput('\n\n\n')
      expect(result).toBe('')
    })

    it('converts CRLF and normalizes blank lines in one pass', () => {
      const input = 'Paragraph 1\r\n\r\n\r\n\r\nParagraph 2'
      const result = normalizeMarkdownOutput(input)
      expect(result).not.toContain('\r')
      expect(result).toContain('<!-- trama:spacer lines=')
    })
  })
})
