/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import {
  getImageDimensions,
  calculateDocxImageSize,
  extractImageReferences,
  extractImageInfo,
  isReferenceDefinitionLine,
} from '../electron/services/book-export-image-utils'

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('book-export-image-utils', () => {
  it('reads png dimensions from base64', () => {
    const bytes = Buffer.from(TINY_PNG_BASE64, 'base64')
    const dims = getImageDimensions(bytes, 'png')
    expect(dims).toEqual({ width: 1, height: 1 })
  })

  it('returns null for invalid png bytes', () => {
    const dims = getImageDimensions(new Uint8Array([0, 1, 2, 3]), 'png')
    expect(dims).toBeNull()
  })

  it('calculates docx size preserving aspect ratio', () => {
    const size = calculateDocxImageSize({ width: 1, height: 1 })
    expect(size.width).toBe(1)
    expect(size.height).toBe(1)
  })

  it('scales large images down to page width', () => {
    const size = calculateDocxImageSize({ width: 2000, height: 1000 })
    expect(size.width).toBeLessThanOrEqual(600)
    expect(size.height).toBeLessThanOrEqual(800)
    expect(size.width / size.height).toBeCloseTo(2, 1)
  })

  it('does not upscale small images', () => {
    const size = calculateDocxImageSize({ width: 50, height: 50 })
    expect(size.width).toBe(50)
    expect(size.height).toBe(50)
  })

  it('extracts image references from markdown content', () => {
    const content = '[image1]: <data:image/png;base64,abc>\n[ref2]: ../assets/photo.jpg\n[REF2]: http://example.com'
    const refs = extractImageReferences(content)
    expect(refs.get('image1')).toBe('data:image/png;base64,abc')
    expect(refs.get('ref2')).toBe('../assets/photo.jpg')
  })

  it('extracts inline image info', () => {
    const refs = new Map<string, string>()
    const info = extractImageInfo('![alt text](path/to/image.png)', refs)
    expect(info).toEqual({ alt: 'alt text', source: 'path/to/image.png' })
  })

  it('extracts reference-style image with explicit reference', () => {
    const refs = new Map([['image1', 'data:image/png;base64,abc']])
    const info = extractImageInfo('![][image1]', refs)
    expect(info).toEqual({ alt: '', source: 'data:image/png;base64,abc' })
  })

  it('extracts reference-style image with implicit reference', () => {
    const refs = new Map([['logo', 'assets/logo.png']])
    const info = extractImageInfo('![logo]', refs)
    expect(info).toEqual({ alt: 'logo', source: 'assets/logo.png' })
  })

  it('returns null for missing reference', () => {
    const refs = new Map<string, string>()
    const info = extractImageInfo('![][missing]', refs)
    expect(info).toBeNull()
  })

  it('detects reference definition lines', () => {
    expect(isReferenceDefinitionLine('[ref]: url')).toBe(true)
    expect(isReferenceDefinitionLine('[ref]: <url>')).toBe(true)
    expect(isReferenceDefinitionLine('Some paragraph')).toBe(false)
    expect(isReferenceDefinitionLine('![image](url)')).toBe(false)
  })
})
